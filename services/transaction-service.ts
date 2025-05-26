import { apiService } from "@/services/api-service"
import { isApiSuccess } from "@/utils/api-utils"
import type { Transaction, TransactionType, Contact, QRData } from "@/types"
import { info, warn, error as logError } from "@/utils/logger"
import { httpClient } from "@/services/http-client"
import { handleError, respondOk } from "@/utils/api-utils"
import type { ApiResponse, Paginated, TransactionFilters, PaginationRequest, CashOutResponse } from "@/types"
import { ErrorCode } from "@/types/errors"
import { getStorageManager } from "@/services/storage-manager"
import { memoryCache } from "@/utils/cache"

// Transaction validation errors
export enum TransactionError {
  INVALID_AMOUNT = "Please enter a valid amount.",
  INSUFFICIENT_FUNDS = "Insufficient funds. Please enter a smaller amount.",
  TRANSACTION_FAILED = "Transaction failed. Please try again later.",
  INVALID_RECIPIENT = "Invalid recipient. Please select a valid contact.",
  INVALID_METHOD = "Invalid method. Please select a valid cash out method.",
}

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
  { id: "atm", name: "ATM Withdrawal", fee: "1.5%", feePercentage: 1.5 },
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
      return { isValid: false, error: TransactionError.INVALID_AMOUNT }
    }

    if (amount > balance) {
      return { isValid: false, error: TransactionError.INSUFFICIENT_FUNDS }
    }

    return { isValid: true }
  }

  /**
   * Format transaction amount
   */
  formatAmount(amount: string | number): string {
    const numericAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount
    return numericAmount.toFixed(2)
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
   * Generate transaction reference
   * TODO: remove
   */
  generateReference(prefix = "TXN"): string {
    return `${prefix}${Date.now()}`
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
      const response = await apiService.sendMoney(recipient.id, amount, note)
      
      if (!isApiSuccess(response)) {
        return {
          success: false,
          error: response.error || TransactionError.TRANSACTION_FAILED,
        }
      }

      if (response.data) {
        const storage = getStorageManager();
        
        // Store transaction locally for quick access
        const transaction = response.data as Transaction;
        await storage.local.set('recentTransactions', {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.assetSymbol || 'USD',
          status: transaction.status,
          createdAt: transaction.date || new Date().toISOString(),
          recipientId: transaction.recipientId,
          senderId: transaction.senderId,
          note: transaction.note,
          syncedAt: Date.now()
        });
        
        info(`[TransactionService] Transaction ${transaction.id} stored locally`)
        
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
        error: TransactionError.TRANSACTION_FAILED,
      }
    }
  }

  /**
   * Cash out money
   * TODO: Deprecate
   */
  async cashOut(amount: number, method: string, balance: number): Promise<TransactionResult> {
    // Validate amount
    const validation = this.validateAmount(amount, balance)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    // Validate method
    const cashOutMethod = CASH_OUT_METHODS.find((m) => m.id === method)
    if (!cashOutMethod) {
      return { success: false, error: TransactionError.INVALID_METHOD }
    }

    try {
      // Call API service
      const response = await apiService.cashOut(amount, method)

      if (isApiSuccess(response) && response.data) {
        return {
          success: true,
          reference: response.data.reference,
        }
      }
      return {
        success: false,
        error: response.error || TransactionError.TRANSACTION_FAILED,
      }
    } catch (error) {
      return {
        success: false,
        error: TransactionError.TRANSACTION_FAILED,
      }
    }
  }

  /**
   * Request money
   * TODO: Deprecate
   */
  requestMoney(userId: string, amount: number): { qrData: QRData; qrString: string } {
    if (isNaN(amount) || amount <= 0) {
      throw new Error(TransactionError.INVALID_AMOUNT)
    }

    const qrData: QRData = {
      userId,
      amount,
      reference: this.generateReference("REQ"),
      timestamp: Date.now(),
    }

    // Convert to string for QR code
    const qrString = JSON.stringify(qrData)

    return { qrData, qrString }
  }

  /**
   * Generate payment QR code
   * TODO: Update
   */
  generatePaymentQR(userId: string): { qrData: QRData; qrString: string } {
    const qrData: QRData = {
      userId,
      timestamp: Date.now(),
    }

    // Convert to string for QR code
    const qrString = JSON.stringify(qrData)

    return { qrData, qrString }
  }

  /**
   * Get transaction by ID
   * TODO: Deprecate in favor for getTransactionById
   */
  async getTransaction(id: string): Promise<Transaction | undefined> {
    try {
      const storage = getStorageManager();
      
      // Try local storage first
      const localTx = await storage.local.get('recentTransactions', id);
      if (localTx) {
        info(`[TransactionService] Found transaction ${id} in local storage`);
        return {
          id: localTx.id,
          name: 'Transaction',
          amount: localTx.amount,
          date: new Date(localTx.createdAt).toISOString(),
          type: localTx.type as TransactionType,
          status: localTx.status as any,
          recipientId: localTx.recipientId,
          senderId: localTx.senderId,
          assetSymbol: localTx.currency,
          note: localTx.note
        };
      }
      
      // Fallback to API
      const transactions = await apiService.getTransactions()
      if (isApiSuccess(transactions) && transactions.data?.items) {
        const found = transactions.data.items.find((t) => t.id === id);
        
        if (found) {
          // Cache it locally for future access
          await storage.local.set('recentTransactions', {
            id: found.id,
            type: found.type,
            amount: found.amount,
            currency: found.assetSymbol || 'USD',
            status: found.status,
            createdAt: found.date || new Date().toISOString(),
            recipientId: found.recipientId,
            senderId: found.senderId,
            note: found.note,
            syncedAt: Date.now()
          });
        }
        
        return found;
      }
      return undefined
    } catch (error) {
      logError("Get transaction error:", error)
      return undefined
    }
  }

  /**
   * Get transaction history with optional filters
   * TODO: Deprecate in favor for listTransactions
   */
  async getTransactionHistory(filters?: {
    type?: TransactionType
    search?: string
    startDate?: string
    endDate?: string
  }): Promise<Transaction[]> {
    try {
      // Call listTransactions which handles filters properly
      const response = await this.listTransactions(filters);
      if (isApiSuccess(response) && response.data) {
        return response.data.items;
      }
      return []
    } catch (error) {
      logError("Get transaction history error:", error)
      return []
    }
  }

  /**
   * Group transactions by date
   */
  groupTransactionsByDate(
    transactions: Transaction[],
    formatDateFn: (date: string) => string,
  ): {
    date: string
    formattedDate: string
    transactions: Transaction[]
  }[] {
    const groups: Record<
      string,
      {
        date: string
        formattedDate: string
        transactions: Transaction[]
      }
    > = {}

    transactions.forEach((tx) => {
      const formattedDate = formatDateFn(tx.date)

      if (!groups[formattedDate]) {
        groups[formattedDate] = {
          date: tx.date,
          formattedDate,
          transactions: [],
        }
      }

      groups[formattedDate].transactions.push({
        ...tx,
        date: formattedDate,
      })
    })

    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * List transactions with optional filters and pagination
   */
  async listTransactions(
    filters?: TransactionFilters,
    pagination?: PaginationRequest,
  ): Promise<ApiResponse<Paginated<Transaction>>> {
    try {
      const storage = getStorageManager();
      const cacheKey = `transactions_${JSON.stringify(filters || {})}_${JSON.stringify(pagination || {})}`;
      
      // Try cache first
      const cached = memoryCache.get<Paginated<Transaction>>(cacheKey);
      if (cached) {
        info("[TransactionService] Using cached transactions");
        return respondOk(cached);
      }
      
      // For now, call apiService.getTransactions with pagination only
      // Filters will need to be implemented in the API
      const response = await apiService.getTransactions(pagination);
      
      if (isApiSuccess(response) && response.data) {
        // Apply client-side filters if needed
        let filteredItems = response.data.items || [];
        
        if (filters) {
          if (filters.type) {
            filteredItems = filteredItems.filter(tx => tx.type === filters.type);
          }
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredItems = filteredItems.filter(tx => 
              tx.name?.toLowerCase().includes(searchLower) ||
              tx.note?.toLowerCase().includes(searchLower) ||
              tx.reference?.toLowerCase().includes(searchLower)
            );
          }
          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            filteredItems = filteredItems.filter(tx => new Date(tx.date) >= startDate);
          }
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            filteredItems = filteredItems.filter(tx => new Date(tx.date) <= endDate);
          }
        }
        
        const result: Paginated<Transaction> = {
          items: filteredItems,
          nextCursor: null
        };
        
        // Cache the response
        memoryCache.set(cacheKey, result, 300); // 5 minute cache
        
        // Also update local storage with recent transactions
        for (const tx of filteredItems.slice(0, 10)) {
          await storage.local.set('recentTransactions', {
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            currency: tx.assetSymbol || 'USD',
            status: tx.status,
            createdAt: tx.date || new Date().toISOString(),
            recipientId: tx.recipientId,
            senderId: tx.senderId,
            note: tx.note,
            syncedAt: Date.now()
          });
        }
        
        return respondOk(result);
      }
      
      return response;
    } catch (error) {
      logError("List transactions error:", error)
      return handleError("Failed to list transactions", ErrorCode.UNKNOWN)
    }
  }

  /**
   * Get a single transaction by ID
   */
  async getTransactionById(id: string): Promise<ApiResponse<Transaction>> {
    if (!id) return handleError("Transaction ID is required", ErrorCode.VALIDATION_ERROR)
    
    try {
      const storage = getStorageManager();
      
      // Try local storage first
      const localTx = await storage.local.get('recentTransactions', id);
      if (localTx) {
        info(`[TransactionService] Found transaction ${id} in local storage`);
        const transaction: Transaction = {
          id: localTx.id,
          name: 'Transaction',
          amount: localTx.amount,
          date: new Date(localTx.createdAt).toISOString(),
          type: localTx.type as TransactionType,
          status: localTx.status as any,
          recipientId: localTx.recipientId,
          senderId: localTx.senderId,
          assetSymbol: localTx.currency,
          note: localTx.note
        };
        return respondOk(transaction);
      }
      
      // Fallback to API
      const response = await httpClient.get<ApiResponse<Transaction>>(`/api/transactions/${id}`)
      
      if (isApiSuccess(response) && response.data) {
        // Cache it locally
        await storage.local.set('recentTransactions', {
          id: response.data.id,
          type: response.data.type,
          amount: response.data.amount,
          currency: response.data.assetSymbol || 'USD',
          status: response.data.status,
          createdAt: response.data.date || new Date().toISOString(),
          recipientId: response.data.recipientId,
          senderId: response.data.senderId,
          note: response.data.note,
          syncedAt: Date.now()
        });
      }
      
      return response
    } catch (error) {
      logError("Get transaction by ID error:", error)
      return handleError("Failed to get transaction", ErrorCode.UNKNOWN)
    }
  }

  /**
   * Notify send-money event
   */
  async sendMoneyNotification(tx: string, recipientId: string, note?: string): Promise<ApiResponse<void>> {
    if (!tx || !recipientId) return handleError("TX and recipient ID are required", ErrorCode.VALIDATION_ERROR)
    try {
      const response = await httpClient.post<ApiResponse<void>>("/api/transactions/notify", { tx, recipientId, note })
      return response
    } catch (error) {
      logError("Send money notification error:", error)
      return handleError("Failed to send notification", ErrorCode.UNKNOWN)
    }
  }

  /**
   * Request money from a contact
   */
  async requestMoneyNew(payload: { amount: number; note?: string; contactId?: string; channel?: string }): Promise<ApiResponse<void>> {
    if (!payload.amount || payload.amount <= 0) return handleError("Valid amount is required", ErrorCode.VALIDATION_ERROR)
    try {
      const response = await httpClient.post<ApiResponse<void>>("/api/transactions/request", payload)
      return response
    } catch (error) {
      logError("Request money error:", error)
      return handleError("Failed to request money", ErrorCode.UNKNOWN)
    }
  }

  /**
   * Retrieve cash-out options
   */
  async getCashoutOptions(location?: string): Promise<ApiResponse<CashOutMethod[]>> {
    try {
      const params = location ? `?location=${encodeURIComponent(location)}` : ""
      const response = await httpClient.get<ApiResponse<CashOutMethod[]>>(`/api/cashout/options${params}`)
      return response
    } catch (error) {
      logError("Get cashout options error:", error)
      return handleError("Failed to get cashout options", ErrorCode.UNKNOWN)
    }
  }

  /**
   * Initiate a cash-out request
   */
  async initiateCashout(payload: { fromAccount: string; toAccount: string; amount: number; currency: string }): Promise<ApiResponse<CashOutResponse>> {
    if (!payload.fromAccount || !payload.toAccount || !payload.amount || payload.amount <= 0) {
      return handleError("Invalid cashout parameters", ErrorCode.VALIDATION_ERROR)
    }
    try {
      const response = await httpClient.post<ApiResponse<CashOutResponse>>("/api/cashout/initiate", payload)
      return response
    } catch (error) {
      logError("Initiate cashout error:", error)
      return handleError("Failed to initiate cashout", ErrorCode.UNKNOWN)
    }
  }

  /**
   * Cancel an existing cash-out by transaction ID
   */
  async cancelCashout(txId: string): Promise<ApiResponse<void>> {
    if (!txId) return handleError("Transaction ID is required", ErrorCode.VALIDATION_ERROR)
    try {
      const response = await httpClient.delete<ApiResponse<void>>(`/api/cashout/${txId}`)
      return response
    } catch (error) {
      logError("Cancel cashout error:", error)
      return handleError("Failed to cancel cashout", ErrorCode.UNKNOWN)
    }
  }

  /**
   * List cash-out records with optional filters and pagination
   */
  async listCashouts(filters?: Record<string, any>, pagination?: PaginationRequest): Promise<ApiResponse<Paginated<CashOutResponse>>> {
    try {
      const params = new URLSearchParams()
      
      // Add filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value))
          }
        })
      }
      
      // Add pagination
      if (pagination?.limit) params.append("limit", pagination.limit.toString())
      if (pagination?.cursor) params.append("cursor", pagination.cursor)
      
      const response = await httpClient.get<ApiResponse<Paginated<CashOutResponse>>>(`/api/cashout?${params.toString()}`)
      return response
    } catch (error) {
      logError("List cashouts error:", error)
      return handleError("Failed to list cashouts", ErrorCode.UNKNOWN)
    }
  }
}

// Export a singleton instance
export const transactionService = new TransactionService()
