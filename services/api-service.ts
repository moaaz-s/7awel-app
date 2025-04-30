import type {
  User,
  Transaction,
  Contact,
  WalletBalance,
  AssetBalance,
  AppSettings,
  EstimateGasRequest,
  GasEstimate,
  ApiResponse,
  LoginInitiationResponse,
  OtpVerificationResponse,
  TransactionFilters,
  PaginationRequest,
  Paginated,
  PaymentRequest,
  CashOutResponse,
} from "@/types"
import { ErrorCode } from "@/types/errors"
import { httpClient } from "@/services/http-client"
import { getOtpAttempts, incrementOtpAttempts, resetOtpAttempts, getOtpLockUntil, setOtpLockUntil } from "@/utils/storage";
import { info, warn, error as logError } from "@/utils/logger"

// ApiResponse now comes from types

// Mock user data (replace with actual data or fetch logic)
let mockUser: User = {
  id: "user-123",
  firstName: "Satoshi",
  lastName: "Nakamoto",
  phone: "+1234567890",
  email: "satoshi@example.com",
  avatar: "https://via.placeholder.com/150", // Correct field name
};

// Mock multi-asset balances (P2)
let mockBalances: AssetBalance[] = [
  { symbol: "USD", total: 1300.0, available: 1234.56, pending: 65.44 },
  { symbol: "BTC", total: 0.5, available: 0.4, pending: 0.1 },
];

// Mock contacts
let mockContacts: Contact[] = [
  { id: "contact1", name: "Sarah Johnson", phone: "+1 (555) 123-4567", initial: "SJ" },
  { id: "contact2", name: "Michael Chen", phone: "+1 (555) 987-6543", initial: "MC" },
  { id: "contact3", name: "Emma Wilson", phone: "+1 (555) 456-7890", initial: "EW" },
  { id: "contact4", name: "David Kim", phone: "+1 (555) 234-5678", initial: "DK" },
]

// Mock API implementation
class ApiService {
  private token: string | null = null
  // --- Env-controlled behaviour for mock API ---
  private defaultMockDelay: number
  private mockErrorRate: number
  private methodLatencies: Record<string, number>

  constructor() {
    // Configure from env (works in both node + vite/webpack environments)
    // Accept either NEXT_PUBLIC_ or VITE_ prefixes.
    const getEnv = (key: string): string | undefined => {
      // @ts-ignore – process may be undefined in browser builds
      if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) {
        // @ts-ignore – Node typings
        return process.env[key]
      }
      // Vite style – injected into import.meta.env
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore – import.meta may not have env typings
        return typeof import.meta !== "undefined" ? (import.meta as any).env?.[key] : undefined
      } catch {
        return undefined
      }
    }

    this.defaultMockDelay = Number(getEnv("NEXT_PUBLIC_MOCK_LATENCY_MS") ?? getEnv("VITE_MOCK_LATENCY_MS") ?? 500)

    const errorRateStr = getEnv("NEXT_PUBLIC_MOCK_ERROR_RATE") ?? getEnv("VITE_MOCK_ERROR_RATE") ?? "0"
    const rate = parseFloat(errorRateStr)
    // Clamp between 0 and 1
    this.mockErrorRate = isNaN(rate) ? 0 : Math.min(1, Math.max(0, rate))

    // Build per-method latency map (e.g. NEXT_PUBLIC_MOCK_LATENCY_MS_GET_USER)
    this.methodLatencies = {}
    const envKeys = (
      typeof process !== "undefined" && process.env ? Object.keys(process.env) : []
    ).concat(
      // Include Vite style keys if present
      typeof import.meta !== "undefined" ? Object.keys((import.meta as any).env || {}) : [],
    )

    envKeys.forEach((k) => {
      const match = k.match(/(?:VITE_|NEXT_PUBLIC_)MOCK_LATENCY_MS_(.+)/)
      if (match) {
        const methodName = match[1].toLowerCase()
        const val = Number(getEnv(k) ?? 0)
        if (!isNaN(val) && val > 0) {
          this.methodLatencies[methodName] = val
        }
      }
    })
  }

  // Ensure an auth token is present for protected endpoints
  private ensureAuthorized() {
    if (!this.token) {
      throw new Error("Unauthorized – missing token")
    }
  }

  // Helper to resolve after appropriate delay (default or per-method)
  private async delay<T>(data: T): Promise<T> {
    const stack = new Error().stack || ""
    // Look for caller two frames up (this method <- respondOk/respondError <- public API)
    const match = stack.split("\n")[3]?.match(/ApiService\.([\w$]+)/)
    const caller = match ? match[1].toLowerCase() : ""
    const delayMs = this.methodLatencies[caller] ?? this.defaultMockDelay
    return new Promise((resolve) => setTimeout(() => resolve(data), delayMs))
  }

  // --- P3 helpers to wrap responses ---
  private generateTraceId(): string {
    // Simple UUID-like generator for mock purposes
    return `trace-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
  }

  private ok<T>(data: T, message = "OK", statusCode = 200): ApiResponse<T> {
    return {
      statusCode,
      message,
      data,
      traceId: this.generateTraceId(),
    }
  }

  private respondOk<T>(data: T): Promise<ApiResponse<T>> {
    // Randomly fail to simulate network/server errors based on mockErrorRate (produce 4xx/5xx)
    if (Math.random() < this.mockErrorRate) {
      const is4xx = Math.random() < 0.5
      const status = is4xx ? 400 + Math.floor(Math.random() * 50) : 500 + Math.floor(Math.random() * 50)
      return this.respondError(ErrorCode.UNKNOWN, status)
    }
    return this.delay(this.ok(data))
  }

  private respondError(errorCode: ErrorCode, statusCode = 400): Promise<ApiResponse<null>> {
    return this.delay({
      statusCode,
      message: errorCode,
      error: errorCode,
      errorCode,
      traceId: this.generateTraceId(),
    } as ApiResponse<null>)
  }

  // Set auth token
  public setToken(token: string | null) {
    this.token = token
    if (token) {
      info("[ApiService] Token set.")
    } else {
      info("[ApiService] Token cleared.")
    }
    httpClient.setToken(token)
  }

  // Clear auth token
  public clearToken() {
    this.token = null
    httpClient.clearToken()
  }

  // User endpoints
  async getUser(): Promise<ApiResponse<User>> {
    this.ensureAuthorized()
    // Mock user data
    const user: User = mockUser;
    // {
    //   id: "user123",
    //   firstName: "John",
    //   lastName: "Doe",
    //   phone: "+1 (555) 123-4567",
    //   email: "john.doe@example.com",
    //   avatar: "JD",
    // }

    return this.respondOk(user)
  }

  async updateUser(data: Partial<User>): Promise<ApiResponse<User>> {
    this.ensureAuthorized()
    // Mock update user
    // TODO: recheck this code again, where should we get user data from before updating it: memory? device storage? remove storage? hybrid solution? and where should this operation happen: here? or data should be passed from elsewhere?
    const user: User = {
      id: "user123",
      firstName: "John",
      lastName: "Doe",
      phone: "+1 (555) 123-4567",
      email: "john.doe@example.com",
      avatar: "JD",
      ...data,
    }

    return this.respondOk(user)
  }

  // Auth endpoints
  async login(phone: string): Promise<ApiResponse<LoginInitiationResponse>> {
    // Mock login initiation - always requires OTP for now
    console.log(`[Mock API] Initiating login for ${phone}, requires OTP.`);
    const response: LoginInitiationResponse = {
      requiresOtp: true,
    }

    return this.respondOk(response)
  }

  async verifyOtp(phone: string, otp: string): Promise<ApiResponse<OtpVerificationResponse>> {    
    // --- Persistent brute-force protection ---
    const lockedUntil = await getOtpLockUntil(phone);
    const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes
    const MAX_ATTEMPTS = 5;

    if (lockedUntil && Date.now() < lockedUntil) {
      return this.respondError(ErrorCode.TOO_MANY_ATTEMPTS, 429)
    }

    const attempts = await incrementOtpAttempts(phone);
    if (attempts > MAX_ATTEMPTS) {
      await setOtpLockUntil(phone, Date.now() + LOCK_DURATION_MS);
      await resetOtpAttempts(phone);
      return this.respondError(ErrorCode.TOO_MANY_ATTEMPTS, 429)
    }

    // Mock OTP verification
    const response: OtpVerificationResponse = {
      success: true,
      phone: phone,
      token: "mock-verified-auth-token-456"
    }

    // Reset attempts on success
    await resetOtpAttempts(phone);
    return this.respondOk(response)
  }

  async signup(phoneNumber: string): Promise<ApiResponse<{ requiresOtp: boolean }>> {
    console.log(`[Mock API] Initiating registration for ${phoneNumber}, requires OTP.`);
    
    await this.delay({ requiresOtp: true });
    // For demo purposes, let's simulate a 10% chance of the phone already being registered
    if (Math.random() < 0.1) {
      return this.respondError(ErrorCode.PHONE_ALREADY_REGISTERED)
    }
    return this.respondOk({ requiresOtp: true });
  }

  // Transaction endpoints
  async getTransactions(filters?: TransactionFilters & PaginationRequest): Promise<ApiResponse<Paginated<Transaction>>> {
    this.ensureAuthorized()
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
        assetSymbol: "USD",
        network: "testnet",
        fee: 0.1,
        txHash: "0xabc1",
      },
      {
        id: "tx2",
        name: "Coffee Shop",
        amount: -4.75,
        date: "2025-04-11",
        type: "payment",
        status: "completed",
        assetSymbol: "USD",
        network: "testnet",
        fee: 0.05,
        txHash: "0xabc2",
      },
      {
        id: "tx3",
        name: "Michael Chen",
        amount: 125,
        date: "2025-04-10",
        type: "receive",
        status: "completed",
        senderId: "contact2",
        assetSymbol: "USD",
        network: "testnet",
        fee: 0,
        txHash: "0xabc3",
      },
      {
        id: "tx4",
        name: "Grocery Store",
        amount: -32.5,
        date: "2025-04-10",
        type: "payment",
        status: "completed",
        assetSymbol: "USD",
        network: "testnet",
        fee: 0.08,
        txHash: "0xabc4",
      },
    ]

    // Apply filters if provided
    let filtered = transactions;
    if (filters?.type) filtered = filtered.filter((t) => t.type === filters.type);

    // pagination
    const limit = filters?.limit ?? 50;
    const start = filters?.cursor ? parseInt(filters.cursor, 10) : 0;
    const slice = filtered.slice(start, start + limit);
    const nextCursor = start + limit < filtered.length ? String(start + limit) : null;

    return this.respondOk({ items: slice, nextCursor })
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    this.ensureAuthorized()
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
      assetSymbol: "USD",
      network: "testnet",
      fee: 0.1,
      txHash: "0xabc1",
    }

    return this.respondOk(transaction)
  }

  async sendMoney(recipientId: string, amount: number, note?: string): Promise<ApiResponse<Transaction>> {
    this.ensureAuthorized()
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
      assetSymbol: "USD",
      network: "testnet",
      fee: 0.1,
      txHash: "0xabc1",
    }

    return this.respondOk(transaction)
  }

  async requestMoney(amount: number): Promise<ApiResponse<PaymentRequest>> {
    this.ensureAuthorized()
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

    return this.respondOk(request)
  }

  async cashOut(amount: number, method: string): Promise<ApiResponse<CashOutResponse>> {
    this.ensureAuthorized()
    // Mock cash out
    const response: CashOutResponse = {
      success: true,
      reference: `WD${Date.now()}`,
      amount: amount,
      fee: amount * (method === "bank" ? 0.005 : method === "agent" ? 0.01 : 0.015),
      method: method,
      date: new Date().toISOString().split("T")[0],
    }

    return this.respondOk(response)
  }

  // Contacts endpoints
  async getContacts(): Promise<ApiResponse<{ items: Contact[], nextCursor: string | null }>> {
    this.ensureAuthorized()
    const start = 0
    const limit = 100
    const slice = mockContacts.slice(start, start + limit)
    return this.respondOk({ items: slice, nextCursor: null })
  }

  private contactCounter = 5;

  async addContact(contact: Omit<Contact, "id" | "initial">): Promise<ApiResponse<Contact>> {
    this.ensureAuthorized();
    const id = `contact${this.contactCounter++}`;
    const newContact: Contact = { ...contact, id, initial: contact.name.slice(0, 2).toUpperCase() } as Contact;
    mockContacts.push(newContact);
    return this.respondOk(newContact)
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<ApiResponse<Contact>> {
    this.ensureAuthorized();
    const idx = mockContacts.findIndex((c) => c.id === id);
    if (idx === -1) return this.respondError(ErrorCode.NOT_FOUND, 404);
    mockContacts[idx] = { ...mockContacts[idx], ...updates } as Contact;
    return this.respondOk(mockContacts[idx]);
  }

  async deleteContact(id: string): Promise<ApiResponse<null>> {
    this.ensureAuthorized();
    const idx = mockContacts.findIndex((c) => c.id === id);
    if (idx === -1) return this.respondError(ErrorCode.NOT_FOUND, 404);
    mockContacts.splice(idx, 1);
    return this.respondOk(null as any);
  }

  async searchContacts(query: string, limit = 20): Promise<ApiResponse<Contact[]>> {
    this.ensureAuthorized();
    const list = mockContacts.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
    return this.respondOk(list);
  }

  // --- Push registration (P2 task 8) ---
  private pushToken: string | null = null;
  async registerPush(deviceToken: string): Promise<ApiResponse<{ registered: boolean }>> {
    this.ensureAuthorized();
    this.pushToken = deviceToken;
    return this.respondOk({ registered: true });
  }

  async unregisterPush(): Promise<ApiResponse<{ registered: boolean }>> {
    this.ensureAuthorized();
    this.pushToken = null;
    return this.respondOk({ registered: false });
  }

  // --- Settings persistence (P2 task 9) ---
  private settings: AppSettings = { language: "en", theme: "light" };
  async getSettings(): Promise<ApiResponse<AppSettings>> {
    this.ensureAuthorized();
    return this.respondOk(this.settings);
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<ApiResponse<AppSettings>> {
    this.ensureAuthorized();
    this.settings = { ...this.settings, ...partial };
    return this.respondOk(this.settings);
  }

  // --- Gas / fee estimate (P2 task 11) ---
  async estimateGas(req: EstimateGasRequest): Promise<ApiResponse<GasEstimate>> {
    this.ensureAuthorized();
    const feeRate = req.assetSymbol === "BTC" ? 0.0001 : 0.005; // simplistic
    const fee = req.amount * feeRate;
    const estimate: GasEstimate = { assetSymbol: req.assetSymbol, fee, total: req.amount + fee };
    return this.respondOk(estimate);
  }

  // Wallet endpoints
  async getBalances(): Promise<ApiResponse<AssetBalance[]>> {
    this.ensureAuthorized()
    return this.respondOk(mockBalances)
  }

  // Deprecated – returns primary asset for backward compatibility
  async getWalletBalance(): Promise<ApiResponse<WalletBalance>> {
    const res = await this.getBalances()
    return { ...res, data: (res.data ?? [])[0] }
  }

  async getPaymentAddress(): Promise<ApiResponse<string>> {
    this.ensureAuthorized()
    // Mock payment address (crypto wallet address)
    const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

    return this.respondOk(address)
  }
}

// --- Deprecated userService removed (functionality is now in ApiService) ---

// Export a singleton instance
export const apiService = new ApiService()
