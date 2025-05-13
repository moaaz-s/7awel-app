// Standard module imports
import { ErrorCode } from './errors';

// User types
export type User = {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone: string
  avatar?: string
  createdAt?: string // ISO date
  lastLogin?: string // ISO date
  kycLevel?: string
}

export type TransactionType = "send" | "receive" | "payment" | "cash_out"
export type TransactionStatus = "pending" | "completed" | "failed"

// Promotion displayed in home page slider
export interface Promotion {
  id: string
  title: string
  description: string
  imageUrl?: string
  linkUrl: string
  backgroundColor?: string
}

export type Transaction = {
  id: string
  name: string
  amount: number
  date: string
  type: TransactionType
  status: TransactionStatus
  reference?: string
  note?: string
  recipientId?: string
  senderId?: string
  assetSymbol?: string
  network?: string
  fee?: number
  txHash?: string
}

export type Contact = {
  id: string
  name: string
  phone: string
  email?: string
  initial: string
}

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
export type AssetBalance = {
  symbol: string
  total: number
  available: number
  pending: number
}

/**
 * @deprecated Use AssetBalance[] via getBalances()
 */
export type WalletBalance = AssetBalance

// ----- Auth & OTP related (legacy) -----
export interface LoginInitiationResponse {
  requiresOtp: boolean
  /** Optional OTP expiry timestamp (unix ms) returned by server */
  expires?: number
}

export interface OtpVerificationResponse {
  success: boolean
  phone: string
  email: string
  pinSet: boolean
  phoneVerified: boolean
  emailVerified: boolean
  registrationComplete: boolean
}

export interface EmailVerificationResponse {
  success: boolean
  emailVerified: boolean
}

export interface SendEmailVerificationResponse {
  token: string     // one-time verification token
  code: string      // 6-digit fallback shown in email
  expires: number   // unix ms expiry timestamp
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
