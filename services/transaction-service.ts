import { isApiSuccess } from "@/utils/api-utils"
import type { Transaction, TransactionType, Contact, QRData, RequestMoneyPayload } from "@/types"
import type { TransactionContact, TransactionDirection } from "@/platform/validators/schemas-zod"
import { info, warn, error as logError } from "@/utils/logger"
import { privateHttpClient } from "@/services/httpClients/private"
import { handleError, respondOk } from "@/utils/api-utils"
import type { ApiResponse, Paginated, TransactionFilters, PaginationRequest, CashOutResponse } from "@/types"
import { ErrorCode } from "@/types/errors"
import { contactResolver, ContactHelpers } from "@/platform/local-db/local-db-common"

// import { memoryCache } from "@/utils/cache"

// Transaction status
export enum TransactionStatus {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

// Transaction result
export interface TransactionResult {
  success: boolean
  error?: string
  transaction?: Transaction
  reference?: string
}

// Transaction details for display
export interface TransactionDetails {
  amount: string
  recipient?: string
  method?: string
  fee?: string
  date: string
  reference: string
  note?: string
}

// Cash out method
export interface CashOutMethod {
  id: string
  name: string
  fee: string
  feePercentage: number
}

// Available cash out methods
export const CASH_OUT_METHODS: CashOutMethod[] = [
  { id: "agent", name: "Local Agent", fee: "1%", feePercentage: 1.0 },
  { id: "bank", name: "Bank Transfer", fee: "0.5%", feePercentage: 0.5 },
]

/**
 * Transaction Service
 *
 * Provides centralized transaction handling logic for the application
 */
class TransactionService {
  /**
   * Validate transaction amount
   */
  validateAmount(amount: number, balance: number): { isValid: boolean; error?: string } {
    if (isNaN(amount) || amount <= 0) {
      return { isValid: false, error: ErrorCode.INVALID_AMOUNT }
    }

    if (amount > balance) {
      return { isValid: false, error: ErrorCode.INSUFFICIENT_FUNDS }
    }

    return { isValid: true }
  }

  /**
   * Calculate transaction fee
   */
  calculateFee(amount: number, feePercentage: number): string {
    return ((amount * feePercentage) / 100).toFixed(2)
  }

  /**
   * Calculate transaction total (amount + fee for cash-out)
   */
  calculateTotal(amount: number, feePercentage: number): string {
    const fee = (amount * feePercentage) / 100
    return (amount + fee).toFixed(2)
  }

  /**
   * Format transaction date
   */
  formatDate(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

    /**
 * Generate payment QR code
 * TODO: Update
 */
  generatePaymentQR(userId: string, amount?: number): { qrData: QRData; qrString: string } {
    const qrData: QRData = {
      userId,
      timestamp: Date.now(),
    }

    if (amount) {
      qrData.amount = amount
    }

    // Convert to string for QR code
    const qrString = JSON.stringify(qrData)

    return { qrData, qrString }
  }
  /**
   * Send money to a recipient with simplified fee handling
   * 
   * For stablecoin transfers: Uses Portals virtual accounts for automatic fee handling
   * For traditional transfers: Uses API-based transfer
   * 
   * Note: Portals virtual accounts eliminate the need for backend fee subsidization
   */
  async sendMoney(
    recipient: Contact,
    amount: number,
    balance: number,
    note?: string,
  ): Promise<TransactionResult> {
    // Validate amount (no need to account for fees as Portals handles them)
    const validation = this.validateAmount(amount, balance)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    try {
      info(`[TransactionService] Sending ${amount} to ${recipient.name}`)
      
      // For stablecoin transfers with wallet integration, use Portals virtual accounts
      if (recipient.walletAddress) {
        info(`[TransactionService] Using Portals virtual accounts for stablecoin transfer`)
        return await this.sendStablecoinWithPortalsVirtualAccounts(
          recipient.walletAddress,
          'USDC', // Default to USDC, can be made configurable
          amount,
          note
        );
      }
      
      // For traditional API-based transfers
      info(`[TransactionService] Using API-based transfer`)
      const response = await privateHttpClient.sendMoney({ 
        contactId: recipient.id, 
        amount, 
        note 
      });
      
      if (!isApiSuccess(response)) {
        return {
          success: false,
          error: response.error || ErrorCode.TRANSACTION_FAILED,
        }
      }

      return {
        success: true,
        transaction: response.data as Transaction,
      };
    } catch (error) {
      logError("Send money error:", error)
      return {
        success: false,
        error: ErrorCode.TRANSACTION_FAILED,
      }
    }
  }

  /**
   * Send stablecoin with Portals virtual accounts fee handling
   * This method handles the complete flow: prepare -> user sign (web3auth) -> Portals fee handling -> submit
   * 
   * Note: Portals virtual accounts handle fee payments on behalf of users, 
   * simplifying the flow by removing backend fee subsidization
   */
  async sendStablecoinWithPortalsVirtualAccounts(
    recipientAddress: string,
    tokenMint: string,
    amount: number,
    note?: string,
  ): Promise<TransactionResult> {
    try {
      // Import custom Web3Auth service
      // TODO: Replace with Portals signing service when ready
      const { customWeb3AuthService } = await import('./custom-web3auth-service');
      
      // Prepare transaction for user signing
      // Note: No need to handle fees here as Portals virtual accounts will cover them
      const preparedTx = await customWeb3AuthService.prepareStablecoinTransfer({
        toAddress: recipientAddress,
        tokenMint,
        amount,
        memo: note,
        // Skip fee calculations as Portals handles this
        skipFeeCalculation: true,
      });

      // Validate transaction before showing to user
      if (!preparedTx.isValid) {
        return {
          success: false,
          error: `Transaction validation failed: ${preparedTx.validationErrors.join(', ')}`,
        };
      }

      // User signs the transaction with web3auth
      // TODO: Replace with Portals virtual accounts signing when ready
      const userSignedTransaction = await customWeb3AuthService.signTransaction(preparedTx.transaction);

      // Submit transaction with Portals virtual accounts fee handling
      // Portals virtual accounts automatically handle fee payments
      const submitResponse = await privateHttpClient.submitStablecoinTransaction(
        userSignedTransaction.serialize({ 
          requireAllSignatures: false 
        }).toString('base64')
      );

      if (!submitResponse.data?.signature) {
        return {
          success: false,
          error: 'Failed to submit transaction with Portals',
        };
      }

      // Transaction is automatically recorded by Portals/backend
      // No need for separate recording step
      return {
        success: true,
        reference: submitResponse.data.signature,
        // Transaction data will be available through normal transaction listing
      };
    } catch (error) {
      logError("Send stablecoin with Portals virtual accounts error:", error);
      return {
        success: false,
        error: ErrorCode.TRANSACTION_FAILED,
      };
    }
  }

  /**
   * @deprecated Use sendStablecoinWithPortalsVirtualAccounts instead
   * Legacy method for partial signing flow - kept for backward compatibility
   */
  async sendStablecoinWithPartialSigning(
    recipientAddress: string,
    tokenMint: string,
    amount: number,
    note?: string,
  ): Promise<TransactionResult> {
    // Redirect to new Portals-based method
    return this.sendStablecoinWithPortalsVirtualAccounts(recipientAddress, tokenMint, amount, note);
  }


  /**
   * Group transactions by date - optimized for performance
   */
  groupTransactionsByDate(
    transactions: Transaction[],
    formatDateFn: (date: string) => string,
  ): {
    date: string
    formattedDate: string
    transactions: Transaction[]
  }[] {
    // Use Map for better performance than Record object
    const groupsMap = new Map<string, {
      date: string
      formattedDate: string
      transactions: Transaction[]
    }>();
    
    // Cache formatted dates to avoid redundant formatting
    const formattedDateCache = new Map<string, string>();

    transactions.forEach((tx) => {
      const dateInput = tx.createdAt;
      
      // Check cache first to avoid redundant date formatting
      let formattedDate = formattedDateCache.get(dateInput);
      if (!formattedDate) {
        formattedDate = formatDateFn(dateInput);
        formattedDateCache.set(dateInput, formattedDate);
      }

      if (!groupsMap.has(formattedDate)) {
        groupsMap.set(formattedDate, {
          date: dateInput,
          formattedDate,
          transactions: [],
        });
      }

      // Clone transaction with formatted date for display
      groupsMap.get(formattedDate)!.transactions.push({
        ...tx,
        createdAt: formattedDate,
      });
    });

    // Convert to array and sort by date (newest first)
    // Parse dates once and cache for sorting performance
    const groupsArray = Array.from(groupsMap.values());
    return groupsArray.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // newest first
    });
  }

  /**
   * Determine transaction direction relative to the current user
   */
  private getDirection(transaction: Transaction, currentUserId?: string): TransactionDirection {
    switch (transaction.type) {
      case "deposit":
        return "incoming";
      case "withdraw":
        return "outgoing";
      case "transfer": {
        if (!currentUserId) return "incoming"; // default when unknown
        if (transaction.senderId === currentUserId) return "outgoing";
        if (transaction.recipientId === currentUserId) return "incoming";
        return "incoming";
      }
    }
    return "incoming"; // Safe default
  }

  /**
   * Create a TransactionContact object from phone hash
   * Backend only sends phoneHash, frontend resolves name and phone on display
   */
  private createTransactionContact(phoneHash?: string): TransactionContact {
    if (!phoneHash) {
      return { 
        isUnknown: true 
      };
    }

    // Backend only provides phoneHash
    // Name and phone will be resolved by ContactDisplay component when needed
    return {
      phoneHash,
      isUnknown: false
    };
  }

  /**
   * Augment transaction with enhanced contact objects and direction
   * Creates sender/recipient objects with phoneHash (name/phone resolved on display)
   */
  async augmentTransaction(transaction: Transaction, currentUserId?: string): Promise<Transaction> {
    // Calculate direction
    const direction = this.getDirection(transaction, currentUserId);
    
    // Create enhanced contact objects (only phoneHash from backend)
    const sender = this.createTransactionContact(transaction.senderPhoneHash);
    const recipient = this.createTransactionContact(transaction.recipientPhoneHash);
    
    return {
      ...transaction,
      direction,
      sender,
      recipient,
      // Keep legacy fields for backward compatibility
      recipientName: contactResolver.resolveDisplayName(transaction.recipientPhoneHash, ""),
      senderName: contactResolver.resolveDisplayName(transaction.senderPhoneHash, "")
    };
  }

  /**
   * List transactions with optional filters and pagination
   * Now uses ContactResolver - no need to pass contacts parameter!
   */
  async listTransactions(
    filters?: TransactionFilters,
    pagination?: PaginationRequest,
    currentUserId?: string
  ): Promise<ApiResponse<Paginated<Transaction>>> {
    try {
      // For now, call apiService.getTransactions with pagination only
      // Filters will need to be implemented in the API
      const { data: listData, error: listError } = await privateHttpClient.listTransactions({ ...filters, ...pagination } as any);
      if (listError || !listData) {
        return handleError("Failed to list transactions", ErrorCode.TRANSACTION_LIST_FAILED);
      }
      const transactions = await Promise.all(listData.items.map(tx => this.augmentTransaction(tx, currentUserId)));
      
      if (transactions && transactions.length > 0) {
        // Apply client-side filters if needed
        let filteredItems = transactions || [];
        
        if (filters) {
          if (filters.type) {
            filteredItems = filteredItems.filter((tx: Transaction) => tx.type === filters.type);
          }
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredItems = filteredItems.filter((tx: Transaction) => {
              // Search in transaction reference and note
              if (tx.reference?.toLowerCase().includes(searchLower)) return true;
              if (tx.note?.toLowerCase().includes(searchLower)) return true;
              
              // Search in already-resolved contact names (populated by augmentTransaction)
              if (tx.senderName?.toLowerCase().includes(searchLower)) return true;
              if (tx.recipientName?.toLowerCase().includes(searchLower)) return true;
              
              return false;
            });
          }
          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            filteredItems = filteredItems.filter((tx: Transaction) => new Date(tx.createdAt) >= startDate);
          }
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            filteredItems = filteredItems.filter((tx: Transaction) => new Date(tx.createdAt) <= endDate);
          }
        }
        
        const result: Paginated<Transaction> = {
          items: filteredItems,
          nextCursor: null
        };
        
        return respondOk(result);
      }
      
      return respondOk({ items: [], nextCursor: null });
    } catch (error) {
      logError("List transactions error:", error)
      return handleError("Failed to list transactions", ErrorCode.TRANSACTION_LIST_FAILED)
    }
  }

  /**
   * Get a single transaction by ID
   * Now uses named API endpoint and augments data to match listTransactions() structure
   */
  async getTransactionById(id: string, currentUserId?: string): Promise<ApiResponse<Transaction | undefined>> {
    if (!id) return handleError("Transaction ID is required", ErrorCode.VALIDATION_ERROR)
    
    try {
      // Use the named API endpoint instead of direct HTTP call
      const response = await privateHttpClient.getTransaction(id);
      
      if (response.errorCode === ErrorCode.TRANSACTION_NOT_FOUND) {
        return respondOk(undefined);
      }
      
      if (response.error || !response.data) {
        throw new Error(response.errorCode || response.error || ErrorCode.TRANSACTION_NOT_FOUND);
      }
      
      // Augment the transaction data to match the structure from listTransactions()
      // This ensures consistency between single transaction fetch and list fetch
      const transaction = await this.augmentTransaction(response.data, currentUserId);

      
      return respondOk(transaction);
    } catch (error) {
      // TODO: Add as many info as possible for tracability
      logError("Get transaction by ID error:", error)
      return handleError("Failed to get transaction", ErrorCode.TRANSACTION_NOT_FOUND)
    }
  }

  /**
   * Request money from a contact
   */
  async requestMoney(payload: RequestMoneyPayload): Promise<ApiResponse<void>> {
    if (!payload.amount || payload.amount <= 0) return handleError("Valid amount is required", ErrorCode.VALIDATION_ERROR)
    try {
      const response = await privateHttpClient.requestMoney(payload);
      return response
    } catch (error) {
      logError("Request money error:", error)
      return handleError("Failed to request money", ErrorCode.UNKNOWN)
    }
  }

  /**
   * Initiate a cash-out request
   */
  async initiateCashout(payload: { fromAccount: string; toAccount: string; amount: number; currency: string }): Promise<ApiResponse<CashOutResponse>> {
    // TBD
    return handleError("Cash-out not implemented", ErrorCode.NOT_IMPLEMENTED)
  }

  /**
   * Cancel an existing cash-out by transaction ID
   */
  async cancelCashout(txId: string): Promise<ApiResponse<void>> {
    // TBD
    return handleError("Cash-out not implemented", ErrorCode.NOT_IMPLEMENTED)
  }

  /**
   * List cash-out records with optional filters and pagination
   */
  async listCashouts(filters?: Record<string, any>, pagination?: PaginationRequest): Promise<ApiResponse<Paginated<CashOutResponse>>> {
    // TBD
    return handleError("Cash-out not implemented", ErrorCode.NOT_IMPLEMENTED)
  }
}

// Export a singleton instance
export const transactionService = new TransactionService()
