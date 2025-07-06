import { isApiSuccess } from "@/utils/api-utils"
import type { Transaction, TransactionType, Contact, QRData, RequestMoneyPayload } from "@/types"
import { info, warn, error as logError } from "@/utils/logger"
import { privateHttpClient } from "@/services/httpClients/private"
import { handleError, respondOk } from "@/utils/api-utils"
import type { ApiResponse, Paginated, TransactionFilters, PaginationRequest, CashOutResponse } from "@/types"
import { ErrorCode } from "@/types/errors"
import { contactResolver } from "@/platform/local-db/local-db-common"

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
   * Send money to a recipient
   * TODO: Use web3auth service here
   */
  async sendMoney(
    recipient: Contact,
    amount: number,
    balance: number,
    note?: string,
  ): Promise<TransactionResult> {
    // Validate amount
    const validation = this.validateAmount(amount, balance)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    try {
      info(`[TransactionService] Sending ${amount} to ${recipient.name}`)
      
      // Create transaction via API
      const response = await privateHttpClient.sendMoney({ contactId: recipient.id, amount, note });
      
      if (!isApiSuccess(response)) {
        return {
          success: false,
          error: response.error || ErrorCode.TRANSACTION_FAILED,
        }
      }

      if (response.data) {
        const transaction = response.data as Transaction;
        
        return {
          success: true,
          transaction,
        }
      }

      return { success: true }
    } catch (error) {
      logError("Send money error:", error)
      return {
        success: false,
        error: ErrorCode.TRANSACTION_FAILED,
      }
    }
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

  async augmentTransaction(transaction: Transaction): Promise<Transaction> {
    return {
      ...transaction,
      recipientName: contactResolver.resolveDisplayName(transaction.recipientPhoneHash, ""),
      senderName: contactResolver.resolveDisplayName(transaction.senderPhoneHash, "")
    }
  }

  /**
   * List transactions with optional filters and pagination
   * Now uses ContactResolver - no need to pass contacts parameter!
   */
  async listTransactions(
    filters?: TransactionFilters,
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<Paginated<Transaction>>> {
    try {
      // For now, call apiService.getTransactions with pagination only
      // Filters will need to be implemented in the API
      const { data: listData, error: listError } = await privateHttpClient.listTransactions({ ...filters, ...pagination } as any);
      if (listError || !listData) {
        return handleError("Failed to list transactions", ErrorCode.TRANSACTION_LIST_FAILED);
      }
      const transactions = await Promise.all(listData.items.map(tx => this.augmentTransaction(tx)));
      
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
  async getTransactionById(id: string): Promise<ApiResponse<Transaction | undefined>> {
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
      const transaction = await this.augmentTransaction(response.data);

      
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
