import { AuthStep, AUTH_STEP_PHONE_ENTRY, AUTH_STEP_PHONE_OTP_PENDING, AUTH_STEP_EMAIL_ENTRY_PENDING, AUTH_STEP_EMAIL_OTP_PENDING, AUTH_STEP_PIN_SETUP_PENDING, AUTH_STEP_PIN_ENTRY_PENDING, AUTH_STEP_AUTHENTICATED, AUTH_STEP_LOCKED, AUTH_STEP_TOKEN_ACQUISITION } from '@/constants/auth-steps';
import { OtpChannel, apiService } from '@/services/api-service';
import { StepData, FlowPayload } from './auth/auth-types';
import { getSession, setSession } from '@/utils/storage';
import { getPinHash, incrementPinAttempts, resetPinAttempts } from '@/utils/storage';
import { verifyPin } from '@/utils/pin-utils';
import { info, warn, error as logError } from '@/utils/logger';
import { MAX_PIN_ATTEMPTS } from '@/constants/auth-constants';
import { getDeviceInfo } from '@/utils/device-fingerprint';
import { useTokenManager } from '@/context/auth/hooks/useTokenManager'; // Import useTokenManager
import { AuthStatus } from './auth/auth-state-machine';
import { ErrorCode } from '@/types/errors'; // Added import for ErrorCode
import { AuthFlowType } from '@/constants/auth-flows';

export interface StepHandlerCtx {
  state: any; // keep minimal to avoid circular deps
  payload: FlowPayload;
  dispatch: React.Dispatch<any>;
  t: (key: string, params?: Record<string, any>) => string;
  scheduleLock: (exp: number) => void;
  setPin?: (pin: string) => Promise<boolean>;
  resendPhoneOtp?: () => Promise<void>;
  tokenManager: ReturnType<typeof useTokenManager>; // Add tokenManager to StepHandlerCtx
}

export interface StepResult {
  nextStep?: AuthStep | null;
  nextData: StepData;
}

export type StepHandler = (ctx: StepHandlerCtx) => Promise<StepResult>;

type NonNullAuthStep = Exclude<AuthStep, null>;

/**
 * Handles the phone entry step in the authentication flow.
 * Responsible for sending the OTP to the user's phone number.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const phoneEntryHandler: StepHandler = async ({ state, payload, dispatch, t }) => {
  if (!payload.phone) throw new Error('Phone number is required.');
  
  // On signup flow, check availability for phone
  if (state.activeFlow?.type === AuthFlowType.SIGNUP) {
    const availability = await apiService.checkAvailability('phone', payload.phone);
    if (availability.statusCode !== 200) {
      if (availability.errorCode === ErrorCode.PHONE_ALREADY_REGISTERED) {
        dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.PHONE_ALREADY_REGISTERED') });
        return { nextStep: AUTH_STEP_PHONE_ENTRY, nextData: {} };
      }
      throw new Error(availability.message || 'Availability check failed.');
    }
  }
  
  const selectedChannel = payload.channel ?? OtpChannel.SMS;
  info(`[StepHandler] sendOtp phone: ${payload.phone}, channel: ${selectedChannel}`);
  const apiResponse = await apiService.sendOtp('phone', payload.phone, selectedChannel);
  if (apiResponse?.statusCode !== 200) {
    throw new Error(apiResponse?.message || 'Failed to send OTP.');
  }
  const expires = apiResponse.data?.expires;
  
  // Make sure we set phoneValidated to true here to ensure OTP verification is required
  return {
    nextStep: AUTH_STEP_PHONE_OTP_PENDING,
    nextData: { 
      phone: payload.phone, 
      channel: selectedChannel, 
      otpExpires: expires,
      phoneValidated: true,  // Mark as validated for OTP pending step
      emailVerified: false,  // Ensure email verification is required
      pinSet: false          // Ensure PIN setup is required
    },
  };
};

/**
 * Handles the phone OTP verification step in the authentication flow.
 * Verifies the OTP entered by the user against the one sent to their phone.
 * Part of the multi-factor authentication process.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const phoneOtpHandler: StepHandler = async ({ state, payload, dispatch, t }) => {
  if (!state.stepData.phone) throw new Error('Phone number missing from step data.');
  if (!payload.otp) throw new Error('OTP is required.');
  
  // Get device info to include with the verification request
  const deviceInfo = await getDeviceInfo();
  
  if (state.stepData.otpExpires && Date.now() > state.stepData.otpExpires) {
    warn('[StepHandler] OTP expired.');
    dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.OTP_EXPIRED') });
    return { nextData: state.stepData };
  }
  
  const apiResponse = await apiService.verifyOtp('phone', state.stepData.phone, payload.otp);
  if (apiResponse?.statusCode !== 200) {
    throw new Error(apiResponse?.message || 'OTP verification failed.');
  }
  
  // Extract verified status from response, but NOT tokens (those are handled in token acquisition step)
  const { pinSet = false, emailVerified = false, registrationComplete = false } = apiResponse.data || {};

  // Return updated state data with phone validated flag
  return { 
    nextData: { 
      ...state.stepData, 
      phoneValidated: true,
      pinSet,
      emailVerified,
      registrationComplete
    } 
  };
};

/**
 * Handles the PIN setup and validation steps in the authentication flow.
 * Creates a new PIN during setup or validates an existing PIN during login.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const pinEntryHandler: StepHandler = async ({ state, payload, dispatch, t }) => {
  if (!payload.pin) throw new Error('PIN is required.');
  
  // Direct PIN verification - basic approach
  // In a real implementation, this should be moved to the AuthContext
  // and all pin verification should go through a centralized validatePin function
  const storedHash = await getPinHash();
  if (!storedHash) {
    dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.PIN_NOT_SET') });
    return { nextData: state.stepData };
  }
  
  const isValid = await verifyPin(payload.pin, storedHash);
  if (isValid) {
    await resetPinAttempts();
        
    // Get current session state or create new one
    const currentSession = await getSession() || {
      isActive: false,
      lastActivity: 0,
      expiresAt: 0,
      pinVerified: false
    };
    
    // Update the session to be active with PIN verified
    const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
    await setSession({
      ...currentSession,
      isActive: true,
      lastActivity: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      pinVerified: true
    });
    
    return { nextData: { ...state.stepData, pinVerified: true, pinSet: true } };
  }
  
  // Handle incorrect PIN
  const attempts = await incrementPinAttempts();
  if (attempts >= MAX_PIN_ATTEMPTS) {
    dispatch({ type: 'LOCKOUT', payload: t('errors.MAX_PIN_ATTEMPTS_REACHED') });
    return { nextData: state.stepData };
  }
  
  dispatch({ 
    type: 'SET_FLOW_ERROR', 
    payload: t('errors.PIN_INVALID_ATTEMPTS', { count: (MAX_PIN_ATTEMPTS - attempts).toString() }) 
  });
  
  return { nextData: state.stepData };
};

/**
 * Handles the PIN setup step in the authentication flow.
 * Creates a new PIN for the user.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const pinSetupHandler: StepHandler = async ({ state, payload, setPin, dispatch, t }) => {
  if (!payload.pin) throw new Error('PIN is required.');
  
  if (typeof setPin !== 'function') {
    throw new Error('setPin function not provided to handler context.');
  }
  
  const success = await setPin(payload.pin);
  if (success) {
    // PIN has been set and verified for this session
    return { nextData: { ...state.stepData, pinSet: true, pinVerified: true } };
  }
  
  // setPin already handles error dispatching
  return { nextData: state.stepData };
};

/**
 * Handles the email verification step in the authentication flow.
 * Sends an email OTP to the user's email address.
 * Part of the multi-factor authentication process.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const emailEntryHandler: StepHandler = async ({ state, payload, dispatch, t }) => {
  if (!payload.email) throw new Error('Email is required.');
  
  // On signup flow, check availability for email
  if (state.activeFlow?.type === AuthFlowType.SIGNUP) {
    const availability = await apiService.checkAvailability('email', payload.email);
    if (availability.statusCode !== 200) {
      if (availability.errorCode === ErrorCode.EMAIL_ALREADY_REGISTERED) {
        dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.EMAIL_ALREADY_REGISTERED') });
        return { nextStep: AUTH_STEP_EMAIL_ENTRY_PENDING, nextData: {} };
      }
      throw new Error(availability.message || 'Availability check failed.');
    }
  }
  
  try {
    // Get device info to include with the verification request
    const deviceInfo = await getDeviceInfo();
    
    const apiResponse = await apiService.sendOtp('email', payload.email);
    if (apiResponse?.statusCode !== 200) {
      throw new Error(apiResponse?.message || 'Failed to send verification email.');
    }
    
    const expires = apiResponse.data?.expires;
    
    return {
      nextStep: AUTH_STEP_EMAIL_OTP_PENDING,
      nextData: {
        ...state.stepData,
        email: payload.email,
        emailOtpExpires: expires, // Store email OTP expiry
      }
    };
  } catch (error: any) {
    // Handle specific errors
    if (error.message?.includes('expired') || error.statusCode === 401) {
      dispatch({
        type: 'SET_ERROR',
        error: t('auth.sessionExpired')
      });
      
      return {
        nextStep: AUTH_STEP_EMAIL_ENTRY_PENDING,
        nextData: {}
      };
    }
    
    // Re-throw other errors
    throw error;
  }
};

/**
 * Handles the email OTP verification step in the authentication flow.
 * Verifies the OTP entered by the user against the one sent to their email.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const emailOtpHandler: StepHandler = async ({ state, payload, dispatch, t }) => {
  if (!state.stepData.email) throw new Error('Email missing from step data.');
  if (!payload.emailCode) throw new Error('Email OTP (code) is required.');

  // Get device info to include with the verification request (optional, but good practice)
  // const deviceInfo = await getDeviceInfo(); 

  if (state.stepData.emailOtpExpires && Date.now() > state.stepData.emailOtpExpires) {
    warn('[StepHandler] Email OTP expired.');
    // Option: auto-trigger resend or let UI handle it
    // if (typeof resendEmailOtp === 'function') await resendEmailOtp(); 
    dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.OTP_EXPIRED') });
    return { nextData: state.stepData };
  }

  const apiResp = await apiService.verifyOtp('email', state.stepData.email, payload.emailCode);
  if (apiResp?.statusCode !== 200 || !apiResp.data?.emailVerified) {
    // Check for specific error codes from API if available, e.g., OTP_LOCKED
    if (apiResp?.error === ErrorCode.OTP_LOCKED) {
        dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.OTP_LOCKED') });
    } else if (apiResp?.error === ErrorCode.OTP_INVALID) {
        dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.OTP_INVALID') });
    } else {
        dispatch({ type: 'SET_FLOW_ERROR', payload: apiResp?.message || t('errors.EMAIL_OTP_VERIFICATION_FAILED') });
    }
    // Throw an error to be caught by advanceFlow, or return current state to allow retry
    // For now, let's throw to indicate a hard stop for this attempt.
    throw new Error(apiResp?.message || 'Email OTP verification failed.'); 
  }

  return {
    nextData: { 
      ...state.stepData, 
      emailVerified: true,
    }
  };
};

/**
 * Handles the token acquisition step in the authentication flow.
 * Requests a new token from the API after all verification steps are complete.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const tokenAcquisitionHandler: StepHandler = async ({ state, dispatch, t, scheduleLock, tokenManager }) => {
  info('[StepHandler] Acquiring tokens after verification');
  
  // Get device info to include with the token request
  const deviceInfo = await getDeviceInfo();
  
  try {
    if (!state.stepData.phone || !state.stepData.email) {
      throw new Error('Phone and email required for token acquisition');
    }
    
    // Use the dedicated token acquisition method
    const response = await apiService.acquireToken(
      state.stepData.phone,
      state.stepData.email,
      deviceInfo
    );
    
    if (response?.statusCode !== 200) {
      throw new Error(response?.message || 'Failed to acquire authentication token');
    }
    
    const authToken = response.data?.token;
    
    // Use tokenManager to handle token storage and state
    if (authToken) {
      info('[tokenAcquisitionHandler] token acquired:', authToken);
      await tokenManager.setTokens(authToken);
    }
    
    return {
      nextData: { 
        ...state.stepData,
        tokenValid: true 
      }
    };
  } catch (error) {
    logError("[TokenHandler] Failed to acquire tokens:", error);
    // Clear any existing token on failure
    await tokenManager.setTokens(null);
    dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.AUTH_FAILED') });
    return {
      nextStep: AUTH_STEP_TOKEN_ACQUISITION,
      nextData: state.stepData
    };
  }
};

export const STEP_HANDLERS: Partial<Record<NonNullAuthStep, StepHandler>> = {
  [AUTH_STEP_PHONE_ENTRY]: phoneEntryHandler,
  [AUTH_STEP_PHONE_OTP_PENDING]: phoneOtpHandler,
  [AUTH_STEP_PIN_ENTRY_PENDING]: pinEntryHandler,
  [AUTH_STEP_PIN_SETUP_PENDING]: pinSetupHandler,
  [AUTH_STEP_EMAIL_ENTRY_PENDING]: emailEntryHandler,
  [AUTH_STEP_EMAIL_OTP_PENDING]: emailOtpHandler,
  [AUTH_STEP_TOKEN_ACQUISITION]: tokenAcquisitionHandler,
};
