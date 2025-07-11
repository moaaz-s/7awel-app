/**
 * auth-types.ts
 * 
 * Centralized type definitions for authentication-related components and data.
 * This helps with maintainability by ensuring type consistency across the auth system.
 */
import { AuthStep } from '@/context/auth/flow/flowSteps';
import { AuthFlowType, FlowStep } from '@/context/auth/flow/flowsOrchestrator';
import { AuthStatus } from './auth-state-machine';
import { ErrorCode } from '@/types/errors';
import { User } from '@/types';

export enum OTP_CHANNEL {
  SMS = "sms",
  WHATSAPP = "whatsapp",
  TELEGRAM = "telegram"
}
// ---------------- Session Types ----------------

/**
 * Represents the current session state
 */
export interface Session {
  /**
   * Whether the session is currently active (user can access protected features)
   */
  isActive: boolean;

  /**
   * Timestamp of last user activity
   */
  lastActivity: number;

  /**
   * Timestamp when session expires
   */
  expiresAt: number;

  /**
   * Whether PIN has been verified for this session
   */
  pinVerified: boolean;
}

/**
 * Possible states of a session
 */
export enum SessionStatus {
  Active = 'active',
  Locked = 'locked',
  Expired = 'expired',
  Inactive = 'inactive'
}

// ---------------- Auth Types ----------------

/**
 * Authentication response data with success indicator and optional error info
 */
export interface AuthResponse {
  success: boolean;
  error?: string;
  errorCode?: ErrorCode;
}

/**
 * Migrate from old StepData to new AuthFlowState
 */
export interface AuthFlowState {
  // ===== Input Data (from user) =====
  phone?: string;
  countryCode?: string;
  phoneNumber?: string;
  email?: string;
  channel?: OTP_CHANNEL;
  
  // ===== Profile Data =====
  user?: User;
  
  // ===== Verification States =====
  phoneValidated: boolean;
  emailVerified: boolean;
  pinSet: boolean;
  pinVerified: boolean;
  registrationComplete: boolean;
  
  // ===== Wallet States =====
  walletCreated?: boolean;
  walletAddress?: string;
  
  // ===== Computed States =====
  tokenValid: boolean;
  tokenExists: boolean;
  sessionActive: boolean;
  
  // ===== Timestamps =====
  phoneOtpExpires?: number;
  emailOtpExpires?: number;
  
  // ===== Metadata =====
  deviceInfo?: any;
  
  // ===== Allow extensions =====
  [key: string]: any;
}

/**
 * Payload data passed to authentication step handlers
 */
export interface FlowPayload {
  /** Country dialing code for phone entry */
  countryCode?: string;
  /** National phone number for phone entry */
  phoneNumber?: string;
  phone?: string;
  channel?: OTP_CHANNEL;
  otp?: string;
  email?: string;
  emailCode?: string;

  // Migrate to User
  firstName?: string;
  lastName?: string;
  address?: string;
  country?: string;
  dob?: string;
  gender?: string;

  user?: User;

  // Wallet creation
  walletAddress?: string;

  pin?: string; // TODO: Do we really ues this?
  step?: AuthStep;
  data?: AuthFlowState;
}

/**
 * State for the authentication reducer
 */
export interface AuthState {
  authStatus: AuthStatus;
  isLoading: boolean;
  /**
   * Indicates whether the user is fully authenticated and ready for secure operations.
   * This is true only when:
   * 1. A valid auth token exists
   * 2. The user has set up their PIN
   * 3. They have an active session
   */
  isTokenReady: boolean;
  currentStep: AuthStep | null;
  activeFlow: {
    type: AuthFlowType;
    steps: FlowStep[];
    currentIndex: number;
  } | null;

  flowState: AuthFlowState;

  error: string | null;
  deviceInfo: any | null;
  
  // Session management
  session: Session | null;
  lastActivity: number;
  idleTimeoutMs: number; // configurable timeout
}

/**
 * Actions for the authentication reducer
 */
export type AuthAction =
  | { type: 'SET_AUTH_STATUS'; payload: AuthStatus }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DEVICE_INFO'; payload: any }
  | { 
      type: 'START_FLOW'; 
      payload: { 
        type: AuthFlowType; 
        initialData?: Partial<AuthFlowState>; 
        initialIndex: number; 
      } 
    }
  | { 
      type: 'ADVANCE_STEP'; 
      payload: { 
        nextStep: AuthStep; 
        nextData: Partial<AuthFlowState>; 
        nextIndex: number 
      } 
    }
  | { type: 'SET_FLOW_STATE'; payload: Partial<AuthFlowState> }
  | { type: 'SET_FLOW_ERROR'; payload: string | null }
  | { type: 'END_FLOW' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'LOCKOUT'; payload?: string }
  // Session actions
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'UPDATE_SESSION_ACTIVITY' }
  | { type: 'LOCK_SESSION' }
  | { type: 'CLEAR_SESSION' };

/**
 * Core authentication context interface
 */
export interface AuthContextType {
  authStatus: AuthStatus;
  isLoading: boolean;
  /**
   * Indicates whether the user is fully authenticated and ready for secure operations.
   * This is true only when:
   * 1. A valid auth token exists
   * 2. The user has set up their PIN
   * 3. They have an active session
   */
  isTokenReady: boolean;
  currentStep: AuthStep | null;
  activeFlow: {
    type: AuthFlowType;
    steps: FlowStep[];
    currentIndex: number;
  } | null;
  flowState: AuthFlowState;
  error: string | null;
  deviceInfo: any | null;

  // Flow management
  advanceFlow: (payload: FlowPayload) => Promise<void>;
  initiateFlow: (flowType: AuthFlowType, initialData?: Partial<AuthFlowState>) => void;
  
  // Session management
  hardLogout: () => Promise<void>;
  // Session methods
  lockSession: () => Promise<void>;
  unlockSession: () => Promise<boolean>;
  // Idle monitoring (for UI toast warnings)
  isIdle: boolean;
  idleTimeRemaining: number;
}
