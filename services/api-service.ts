import type { User, Transaction, Contact, WalletBalance } from "@/types"

// Define API response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface OtpVerificationResponse {
  success: boolean
  phone: string
}

export interface TransactionFilters {
  type?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface PaymentRequest {
  id: string
  amount: number
  requestorId: string
  requestorName: string
  date: string
  status: string
  reference: string
}

export interface CashOutResponse {
  success: boolean
  reference: string
  amount: number
  fee: number
  method: string
  date: string
}

// Mock API implementation
class ApiService {
  private token: string | null = null
  private mockDelay = 500 // Simulate network delay

  // Helper to simulate API delay
  private async delay<T>(data: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(data), this.mockDelay))
  }

  // Set auth token
  setToken(token: string) {
    this.token = token
    localStorage.setItem("auth_token", token)
  }

  // Clear auth token
  clearToken() {
    this.token = null
    localStorage.removeItem("auth_token")
  }

  // User endpoints
  async getUser(): Promise<ApiResponse<User>> {
    // Mock user data
    const user: User = {
      id: "user123",
      name: "John Doe",
      phone: "+1 (555) 123-4567",
      email: "john.doe@example.com",
      avatar: "JD",
    }

    return this.delay({ data: user, success: true })
  }

  async updateUser(data: Partial<User>): Promise<ApiResponse<User>> {
    // Mock update user
    const user: User = {
      id: "user123",
      name: "John Doe",
      phone: "+1 (555) 123-4567",
      email: "john.doe@example.com",
      avatar: "JD",
      ...data,
    }

    return this.delay({ data: user, success: true })
  }

  // Auth endpoints
  async login(phone: string, pin: string): Promise<ApiResponse<AuthResponse>> {
    // Mock login
    const response: AuthResponse = {
      user: {
        id: "user123",
        name: "John Doe",
        phone: phone,
        avatar: "JD",
      },
      token: "mock-auth-token-123",
    }

    return this.delay({ data: response, success: true })
  }

  async verifyOtp(phone: string, otp: string): Promise<ApiResponse<OtpVerificationResponse>> {
    // Mock OTP verification
    const response: OtpVerificationResponse = {
      success: true,
      phone: phone,
    }

    return this.delay({ data: response, success: true })
  }

  // Transaction endpoints
  async getTransactions(filters?: TransactionFilters): Promise<ApiResponse<Transaction[]>> {
    // Mock transactions
    const transactions: Transaction[] = [
      {
        id: "tx1",
        name: "Sarah Johnson",
        amount: -50,
        date: "2025-04-11",
        type: "send",
        status: "completed",
        recipientId: "contact1",
        note: "Lunch payment",
      },
      {
        id: "tx2",
        name: "Coffee Shop",
        amount: -4.75,
        date: "2025-04-11",
        type: "payment",
        status: "completed",
      },
      {
        id: "tx3",
        name: "Michael Chen",
        amount: 125,
        date: "2025-04-10",
        type: "receive",
        status: "completed",
        senderId: "contact2",
      },
      {
        id: "tx4",
        name: "Grocery Store",
        amount: -32.5,
        date: "2025-04-10",
        type: "payment",
        status: "completed",
      },
    ]

    // Apply filters if provided
    let filteredTransactions = [...transactions]

    if (filters?.type) {
      filteredTransactions = filteredTransactions.filter((tx) => tx.type === filters.type)
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      filteredTransactions = filteredTransactions.filter(
        (tx) => tx.name.toLowerCase().includes(search) || tx.id.toLowerCase().includes(search),
      )
    }

    return this.delay({ data: filteredTransactions, success: true })
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    // Mock single transaction
    const transaction: Transaction = {
      id: id,
      name: "Sarah Johnson",
      amount: -50,
      date: "2025-04-11",
      type: "send",
      status: "completed",
      recipientId: "contact1",
      note: "Lunch payment",
      reference: `TXN${id}`,
    }

    return this.delay({ data: transaction, success: true })
  }

  async sendMoney(recipientId: string, amount: number, note?: string): Promise<ApiResponse<Transaction>> {
    // Find the recipient by ID to get their name
    // In a real app, this would be a database lookup
    const recipients: Record<string, string> = {
      contact1: "Sarah Johnson",
      contact2: "Michael Chen",
      contact3: "Emma Wilson",
      contact4: "David Kim",
    }

    const recipientName = recipients[recipientId] || "Unknown Recipient"

    // Mock send money
    const transaction: Transaction = {
      id: `tx${Date.now()}`,
      name: recipientName, // Use the recipient's name based on ID
      amount: -amount,
      date: new Date().toISOString().split("T")[0],
      type: "send",
      status: "completed",
      recipientId: recipientId,
      note: note,
      reference: `TXN${Date.now()}`,
    }

    return this.delay({ data: transaction, success: true })
  }

  async requestMoney(amount: number): Promise<ApiResponse<PaymentRequest>> {
    // Mock request money
    const request: PaymentRequest = {
      id: `req${Date.now()}`,
      amount: amount,
      requestorId: "user123",
      requestorName: "John Doe",
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      reference: `REQ${Date.now()}`,
    }

    return this.delay({ data: request, success: true })
  }

  async cashOut(amount: number, method: string): Promise<ApiResponse<CashOutResponse>> {
    // Mock cash out
    const response: CashOutResponse = {
      success: true,
      reference: `WD${Date.now()}`,
      amount: amount,
      fee: amount * (method === "bank" ? 0.005 : method === "agent" ? 0.01 : 0.015),
      method: method,
      date: new Date().toISOString().split("T")[0],
    }

    return this.delay({ data: response, success: true })
  }

  // Contacts endpoints
  async getContacts(): Promise<ApiResponse<Contact[]>> {
    // Mock contacts
    const contacts: Contact[] = [
      { id: "contact1", name: "Sarah Johnson", phone: "+1 (555) 123-4567", initial: "SJ" },
      { id: "contact2", name: "Michael Chen", phone: "+1 (555) 987-6543", initial: "MC" },
      { id: "contact3", name: "Emma Wilson", phone: "+1 (555) 456-7890", initial: "EW" },
      { id: "contact4", name: "David Kim", phone: "+1 (555) 234-5678", initial: "DK" },
    ]

    return this.delay({ data: contacts, success: true })
  }

  // Wallet endpoints
  async getWalletBalance(): Promise<ApiResponse<WalletBalance>> {
    // Mock wallet balance
    const balance: WalletBalance = {
      total: 1250.75,
      available: 1250.75,
      pending: 0,
    }

    return this.delay({ data: balance, success: true })
  }

  async getPaymentAddress(): Promise<ApiResponse<string>> {
    // Mock payment address (crypto wallet address)
    const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

    return this.delay({ data: address, success: true })
  }
}

// Export a singleton instance
export const apiService = new ApiService()
