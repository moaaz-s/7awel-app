/**
 * auth-types.ts
 * 
 * Centralized type definitions for authentication-related components and data.
 * This helps with maintainability by ensuring type consistency across the auth system.
 */
import { AuthStep } from '@/context/auth/flow/flowSteps';
import { AuthFlowType, FlowStep, FlowCtx } from '@/context/auth/flow/flowsOrchestrator';
import { OtpChannel } from '@/services/api-service';
import { AuthStatus } from './auth-state-machine';
import { ErrorCode } from '@/types/errors';

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
 * Data shared between authentication steps
 */
export interface StepData {
  /** Full phone number including country code */
  phone?: string;
  /** Country dialing code, e.g. "+1" */
  countryCode?: string;
  /** National phone number without country code, e.g. "5551234567" */
  phoneNumber?: string;
  channel?: OtpChannel;
  email?: string;
  /** Whether the user has successfully entered their PIN this session */
  pinVerified?: boolean;
  /** Whether the user has set up a PIN */
  pinSet?: boolean;
  emailVerified?: boolean;
  phoneValidated?: boolean;
  registrationComplete?: boolean;
  firstName?: string;
  lastName?: string;
  address?: string;
  country?: string;
  dob?: string;
  gender?: string;
  emailOtpExpires?: number; // Timestamp for when the email OTP expires
  phoneOtpExpires?: number; // Timestamp for when the phone OTP expires
  otpExpires?: number; // Generic OTP expiry, can be used for phone or email
  tokenValid?: boolean;
  deviceInfo?: any;
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
  channel?: OtpChannel;
  otp?: string;
  email?: string;
  emailCode?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  country?: string;
  dob?: string;
  gender?: string;
  pin?: string;
  step?: AuthStep;
  data?: StepData;
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
  stepData: StepData;
  error: string | null;
  deviceInfo: any | null;
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
        initialData?: StepData; 
        initialIndex: number; 
      } 
    }
  | { 
      type: 'ADVANCE_STEP'; 
      payload: { 
        nextStep: AuthStep; 
        nextData: StepData; 
        nextIndex: number 
      } 
    }
  | { type: 'SET_STEP_DATA'; payload: StepData }
  | { type: 'SET_FLOW_ERROR'; payload: string | null }
  | { type: 'END_FLOW' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'LOCKOUT'; payload?: string };

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
  stepData: StepData;
  error: string | null;
  deviceInfo: any | null;

  // Flow management
  advanceFlow: (payload: FlowPayload) => Promise<void>;
  initiateFlow: (flowType: AuthFlowType, initialData?: StepData) => void;
  
  // OTP & verification helpers
  resendPhoneOtp: () => Promise<void>;
  
  // PIN management
  setPin: (pin: string) => Promise<boolean>;
  validatePin: (pin: string) => Promise<boolean>;
  checkPin: (pin: string) => Promise<boolean>;
  forgotPin: () => Promise<void>;
  
  // Session management
  softLogout: () => Promise<void>;
  hardLogout: () => Promise<void>;
  resendEmailOtp: (email?: string) => Promise<void>;

  // Authentication actions
  signIn: (phone: string, email: string) => Promise<boolean>;
  resetAttempts: () => Promise<void>;
}
