// Standard module imports
import type { Contact as ContactSchema, UserProfile as UserSchema, Transaction as TransactionSchema, AssetBalance as AssetBalanceSchema, Promotion as PromotionSchema, LogEvent as LogEventSchema } from "@/platform/validators/schemas-zod";
import { ErrorCode } from './errors';

// Domain model aliases (canonical types come from Zod schemas)
export type User = UserSchema;


export type Contact = ContactSchema;

export type Transaction = TransactionSchema;

export type AssetBalance = AssetBalanceSchema;

export type Promotion = PromotionSchema;
export type LogEvent = LogEventSchema;

// Legacy enums kept (can be removed if covered by schema enums)
export type TransactionType = "transfer" | "deposit" | "withdraw";
export type TransactionStatus = "pending" | "completed" | "failed";

// Deprecated Promotion interface removed; canonicalised via schema alias above
// QRData
export type QRData = {
  userId: string
  amount?: number
  reference?: string
  timestamp: number
}

export type FlowState = {
  [key: string]: any
}

// Pagination wrapper
export interface Paginated<T> {
  items: T[]
  nextCursor?: string | null
}

// Same as Paginated but includes an optional `total` count returned by some endpoints
export interface PaginatedWithTotal<T> extends Paginated<T> {
  total?: number;
}

export interface PaginationRequest {
  cursor?: string | null
  limit?: number
}

export interface AppSettings {
  language: string
  theme: "light" | "dark"
  dailyLimit?: number
  notifications: {
    pushEnabled: boolean
    transactionAlerts: boolean
    securityAlerts: boolean
    promotions: boolean
    emailNotifications: boolean
    smsNotifications: boolean
  }
  security: {
    biometricEnabled: boolean
    twoFactorEnabled: boolean
    transactionPin: boolean
    inactivityTimeout?: number
  }
}

// Generic API response wrapper (P3)
export interface ApiResponse<T> {
  /**
   * HTTP-like status code. 2xx indicates success.
   */
  statusCode: number
  /**
   * Human readable status / error message
   */
  message: string
  /**
   * Payload returned on success (optional for 204 responses)
   */
  data?: T
  /**
   * Error description (present on non-2xx codes)
   */
  error?: string
  /**
   * Machine-readable error code identifying the failure cause.
   */
  errorCode?: ErrorCode
  /**
   * Unique ID to correlate logs between backend and frontend.
   */
  traceId: string
}

// New multi-asset balance (P2). Deprecated WalletBalance will map to first asset for now.


/**
 * @deprecated Use AssetBalance[] via getBalances()
 */
export type WalletBalance = AssetBalance

// ----- Auth & OTP related (legacy) -----
export interface CheckAvailabilityRequest {
  medium: "phone" | "email"
  value: string
}

export interface CheckAvailabilityResponse {
  available: boolean
}

export interface OtpInitiationResponse {
  requiresOtp: boolean
  /** Optional OTP expiry timestamp (unix ms) returned by server */
  expires?: number
}

export interface OtpVerificationResponse {
  valid: boolean
}

export interface TokenAcquisitionResponse {
  accessToken: string;
  refreshToken: string;
}

// ----- Transaction & Pagination -----
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

// ----- Transaction Request Payloads -----
export interface SendMoneyRequest {
  contactId: string
  amount: number
  note?: string
  assetSymbol?: string
}

export interface RequestMoneyPayload {
  recipientId: string
  amount: number
  note?: string
  assetSymbol?: string
}

export interface CashOutRequest {
  fromAccount: string
  toAccount: string
  amount: number
  currency: string
  method: string
}
