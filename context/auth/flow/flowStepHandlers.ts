import { AuthStep, AUTH_STEP_PHONE_ENTRY, AUTH_STEP_PHONE_OTP_PENDING, AUTH_STEP_EMAIL_ENTRY_PENDING, AUTH_STEP_EMAIL_OTP_PENDING, AUTH_STEP_TOKEN_ACQUISITION, AUTH_STEP_USER_PROFILE_PENDING, AUTH_STEP_PIN_SETUP_PENDING, AUTH_STEP_PIN_ENTRY_PENDING } from '@/context/auth/flow/flowSteps';
import { OtpChannel } from '@/services/api-service';
import { StepData, FlowPayload } from '../auth-types';
import { info, warn, error as logError } from '@/utils/logger';
import { ErrorCode } from '@/types/errors'; 
import { AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { validatePin as serviceValidatePin, setPin as serviceSetPin } from '@/utils/pin-service';
import { acquireTokens } from '@/utils/token-service';
import { userService } from '@/services/user-service';
import { authService } from '@/services/auth-service';

export interface StepHandlerCtx {
  state: any; 
  payload: FlowPayload;
  dispatch: React.Dispatch<any>;
  t: (key: string, params?: Record<string, any>) => string;
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
  const { countryCode, phoneNumber, channel: payloadChannel } = payload;
  if (!countryCode || !phoneNumber) throw new Error('Country code and phone number are required.');
  const fullPhone = countryCode + phoneNumber;
  
  // Check if the phone number is available (not already taken)
  let endpoint = state.activeFlow?.type === AuthFlowType.SIGNUP?
    authService.sendOtpSignup
    : 
    authService.sendOtpSignin;
  
  const selectedChannel = payloadChannel ?? OtpChannel.SMS;
  info(`[StepHandler] sendOtp phone: ${fullPhone}, channel: ${selectedChannel}`);
  
  const apiResponse = await endpoint('phone', fullPhone, selectedChannel);
  if (apiResponse.error || !apiResponse.data) {
    dispatch({ type: 'SET_FLOW_ERROR', payload: t(apiResponse.errorCode || ErrorCode.UNKNOWN) });
    return { nextStep: AUTH_STEP_PHONE_ENTRY, nextData: state.stepData };
  }
  const expires = apiResponse.data?.expires;
  
  // Make sure we set phoneValidated to true here to ensure OTP verification is required
  return {
    nextStep: AUTH_STEP_PHONE_OTP_PENDING,
    nextData: {
      countryCode,
      phoneNumber,
      phone: fullPhone,
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
  
  let error: string | null = null;
  
  if (state.stepData.otpExpires && Date.now() > state.stepData.otpExpires) {
    warn('[StepHandler] OTP expired.');
    error = t('errors.OTP_EXPIRED');
  }
  
  if (!error) {
    const apiResponse = await authService.verifyOtpUnauthenticated('phone', state.stepData.phone, payload.otp);
    if (apiResponse.error || !apiResponse.data) {
      warn('[StepHandler] Phone OTP failed verification.');
      error = t(apiResponse.errorCode || ErrorCode.UNKNOWN);
    }
  }

  if (error) {
    dispatch({ type: 'SET_FLOW_ERROR', payload: error });
    return { nextStep: AUTH_STEP_PHONE_OTP_PENDING, nextData: state.stepData };
  }

  // Return updated state data with phone validated flag
  return { 
    nextData: { 
      ...state.stepData, 
      phoneValidated: true,
    } 
  };
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
  
  // Check if the email is available (not already taken)
  let endpoint = state.activeFlow?.type === AuthFlowType.SIGNUP?
    authService.sendOtpSignup
    : 
    authService.sendOtpSignin;
  
  try {
    const apiResponse = await endpoint('email', payload.email, undefined);
    if (apiResponse.error || !apiResponse.data) {
      dispatch({ type: 'SET_FLOW_ERROR', payload: t(apiResponse.errorCode || ErrorCode.UNKNOWN) });
      return { nextStep: AUTH_STEP_EMAIL_ENTRY_PENDING, nextData: state.stepData };
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

  let error: string | null = null;
  if (state.stepData.emailOtpExpires && Date.now() > state.stepData.emailOtpExpires) {
    warn('[StepHandler] Email OTP expired.');
    error = t('errors.OTP_EXPIRED');
  }

  if (!error) {
    const apiResp = await authService.verifyOtpUnauthenticated('email', state.stepData.email, payload.emailCode);
    if (apiResp.error || !apiResp.data) {
      warn('[StepHandler] Email OTP failed verification.');
      error = t(apiResp.errorCode || ErrorCode.UNKNOWN);
    }
  }

  if (error) {
    dispatch({ type: 'SET_FLOW_ERROR', payload: error });
    return { nextStep: AUTH_STEP_EMAIL_OTP_PENDING, nextData: state.stepData };
  }

  // Return updated state data with phone validated flag
  return { 
    nextData: { 
      ...state.stepData, 
      emailVerified: true,
    } 
  };
};

/**
 * Handles the user profile submission step in the authentication flow.
 */
const userProfileHandler: StepHandler = async ({ state, payload, dispatch, t }) => {
  const { firstName, lastName, address, dob, country, gender } = payload;
  
  const response = await userService.updateUser({ firstName, lastName, address, dob, country, gender });
  if (response?.error || !response?.data) {
    dispatch({ type: 'SET_FLOW_ERROR', payload: response?.errorCode || t('errors.USER_PROFILE_UPDATE_FAILED') });
    return { nextStep: AUTH_STEP_USER_PROFILE_PENDING, nextData: state.stepData };
  }

  return {
    nextStep: AUTH_STEP_PIN_SETUP_PENDING,
    nextData: { ...state.stepData, firstName, lastName, address }
  };
};

/**
 * Handles the token acquisition step in the authentication flow.
 * Requests a new token from the API after all verification steps are complete.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const tokenAcquisitionHandler: StepHandler = async ({ state, dispatch, t }) => {
  info('[StepHandler] Acquiring tokens after verification');
  
  try {
    // TODO: This is already verified in the conditions leading to this step.
    // Should be removed.
    if (!state.stepData.phone || !state.stepData.email) {
      throw new Error('Phone and email required for token acquisition');
    }
    
    // Use the dedicated token acquisition method
    const tokensAcquired = await acquireTokens(
      state.stepData.phone,
      state.stepData.email
    );
    
    if (!tokensAcquired) {
      throw new Error('Failed to acquire authentication token');
    }
    
    // Fetch user data after token acquisition
    let userData = {};
    
    // TODO: Check if registration flow?
    // if (state.activeFlow?.type === AuthFlowType.SIGNUP) {
      const userResponse = await userService.getUser();
      if (userResponse?.data?.user) {
        const { firstName, lastName, address } = userResponse.data.user;
        userData = { firstName, lastName, address };
      }
    // }
    
    return { nextData: { ...state.stepData, tokenValid: true, ...userData } };
  } catch (error) {
    logError("[TokenHandler] Failed to acquire tokens:", error);
    dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.AUTH_FAILED') });
    return {
      nextStep: AUTH_STEP_TOKEN_ACQUISITION,
      nextData: state.stepData
    };
  }
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
  
  // Centralized PIN validation
  const result = await serviceValidatePin(payload.pin);
  if (result.valid) {
    return { nextData: { ...state.stepData, pinVerified: true, pinSet: true } };
  }
  // Invalid but not locked
  dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.PIN_INVALID', { count: (result.attemptsRemaining ?? 0).toString() }) });
  return { nextStep: AUTH_STEP_PIN_ENTRY_PENDING, nextData: state.stepData };
};

/**
 * Handles the PIN setup step in the authentication flow.
 * Creates a new PIN for the user.
 * 
 * @param ctx - Context object containing state, payload, and functions
 * @returns Promise resolving to a StepResult with updated data
 */
const pinSetupHandler: StepHandler = async ({ state, payload, dispatch, t }) => {
  if (!payload.pin) throw new Error('PIN is required.');
  try {
    await serviceSetPin(payload.pin);
    return { nextData: { ...state.stepData, pinSet: true, pinVerified: true } };
  } catch (err) {
    dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.PIN_SETUP_FAILED') });
    return { nextData: state.stepData };
  }
};

export const STEP_HANDLERS: Partial<Record<NonNullAuthStep, StepHandler>> = {
  [AUTH_STEP_PHONE_ENTRY]: phoneEntryHandler,
  [AUTH_STEP_PHONE_OTP_PENDING]: phoneOtpHandler,
  [AUTH_STEP_EMAIL_ENTRY_PENDING]: emailEntryHandler,
  [AUTH_STEP_EMAIL_OTP_PENDING]: emailOtpHandler,
  [AUTH_STEP_TOKEN_ACQUISITION]: tokenAcquisitionHandler,
  [AUTH_STEP_USER_PROFILE_PENDING]: userProfileHandler,
  [AUTH_STEP_PIN_SETUP_PENDING]: pinSetupHandler,
  [AUTH_STEP_PIN_ENTRY_PENDING]: pinEntryHandler,
};
