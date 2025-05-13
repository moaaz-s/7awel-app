/**
 * Authentication state machine
 * 
 * Complete enum of authentication states supporting the full authentication flow,
 * from initial app loading to authenticated state, including all intermediate states.
 */

export enum AuthStatus {
  /** Initial loading state */
  Initial = 'initial',
  
  /** Loading/pending state during auth checks */
  Pending = 'pending',
  
  /** User is not authenticated */
  Unauthenticated = 'unauthenticated',
  
  /** OTP verification in progress */
  OtpPending = 'otp_pending',
  
  /** Email verification in progress */
  EmailVerificationPending = 'email_verification_pending',
  
  /** PIN setup required */
  PinSetupPending = 'pin_setup_pending',
  
  /** PIN verification required */
  RequiresPin = 'requires_pin',
  
  /** User is authenticated but session is locked */
  Locked = 'locked',
  
  /** User is fully authenticated */
  Authenticated = 'authenticated',
  
  /** Error state */
  Error = 'error'
}

export interface AuthState {
  /** Current authentication status */
  status: AuthStatus;
  /** Whether auth is loading */
  isLoading: boolean;
  /** Error message if status is Error */
  error?: string | null;
}

export const initialAuthState: AuthState = {
  status: AuthStatus.Initial,
  isLoading: false,
  error: null
};
