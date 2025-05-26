import type {
  User,
  Transaction,
  Contact,
  WalletBalance,
  AssetBalance,
  AppSettings,
  ApiResponse,
  OtpInitiationResponse,
  OtpVerificationResponse,
  TransactionFilters,
  PaginationRequest,
  Paginated,
  PaymentRequest,
  CashOutResponse,
  TransactionType,
  TransactionStatus,
  Promotion
} from "@/types"
import { ErrorCode } from "@/types/errors"
import { httpClient } from "@/services/http-client"
import { getOtpAttempts, incrementOtpAttempts, resetOtpAttempts, getOtpLockUntil, setOtpLockUntil } from "@/utils/storage";
import { info, warn, error as logError } from "@/utils/logger"
import { generateDeviceFingerprint, getDeviceInfo } from "@/utils/device-fingerprint"
import { emailVerificationTemplate } from "@/utils/email-templates"
import { createToken, isTokenExpired } from '@/utils/token-utils';
import { string } from "zod";

// Define types needed for the API service
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Define available OTP delivery channels
export enum OtpChannel {
  SMS = "sms",
  WHATSAPP = "whatsapp",
  TELEGRAM = "telegram"
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
];

// Mock promotions with localized content
const mockPromotions: Record<string, Promotion[]> = {
  en: [
    {
      id: "promo1",
      title: "Invite friends, earn $50",
      description: "Earn $50 for each friend you invite by 26 March. T&C apply",
      imageUrl: "https://placehold.co/400x400/orange/white?text=Gift+Box", 
      linkUrl: "/referral",
      backgroundColor: "bg-white"
    },
    {
      id: "promo2",
      title: "Secure your assets",
      description: "Enable 2FA for extra security on your account",
      linkUrl: "/profile/security",
      backgroundColor: "bg-white"
    },
    {
      id: "promo3", 
      title: "Cash out instantly",
      description: "New options available for cashing out your balance",
      linkUrl: "/cash-out",
      backgroundColor: "bg-white"
    }
  ],
  ar: [
    {
      id: "promo1",
      title: "ادعُ أصدقائك, واحصل على 50$",
      description: "احصل على 50$ لكل صديق تدعوه قبل 26 مارس. تطبق الشروط والأحكام",
      imageUrl: "https://placehold.co/400x400/orange/white?text=Gift+Box", 
      linkUrl: "/referral",
      backgroundColor: "bg-white"
    },
    {
      id: "promo2",
      title: "قم بتأمين أصولك",
      description: "فعّل المصادقة الثنائية لحماية إضافية على حسابك",
      linkUrl: "/profile/security",
      backgroundColor: "bg-white"
    },
    {
      id: "promo3", 
      title: "صرف النقود فورًا",
      description: "خيارات جديدة متاحة لصرف رصيدك",
      linkUrl: "/cash-out",
      backgroundColor: "bg-white"
    }
  ]
};

/**
 * ApiService - Mock implementation of the 7awel wallet backend API
 * 
 * This service provides mock implementations of all backend endpoints
 * that will eventually be replaced with real API calls. It handles:
 * 
 * - Authentication (phone, email verification, PIN)
 * - User profile management
 * - Transaction operations
 * - Wallet and balance operations
 * - Contact management
 * 
 * The mock service simulates realistic behavior including:
 * - Configurable response delays
 * - Random errors based on error rate
 * - Token management and expiry
 * - Proper error handling
 */
class ApiService {
  private mockLatencyMs: number;
  private mockErrorRate: number;
  private shouldSimulateErrors: boolean;
  private pendingOtps: Map<string, { otp: string, expires: number, attempts: number }>;
  private pendingEmailVerifications: Map<string, { token: string, code: string, expires: number }>;
  private defaultMockDelay: number = 800; // Default delay in ms
  
  /** Login authentication token (long-lived) */
  private authToken: string | null = null;

  // Mock registry for availability checks in signup
  private mockRegistered = {
    phones: ['+15550001111', '+15550002222'],
    emails: ['taken@example.com', 'user@domain.com'],
  };

  constructor() {
    // Configure mock behavior from environment variables
    this.mockLatencyMs = parseInt(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS || process.env.VITE_MOCK_LATENCY_MS || '800', 10);
    this.mockErrorRate = parseFloat(process.env.MOCK_ERROR_RATE || '0.05'); // 5% by default
    this.shouldSimulateErrors = process.env.SIMULATE_ERRORS !== 'false';
    
    // Storage for pending OTPs
    this.pendingOtps = new Map();
    
    // Storage for pending email verifications
    this.pendingEmailVerifications = new Map();

    info('ApiService initialized with mock latency:', this.mockLatencyMs, 'ms');
    info('ApiService initialized with error rate:', this.mockErrorRate);
  }

  /**
   * Simulates network delay for API calls
   * @returns {Promise<void>} Promise that resolves after the configured delay
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = this.defaultMockDelay * (0.5 + Math.random());
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * Simulates random errors based on configured error rate
   * @returns {boolean} True if an error should be simulated
   */
  private simulateRandomError(): boolean {
    // This is the key method for error simulation
    // It should return true with a probability of mockErrorRate
    const shouldSimulate = this.shouldSimulateErrors && Math.random() < this.mockErrorRate;
    if (shouldSimulate) {
      info("[ApiService] Simulating random error (rate:", this.mockErrorRate, ")");
    }
    return shouldSimulate;
  }

  /**
   * Handle API errors 
   * @param {string} message - Error message
   * @param {any} error - Original error
   * @returns {ApiResponse<never>} Error response
   */
  private handleError(message: string, error?: any): ApiResponse<never> {
    error && warn(`[ApiService] ${message}:`, error);
    return {
      statusCode: 500,
      message,
      error: error instanceof Error ? error.message : String(error || ErrorCode.UNKNOWN),
      errorCode: error as ErrorCode,
      traceId: `trace-${Date.now()}`
    };
  }

  /**
   * Creates a successful API response
   * @param {T} data - Response data
   * @returns {ApiResponse<T>} Success response
   */
  private respondOk<T>(data: T): ApiResponse<T> {
    // Return a success response with proper types
    return {
      statusCode: 200,
      message: "Success",
      data,
      traceId: `trace-${Date.now()}`
    };
  }

  /**
   * Ensure an auth token is present for protected endpoints
   * Throws an error if no authentication token is available
   * @private
   */
  private ensureAuthorized() {
    if (!this.authToken) {
      throw new Error("Unauthorized – missing token")
    }
    
    // Add proactive token expiration check
    if (isTokenExpired(this.authToken)) {
      // Clear the expired token
      this.clearToken();
      throw new Error('Authentication token has expired');
    }
  }

  /**
   * Get info required for logging in: OTP or password
   * 
   * Must be authenticated
   */
  private requiresAuth(): boolean {
    return !this.authToken
  }

  /**
   * Get promotions for display on the home page
   * @param {string} locale - The current locale (en or ar)
   * @returns {ApiResponse<Promotion[]>} - The promotions data for the specified locale
   */
  async getPromotions(locale: string = "en"): Promise<ApiResponse<Promotion[]>> {
    await this.simulateNetworkDelay();
    
    // Use English as fallback if locale not supported
    const supportedLocale = mockPromotions[locale] ? locale : "en";
    const promotionsForLocale = mockPromotions[supportedLocale] || [];

    return this.respondOk(promotionsForLocale);
  }

  /**
   * Set authentication tokens and configure the HTTP client
   * 
   * @param options Object containing authToken
   */
  public setToken(authToken : string | null): void {
    if (authToken !== undefined) {
      this.authToken = authToken;
      if (authToken) {
        info("[ApiService] Auth token set.");
      } else {
        info("[ApiService] Auth token cleared.");
      }
    }
  }



  /**
   * Clear all authentication tokens
   */
  public clearToken() {
    this.setToken(null)
    httpClient.clearToken()
  }

  // Auth endpoints

  /**
   * Sends a one-time passcode to the specified medium (phone or email)
   * 
   * @param medium The verification medium ('phone' or 'email')
   * @param value The phone number or email address
   * @param channel Channel for OTP delivery (SMS, WhatsApp, Telegram) - only used for phone
   * @returns API response with OTP expiration time and status
   */
  async sendOtp(
    medium: 'phone' | 'email',
    value: string,
    channel: OtpChannel = OtpChannel.WHATSAPP // not used for the mock, but should be used in production
  ): Promise<ApiResponse<OtpInitiationResponse>> {
    try {
      // Get device info to include with request, device should be the same and during the operation.
      // If the device changes, the operation should be aborted.
      // In future subsequent logins (PIN entry), the device info should be checked to ensure it is the same.
      const deviceInfo = await getDeviceInfo()
      await this.simulateNetworkDelay();
      if (this.simulateRandomError()) {
        return this.handleError(`Simulated error sending OTP to ${medium}: ${value}`);
      }

      if (!value)
        return this.handleError(`${medium} is required.`, ErrorCode.OTP_MISSING_MEDIUM);
      
      if (medium === 'email' && !/\S+@\S+\.\S+/.test(value)) {
        return this.handleError("Invalid email format.", ErrorCode.EMAIL_INVALID);
      }
      
      // Check for existing lockouts | This can be managed by the server.
      const lockUntil = await getOtpLockUntil(value);
      if (lockUntil && lockUntil > Date.now()) {
        const remainingLockTime = Math.ceil((lockUntil - Date.now()) / 1000);
        warn(`[ApiService] OTP for ${value} is locked for ${remainingLockTime}s`);
        return this.handleError(`Too many requests. Try again in ${remainingLockTime} seconds.`, ErrorCode.TOO_MANY_OTP_ATTEMPTS);
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000)); // Generate 6-digit OTP
      const expires = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes
      this.pendingOtps.set(value, { otp, expires, attempts: 0 });

      info(`[ApiService] Sent ${medium.toUpperCase()} OTP: ${otp} to ${value}, expires: ${new Date(expires).toLocaleTimeString()}`);
      return this.respondOk({ 
        requiresOtp: true,
        expires 
      });

    } catch (err) {
      return this.handleError('Failed to initiate login', err);
    }
  }

  /**
   * Verify OTP code sent via any channel (SMS, WhatsApp, Telegram)
   * 
   * @param medium The verification medium ('phone' or 'email')
   * @param value The phone number or email address
   * @param otp OTP code entered by the user
   * @returns API response with auth token if successful
   */
  async verifyOtp(medium: 'phone' | 'email', value: string, otp: string): Promise<ApiResponse<OtpVerificationResponse>> {
    // Get device info to include with request (check remark in sendOtp)
    const deviceInfo = await getDeviceInfo()

    await this.simulateNetworkDelay();
    if (this.simulateRandomError()) {
      return this.handleError("Simulated error verifying email OTP");
    }

    const storedOtpData = this.pendingOtps.get(value);

    if (!storedOtpData) {
      warn(`[ApiService] No OTP found for ${medium}: ${value}`);
      return this.handleError("OTP not found or already used. Please request a new one.", ErrorCode.OTP_INVALID);
    }

    // Simple OTP lockout check (simulating rate limiting)
    const lockUntil = await getOtpLockUntil(value);
    if (lockUntil && Date.now() < lockUntil) {
      // await incrementOtpAttempts(value);
      return this.handleError('Too many OTP attempts', null);
    }

    if (Date.now() > storedOtpData.expires) {
      warn(`[ApiService] ${medium.toUpperCase()} OTP for ${value} expired.`);
      this.pendingOtps.delete(value); // Clean up expired OTP
      return this.handleError(`OTP has expired. Please request a new one.`, ErrorCode.OTP_EXPIRED);
    }

    // Validate the OTP - in a real implementation, this would verify against sent OTP
    // Currently for mock purposes:
    // 1. Check if we have a stored pending OTP for this phone
    // 2. If not, accept any 6-digit code as valid
    const pendingOtp = this.pendingOtps.get(value);
    const isValidOtp = 
      // If we have a stored OTP, verify it 
      (/^\d{6}$/.test(otp) && pendingOtp?.otp === otp) ||
      // TODO: Remove for production (For testing, accept any 6-digit code)
      /^\d{6}$/.test(otp);

    if (!isValidOtp) {
      await incrementOtpAttempts(value);
      warn(`[ApiService] Invalid ${medium.toUpperCase()} OTP for ${value}. Attempt ${storedOtpData.attempts}`);

      // After too many attempts, lock for 5 minutes
      const attempts = await getOtpAttempts(value);
      if (attempts >= 3) {
        const lockDuration = 5 * 60 * 1000 // 5 minutes
        await setOtpLockUntil(value, Date.now() + lockDuration);
        return this.handleError(`Too many ${medium.toUpperCase()} OTP attempts`, ErrorCode.OTP_LOCKED);
      }

      return this.handleError(`Invalid ${medium.toUpperCase()} OTP`, ErrorCode.OTP_INVALID);
    }

    // OTP is correct
    this.pendingOtps.delete(value); // Consume OTP
    await resetOtpAttempts(value); // Reset attempts (if using shared storage util)

    const responseData: OtpVerificationResponse = {
      success: true,
      phone: medium === 'phone' ? value : "",
      email: medium === 'email' ? value : "",
      phoneVerified: medium === 'phone',
      emailVerified: medium === 'email',
      pinSet: false, // should we let the pin manager determine this somewhere else?
      registrationComplete: false,
    };

    info(`[ApiService] OTP validated successfully for ${value}`);
    return this.respondOk(responseData);
  }

  /**
   * Check availability of phone/email before signup.
   */
  async checkAvailability(
    medium: 'phone' | 'email',
    value: string
  ): Promise<ApiResponse<{ available: boolean }>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError(`Simulated error checking availability for ${medium}`, null);
      }
      if (!value) {
        return this.handleError(`${medium} is required.`, ErrorCode.OTP_MISSING_MEDIUM);
      }
      if (medium === 'phone' && this.mockRegistered.phones.includes(value)) {
        return this.handleError('Phone already registered.', ErrorCode.PHONE_ALREADY_REGISTERED);
      }
      if (medium === 'email' && this.mockRegistered.emails.includes(value)) {
        return this.handleError('Email already registered.', ErrorCode.EMAIL_ALREADY_REGISTERED);
      }
      return this.respondOk({ available: true });
    } catch (error) {
      return this.handleError('Failed to check availability', error);
    }
  }

  /**
   * Get the authenticated user's profile information
   * 
   * @returns API response with user profile data
   */
  async getUser(): Promise<ApiResponse<User>> {
    await this.simulateNetworkDelay();
    
    // Simulate random errors based on configured error rate
    if (this.simulateRandomError()) {
      return {
        statusCode: 500,
        message: "Server error",
        error: "Failed to retrieve user data due to server error",
        traceId: `trace-${Date.now()}`
      };
    }
    
    return this.respondOk(mockUser);
  }

  /**
   * Update the user's profile information
   * 
   * @param data Partial user object with fields to update
   * @returns API response with updated user profile
   */
  async updateUser(data: Partial<User>): Promise<ApiResponse<User>> {
    this.ensureAuthorized()
    
    // Update the mock user object with the provided data
    Object.assign(mockUser, data);
    
    return this.respondOk(mockUser)
  }

  /**
   * Get the user's balances for all supported assets
   * @returns {Promise<ApiResponse<AssetBalance[]>>} API response with balance data
   */
  async getBalances(): Promise<ApiResponse<AssetBalance[]>> {
    await this.simulateNetworkDelay();
    
    try {
      // Return mock balances
      return this.respondOk(mockBalances);
    } catch (error) {
      return this.handleError('Failed to get balances', error);
    }
  }

  /**
   * Get the user's primary wallet balance
   * @returns {Promise<ApiResponse<WalletBalance>>} API response with wallet balance
   */
  async getWalletBalance(): Promise<ApiResponse<WalletBalance>> {
    await this.simulateNetworkDelay();
    
    try {
      // Return the first balance as the primary wallet balance for backward compatibility
      const primaryBalance = mockBalances[0];
      
      const walletBalance: WalletBalance = {
        total: primaryBalance.total,
        available: primaryBalance.available,
        pending: primaryBalance.pending,
        symbol: primaryBalance.symbol // Add symbol to match the AssetBalance interface
      };
      
      return this.respondOk(walletBalance);
    } catch (error) {
      return this.handleError('Failed to get wallet balance', error);
    }
  }

  /**
   * Get all transactions with pagination
   * @param {PaginationRequest} pagination - Pagination options
   * @returns {Promise<ApiResponse<PaginatedResponse<Transaction>>>} API response with paginated transactions
   */
  async getTransactions(pagination?: PaginationRequest): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError('Failed to get transactions');
      }

      // Generate dynamic mock transactions for the past 90 days
      const mockTransactions: Transaction[] = [];
      const transactionTypes: TransactionType[] = ['send', 'receive', 'payment', 'cashOut'];
      const statuses: TransactionStatus[] = ['completed', 'pending', 'failed'];
      const names = ['John Doe', 'Coffee Shop', 'Grocery Store', 'Jane Smith', 'Gas Station', 'Amazon', 'Uber', 'Netflix', 'Spotify', 'Sarah Johnson', 'Michael Chen', 'Emma Wilson', 'David Kim'];
      
      for (let i = 0; i < 90; i++) {
        // Some days have multiple transactions, some have one, some have none
        const transactionsPerDay = Math.random() < 0.1 ? 0 : Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 3) + 2;
        
        for (let j = 0; j < transactionsPerDay; j++) {
          const date = new Date(Date.now() - i * 86400000 - Math.floor(Math.random() * 86400000));
          const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
          const name = names[Math.floor(Math.random() * names.length)];
          const amount = type === 'receive' ? Math.floor(Math.random() * 500) + 50 : -(Math.floor(Math.random() * 100) + 5);
          
          mockTransactions.push({
            id: `tx-${i}-${j}-${Date.now()}`,
            name,
            amount: type === 'receive' ? Math.abs(amount) : amount,
            date: date.toISOString(),
            type,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            reference: `TX${Math.floor(Math.random() * 1000000)}`,
            recipientId: type === 'send' ? `user${Math.floor(Math.random() * 1000)}` : undefined,
            senderId: type === 'receive' ? `user${Math.floor(Math.random() * 1000)}` : undefined,
            fee: Math.random() < 0.5 ? parseFloat((Math.random() * 2).toFixed(2)) : undefined,
            note: Math.random() < 0.3 ? `Note for ${name}` : undefined
          });
        }
      }

      // Apply pagination
      const limit = pagination?.limit || 20;
      const result = mockTransactions.slice(0, limit);

      // Format response to match expected PaginatedResponse type
      return this.respondOk({
        items: result,
        total: mockTransactions.length,
        page: 1,
        limit,
        pages: Math.ceil(mockTransactions.length / limit)
      });
    } catch (error) {
      return this.handleError('Failed to get transactions', error);
    }
  }

  /**
   * Get a specific transaction by ID
   * @param {string} id - Transaction ID
   * @returns {Promise<ApiResponse<Transaction>>} API response with transaction data
   */
  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    await this.simulateNetworkDelay();
    
    try {
      // Mock transaction lookup
      const mockTransaction: Transaction = {
        id,
        name: id === "tx1" ? "Sarah Johnson" : id === "tx2" ? "Coffee Shop" : id === "tx3" ? "Paycheck" : "Transaction",
        amount: id === "tx3" ? 1000 : -50,
        date: new Date().toISOString().split('T')[0],
        type: id === "tx3" ? "receive" as TransactionType : "send" as TransactionType,
        status: "completed" as TransactionStatus
      };
      
      return this.respondOk(mockTransaction);
    } catch (error) {
      return this.handleError(`Failed to get transaction ${id}`, error);
    }
  }

  /**
   * Get user's contacts
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Number of contacts per page (default: 20)
   * @returns {Promise<ApiResponse<PaginatedResponse<Contact>>>} API response with paginated contacts
   */
  async getContacts(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Contact>>> {
    await this.simulateNetworkDelay();
    
    try {
      const paginatedResponse: PaginatedResponse<Contact> = {
        items: mockContacts,
        total: mockContacts.length,
        page,
        limit,
        pages: Math.ceil(mockContacts.length / limit)
      };
      
      return this.respondOk(paginatedResponse);
    } catch (error) {
      return this.handleError('Failed to get contacts', error);
    }
  }

  /**
   * Send money to a contact
   * @param {string} recipientId - Contact ID of the recipient
   * @param {number} amount - Amount to send
   * @param {string} [note] - Optional note for the transaction
   * @returns {Promise<ApiResponse<Transaction>>} API response with the created transaction
   */
  async sendMoney(recipientId: string, amount: number, note?: string): Promise<ApiResponse<Transaction>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return {
          statusCode: 500,
          message: "Transaction failed",
          error: "Transaction failed due to network error. Please try again.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Find the recipient contact
      const recipient = mockContacts.find(contact => contact.id === recipientId);
      
      if (!recipient) {
        return {
          statusCode: 404,
          message: "Contact not found",
          error: "The specified contact could not be found.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Create a new transaction
      const newTransaction: Transaction = {
        id: `tx${Date.now()}`,
        name: recipient.name,
        amount: -Math.abs(amount), // Ensure negative amount for outgoing transaction
        date: new Date().toISOString().split('T')[0],
        type: "send" as TransactionType,
        status: "completed" as TransactionStatus,
        note: note,
      };
      
      return this.respondOk(newTransaction);
    } catch (error) {
      return this.handleError('Failed to send money', error);
    }
  }

  /**
   * Request money without a specific contact
   * @param {number} amount - Amount to request
   * @param {string} [note] - Optional note for the request
   * @returns {Promise<ApiResponse<{ amount: number, reference: string }>>} API response
   */
  async requestMoney(amount: number, note?: string): Promise<ApiResponse<{ amount: number, reference: string }>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError('Failed to request money');
      }
      
      // In a real implementation, this would create a money request and possibly
      // notify the user's contacts
      const reference = `REQ${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`;
      
      info(`[ApiService] Money request created: ${amount} with reference ${reference}`);
      
      return this.respondOk({
        amount,
        reference
      });
    } catch (error) {
      return this.handleError('Failed to request money', error);
    }
  }

  /**
   * Request money from a specific contact
   * @param {string} contactId - ID of the contact to request from
   * @param {number} amount - Amount to request
   * @param {string} [note] - Optional note explaining the request
   * @returns {Promise<ApiResponse<{reference: string, recipient: Contact}>>} API response with request reference and recipient
   */
  async requestMoneyFromContact(contactId: string, amount: number, note?: string): Promise<ApiResponse<{
    reference: string,
    recipient: Contact
  }>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return {
          statusCode: 500,
          message: "Request failed",
          error: "Request failed due to network error. Please try again.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Find the contact
      const contact = mockContacts.find(c => c.id === contactId);
      
      if (!contact) {
        return {
          statusCode: 404,
          message: "Contact not found",
          error: "The specified contact could not be found.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // In a real implementation, this would send a notification to the recipient
      info(`[ApiService] Money request sent to ${contact.name} (${contact.phone}) for $${amount}${note ? ' with note: ' + note : ''}`);
      
      return this.respondOk({
        reference: `REQ${Date.now().toString().slice(-8)}`,
        recipient: contact
      });
    } catch (error) {
      return this.handleError('Failed to request money from contact', error);
    }
  }

  /**
   * Add a new contact to the user's contact list
   * @param {Omit<Contact, 'id'>} contactData - Contact data without ID
   * @returns {Promise<ApiResponse<Contact>>} API response with the created contact
   */
  async addContact(contactData: Omit<Contact, 'id'>): Promise<ApiResponse<Contact>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return {
          statusCode: 500,
          message: "Failed to add contact",
          error: "Contact creation failed due to server error.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Validate required fields
      if (!contactData.name || !contactData.phone) {
        return {
          statusCode: 400,
          message: "Invalid contact data",
          error: "Name and phone are required fields.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Check for duplicate phone numbers
      if (mockContacts.some(c => c.phone === contactData.phone)) {
        return {
          statusCode: 409,
          message: "Duplicate contact",
          error: "A contact with this phone number already exists.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Create new contact with generated ID
      const newContact: Contact = {
        id: `contact${Date.now()}`,
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email,
        initial: contactData.initial || contactData.name.charAt(0).toUpperCase()
      };
      
      // Add to mock contacts
      mockContacts.push(newContact);
      
      // In a real implementation, we would:
      // 1. Hash the phone number for security before storing remotely
      // 2. Store the contact in local storage based on platform
      // 3. Sync with remote service if user is authenticated
      info(`[ApiService] Contact added: ${newContact.name} (${newContact.phone})`);
      
      return this.respondOk(newContact);
    } catch (error) {
      return this.handleError('Failed to add contact', error);
    }
  }

  /**
   * Update an existing contact
   * @param {string} contactId - ID of the contact to update
   * @param {Partial<Omit<Contact, 'id'>>} contactData - Partial contact data to update
   * @returns {Promise<ApiResponse<Contact>>} API response with the updated contact
   */
  async updateContact(contactId: string, contactData: Partial<Omit<Contact, 'id'>>): Promise<ApiResponse<Contact>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return {
          statusCode: 500,
          message: "Failed to update contact",
          error: "Contact update failed due to server error.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Find the contact
      const contactIndex = mockContacts.findIndex(c => c.id === contactId);
      
      if (contactIndex === -1) {
        return {
          statusCode: 404,
          message: "Contact not found",
          error: "The specified contact could not be found.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Check for duplicate phone if phone is being updated
      if (contactData.phone && 
          mockContacts.some(c => c.phone === contactData.phone && c.id !== contactId)) {
        return {
          statusCode: 409,
          message: "Duplicate contact",
          error: "Another contact with this phone number already exists.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Update the contact
      const updatedContact: Contact = {
        ...mockContacts[contactIndex],
        ...contactData,
        // Ensure ID doesn't change
        id: contactId,
        // Update initial if name changes and initial isn't explicitly provided
        initial: contactData.initial || 
                (contactData.name ? 
                  contactData.name.charAt(0).toUpperCase() : 
                  mockContacts[contactIndex].initial)
      };
      
      // Replace in mock contacts
      mockContacts[contactIndex] = updatedContact;
      
      // In a real implementation, we would:
      // 1. Update in local storage based on platform
      // 2. Sync with remote service if user is authenticated
      info(`[ApiService] Contact updated: ${updatedContact.name} (${updatedContact.phone})`);
      
      return this.respondOk(updatedContact);
    } catch (error) {
      return this.handleError('Failed to update contact', error);
    }
  }

  /**
   * Delete a contact
   * @param {string} contactId - ID of the contact to delete
   * @returns {Promise<ApiResponse<{success: boolean}>>} API response indicating success
   */
  async deleteContact(contactId: string): Promise<ApiResponse<{success: boolean}>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return {
          statusCode: 500,
          message: "Failed to delete contact",
          error: "Contact deletion failed due to server error.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Find the contact
      const contactIndex = mockContacts.findIndex(c => c.id === contactId);
      
      if (contactIndex === -1) {
        return {
          statusCode: 404,
          message: "Contact not found",
          error: "The specified contact could not be found.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Get contact info for logging
      const contact = mockContacts[contactIndex];
      
      // Remove from mock contacts
      mockContacts.splice(contactIndex, 1);
      
      // In a real implementation, we would:
      // 1. Remove from local storage based on platform
      // 2. Sync with remote service if user is authenticated
      info(`[ApiService] Contact deleted: ${contact.name} (${contact.phone})`);
      
      return this.respondOk({ success: true });
    } catch (error) {
      return this.handleError('Failed to delete contact', error);
    }
  }

  /**
   * Search contacts by name, phone, or email
   * @param {string} query - Search query
   * @param {number} [page] - Page number (default: 1)
   * @param {number} [limit] - Number of contacts per page (default: 20)
   * @returns {Promise<ApiResponse<Contact[]>>} API response with matching contacts
   */
  async searchContacts(query: string, page = 1, limit = 20): Promise<ApiResponse<Contact[]>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError('Failed to search contacts');
      }
      
      // Mock contacts data - ensure there's data for test that expects a contact with "bob" in the name
      const mockContacts: Contact[] = [
        {
          id: 'contact1',
          name: 'Bob Smith',
          phone: '+1234567890',
          email: 'bob@example.com',
          initial: 'B'
        },
        {
          id: 'contact2',
          name: 'Alice Johnson',
          phone: '+1987654321',
          email: 'alice@example.com',
          initial: 'A'
        },
        {
          id: 'contact3',
          name: 'Charlie Brown',
          phone: '+1122334455',
          email: 'charlie@example.com',
          initial: 'C'
        }
      ];
      
      // Filter contacts based on the query
      const filteredContacts = mockContacts.filter(contact => 
        contact.name.toLowerCase().includes(query.toLowerCase()) ||
        contact.phone.includes(query) ||
        (contact.email && contact.email.toLowerCase().includes(query.toLowerCase()))
      );
      
      return this.respondOk(filteredContacts);
    } catch (error) {
      return this.handleError('Failed to search contacts', error);
    }
  }

  /**
   * Get user settings
   * @returns {Promise<ApiResponse<AppSettings>>} API response with user settings
   */
  async getSettings(): Promise<ApiResponse<AppSettings>> {
    await this.simulateNetworkDelay();
    
    try {
      // Mock settings aligned with the existing ProfileSettingsContext
      const mockSettings: AppSettings = {
        language: 'en',
        theme: 'light',
        dailyLimit: 1000,
        notifications: {
          pushEnabled: true,
          transactionAlerts: true,
          securityAlerts: true,
          promotions: false,
          emailNotifications: true,
          smsNotifications: true
        },
        security: {
          biometricEnabled: true,
          twoFactorEnabled: false,
          transactionPin: true,
          inactivityTimeout: 5 // minutes
        }
      };
      
      return this.respondOk(mockSettings);
    } catch (error) {
      return this.handleError('Failed to get settings', error);
    }
  }

  /**
   * Update user settings
   * @param {Partial<AppSettings>} settings - Partial settings to update
   * @returns {Promise<ApiResponse<AppSettings>>} API response with updated settings
   */
  async updateSettings(settings: Partial<AppSettings>): Promise<ApiResponse<AppSettings>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return {
          statusCode: 500,
          message: "Failed to update settings",
          error: "Settings update failed due to server error.",
          traceId: `trace-${Date.now()}`
        };
      }
      
      // Mock existing settings matching ProfileSettingsContext
      const existingSettings: AppSettings = {
        language: 'en',
        theme: 'light',
        dailyLimit: 1000,
        notifications: {
          pushEnabled: true,
          transactionAlerts: true,
          securityAlerts: true,
          promotions: false,
          emailNotifications: true,
          smsNotifications: true
        },
        security: {
          biometricEnabled: true,
          twoFactorEnabled: false,
          transactionPin: true,
          inactivityTimeout: 5
        }
      };
      
      // Deep merge with updates
      const updatedSettings: AppSettings = {
        ...existingSettings,
        ...settings,
        // Handle nested objects
        notifications: settings.notifications 
          ? { ...existingSettings.notifications, ...settings.notifications }
          : existingSettings.notifications,
        security: settings.security
          ? { ...existingSettings.security, ...settings.security }
          : existingSettings.security
      };
      
      // In a real implementation, we would save to storage and sync with server
      info(`[ApiService] Settings updated:`, updatedSettings);
      
      return this.respondOk(updatedSettings);
    } catch (error) {
      return this.handleError('Failed to update settings', error);
    }
  }

  /**
   * Cash out money to an external method
   * @param {number} amount - Amount to cash out
   * @param {string} method - Cash out method ('bank', 'agent', 'mobile')
   * @returns {Promise<ApiResponse<{reference: string, amount: number, fee: number, method: string, date: string}>>} API response
   */
  async cashOut(amount: number, method: string): Promise<ApiResponse<{reference: string, amount: number, fee: number, method: string, date: string}>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError('Cash out failed');
      }
      
      // Create a withdrawal reference with WD prefix for test compatibility
      const reference = `WD${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`;
      const fee = amount * 0.01; // 1% fee
      
      return this.respondOk({
        reference,
        amount,
        fee,
        method,
        date: new Date().toISOString()
      });
    } catch (error) {
      return this.handleError('Failed to cash out', error);
    }
  }

  /**
   * Register push notification token
   * @param {string} token - Push notification token
   * @returns {Promise<ApiResponse<{success: boolean}>>} API response
   */
  async registerPush(token: string): Promise<ApiResponse<{success: boolean}>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError('Failed to register push token');
      }
      
      info(`[ApiService] Push token registered: ${token}`);
      
      return this.respondOk({
        success: true
      });
    } catch (error) {
      return this.handleError('Failed to register push token', error);
    }
  }

  /**
   * Unregister push notification token
   * @returns {Promise<ApiResponse<{success: boolean}>>} API response
   */
  async unregisterPush(): Promise<ApiResponse<{success: boolean}>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError('Failed to unregister push token');
      }
      
      info(`[ApiService] Push token unregistered`);
      
      return this.respondOk({
        success: true
      });
    } catch (error) {
      return this.handleError('Failed to unregister push token', error);
    }
  }

  /**
   * Get a payment address for receiving crypto
   * @returns {Promise<ApiResponse<string>>} API response with payment address
   */
  async getPaymentAddress(): Promise<ApiResponse<string>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError('Failed to get payment address');
      }
      
      // Generate a mock Ethereum address
      const address = `0x${Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      return this.respondOk(address);
    } catch (error) {
      return this.handleError('Failed to get payment address', error);
    }
  }

  /**
   * Acquires an authentication token after all verification steps are complete.
   * 
   * @param {string} phone Verified phone number
   * @param {string} email Verified email address
   * @param {DeviceInfo} deviceInfo Device information for security purposes
   * @returns {Promise<ApiResponse<{accessToken: string, refreshToken: string}>>} API response with authentication token
   */
  public async acquireToken(
    phone: string,
    email: string,
    deviceInfo: any
  ): Promise<ApiResponse<{accessToken: string, refreshToken: string}>> {
    await this.simulateNetworkDelay();
    
    if (this.simulateRandomError()) {
      return {
        statusCode: 500,
        message: 'Failed to acquire authentication token',
        error: 'Token acquisition failed',
        traceId: `trace-${Date.now()}`,
        errorCode: ErrorCode.SERVICE_UNAVAILABLE
      };
    }
    
    // In a real implementation, we would use the deviceInfo for enhanced security
    // such as device binding, fraud detection, or multi-device management
    info(`[ApiService] Acquiring token with device: ${JSON.stringify(deviceInfo)}`);
    
    // Generate a token with proper expiration
    const token = this.generateMockToken(phone, deviceInfo);
    this.setToken(token);
    
    info(`[ApiService] Auth token acquired for ${phone}`);
    // Generate a mock refresh token (7d expiry)
    const refreshToken = createToken({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    // Return both access and refresh tokens
    return this.respondOk({ accessToken: token, refreshToken });
  }

  /**
   * Generates a mock JWT-like token for testing purposes
   * @param {string} phone User phone number for the token subject
   * @param {any} deviceInfo Device information for device binding
   * @returns {string} Mock JWT token with expiration
   * @private
   */
  private generateMockToken(phone: string, deviceInfo: any): string {
    // Current timestamp in seconds
    const issuedAt = Math.floor(Date.now() / 1000);
    
    // Token expires in 24 hours (86400 seconds)
    const expiresAt = issuedAt + 86400;
    
    // Create a simplified payload similar to a real JWT
    const payload = {
      sub: phone, // Subject (the user identifier)
      iat: issuedAt, // Issued at
      exp: expiresAt, // Expiration time
      deviceId: deviceInfo?.platform || 'web', // Simple device binding
    };
    
    // In a real implementation, this would be signed with a secret key
    // Here we simply encode it to base64 for demonstration
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    // Use a realistic JWT structure with header.payload.signature
    // The header and signature parts are simplified for mocking
    return `eyJhbGciOiJIUzI1NiJ9.${encodedPayload}.MOCK_SIGNATURE`;
  }

  /**
   * Mock endSession to revoke on server-side
   */
  /**
   * Mock endSession to revoke on server-side
   */
  async endSession(): Promise<ApiResponse<void>> {
    await this.simulateNetworkDelay();
    
    try {
      if (this.simulateRandomError()) {
        return this.handleError('Mock endSession error');
      }
      
      this.authToken = null;
      return this.respondOk({});
    } catch (error) {
      return this.handleError('Failed to end session', error);
    }
  }

  /**
   * Mock refresh token endpoint
   * @param refreshToken Current refresh token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    await this.simulateNetworkDelay();
    if (this.simulateRandomError()) {
      return this.handleError('Mock refresh token error');
    }
    // Generate new tokens (1h access, 7d refresh)
    const newAccess = createToken({ exp: Date.now() + 60 * 60 * 1000 });
    const newRefresh = createToken({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    this.authToken = newAccess;
    return this.respondOk({ accessToken: newAccess, refreshToken: newRefresh });
  }

  /* --------------------------------------------------
  * Token-expiry interceptor helpers
  * --------------------------------------------------*/
  private attachTokenExpiryInterceptor(onTokenExpired: () => void) {
    if (typeof window === 'undefined') return; // SSR guard
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      if (response.status === 401 || response.status === 403) {
        // Check for auth token expiry based on status codes
        console.warn('[ApiService] Detected 401/403 – treating as auth token expiry');
        onTokenExpired();
      }
      return response;
    };
  }

  public initAuthInterceptors(onTokenExpired: () => void) {
    this.attachTokenExpiryInterceptor(onTokenExpired);
  }
}
// Export a singleton instance
export const apiService = new ApiService();
