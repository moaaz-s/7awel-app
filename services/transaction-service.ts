import { apiService } from "@/services/api-service"
import type { Transaction, TransactionType, Contact, QRData } from "@/types"

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
   */
  generateReference(prefix = "TXN"): string {
    return `${prefix}${Date.now()}`
  }

  /**
   * Send money to a recipient
   */
  async sendMoney(recipient: Contact, amount: number, balance: number, note?: string): Promise<TransactionResult> {
    // Validate amount
    const validation = this.validateAmount(amount, balance)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    try {
      // Call API service
      const response = await apiService.sendMoney(recipient.id, amount, note)

      if (response.success) {
        return {
          success: true,
          transaction: response.data,
        }
      } else {
        return {
          success: false,
          error: response.error || TransactionError.TRANSACTION_FAILED,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: TransactionError.TRANSACTION_FAILED,
      }
    }
  }

  /**
   * Cash out money
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

      if (response.success) {
        return {
          success: true,
          reference: response.data.reference,
        }
      } else {
        return {
          success: false,
          error: response.error || TransactionError.TRANSACTION_FAILED,
        }
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
   */
  async getTransaction(id: string): Promise<Transaction | undefined> {
    try {
      const response = await apiService.getTransaction(id)
      if (response.success) {
        return response.data
      }
      return undefined
    } catch (error) {
      console.error("Error fetching transaction:", error)
      return undefined
    }
  }

  /**
   * Get transaction history with optional filters
   */
  async getTransactionHistory(filters?: {
    type?: TransactionType
    search?: string
    startDate?: string
    endDate?: string
  }): Promise<Transaction[]> {
    try {
      const response = await apiService.getTransactions(filters)
      if (response.success) {
        return response.data
      }
      return []
    } catch (error) {
      console.error("Error fetching transaction history:", error)
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

      if (!groups[tx.date]) {
        groups[tx.date] = {
          date: tx.date,
          formattedDate,
          transactions: [],
        }
      }

      groups[tx.date].transactions.push({
        ...tx,
        date: formattedDate,
      })
    })

    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * Store transaction details in session storage
   */
  storeTransactionDetails(key: string, details: TransactionDetails): void {
    sessionStorage.setItem(key, JSON.stringify(details))
  }

  /**
   * Retrieve transaction details from session storage
   */
  retrieveTransactionDetails<T>(key: string): T | null {
    const storedDetails = sessionStorage.getItem(key)
    if (storedDetails) {
      const details = JSON.parse(storedDetails)
      // Clear the data after retrieving
      sessionStorage.removeItem(key)
      return details as T
    }
    return null
  }
}

// Export a singleton instance
export const transactionService = new TransactionService()
