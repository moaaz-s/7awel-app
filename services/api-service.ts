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

export interface LoginInitiationResponse {
  requiresOtp: boolean
}

export interface OtpVerificationResponse {
  success: boolean
  phone: string
  token: string
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

// Mock user data (replace with actual data or fetch logic)
let mockUser: User = {
  id: "user-123",
  firstName: "Satoshi",
  lastName: "Nakamoto",
  phone: "+1234567890",
  email: "satoshi@example.com",
  avatar: "https://via.placeholder.com/150", // Correct field name
};

// Mock wallet balance
let mockBalance: WalletBalance = {
  available: 1234.56,
  total: 1300.00, // Add required field
  pending: 65.44,  // Add required field
};

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
    // Store auth token in secure storage so it works on native builds.
    import("@/utils/secure-storage").then(({ setItem }) => setItem("auth_token", token))
  }

  // Clear auth token
  clearToken() {
    this.token = null
    import("@/utils/secure-storage").then(({ removeItem }) => removeItem("auth_token"))
  }

  // User endpoints
  async getUser(): Promise<ApiResponse<User>> {
    // Mock user data
    const user: User = {
      id: "user123",
      firstName: "John",
      lastName: "Doe",
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
      firstName: "John",
      lastName: "Doe",
      phone: "+1 (555) 123-4567",
      email: "john.doe@example.com",
      avatar: "JD",
      ...data,
    }

    return this.delay({ data: user, success: true })
  }

  // Auth endpoints
  async login(phone: string): Promise<ApiResponse<LoginInitiationResponse>> {
    // Mock login initiation - always requires OTP for now
    console.log(`[Mock API] Initiating login for ${phone}, requires OTP.`);
    const response: LoginInitiationResponse = {
      requiresOtp: true,
    }

    return this.delay({ data: response, success: true })
  }

  async verifyOtp(phone: string, otp: string): Promise<ApiResponse<OtpVerificationResponse>> {
    // Mock OTP verification
    const response: OtpVerificationResponse = {
      success: true,
      phone: phone,
      token: "mock-verified-auth-token-456"
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

// --- Mock User Service ---
export const userService = {
  /**
   * Mock function to update user profile data.
   * @param userId - The ID of the user to update (currently ignored in mock).
   * @param updateData - The partial user data to update.
   * @returns A Promise resolving to the updated User object.
   */
  updateProfile: async (userId: string, updateData: Partial<User>): Promise<User> => {
    console.log(`[Mock API] updateProfile called for userId: ${userId} with data:`, updateData);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Merge the updates into the mock user object
    mockUser = { ...mockUser, ...updateData };

    console.log(`[Mock API] Returning updated mock user:`, mockUser);
    return mockUser;
  },

  /**
   * Mock function to get the user profile.
   * @param userId - The ID of the user to fetch (currently ignored in mock).
   * @returns A Promise resolving to the User object.
   */
  getUserProfile: async (userId: string): Promise<User> => {
    console.log(`[Mock API] getUserProfile called for userId: ${userId}`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log(`[Mock API] Returning mock user:`, mockUser);
    return mockUser;
  },

  /**
   * Mock function to get the wallet balance.
   * @param userId - The ID of the user (currently ignored in mock).
   * @returns A Promise resolving to the WalletBalance object.
   */
  getWalletBalance: async (userId: string): Promise<WalletBalance> => {
    console.log(`[Mock API] getWalletBalance called for userId: ${userId}`);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 400));
    console.log(`[Mock API] Returning mock balance:`, mockBalance);
    return mockBalance;
  },
};

// Export a singleton instance
export const apiService = new ApiService()
