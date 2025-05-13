"use client";

/**
 * AuthContext.tsx
 * 
 * Main authentication context provider that integrates specialized hooks
 * for token management, PIN handling, and auth flow coordination.
 */
import React, { createContext, useReducer, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { info, warn, error as logError } from '@/utils/logger';
import { useLanguage } from '@/context/LanguageContext';
import { 
  AuthFlowType, 
  FlowCtx, 
  FlowStep,
  getNextValidIndex,
} from '@/constants/auth-flows';
import { AuthStep } from '@/constants/auth-steps';
import { apiService, OtpChannel } from '@/services/api-service';
import { removeItem as removeSecureItem, getItem as getSecureItem, setItem as setSecureItem } from '@/utils/secure-storage';
import { clearSession, getSession } from '@/utils/storage';
import { AUTH_TOKEN } from '@/constants/storage-keys';
import { AuthStatus } from './auth-state-machine';
import { 
  AuthContextType, 
  FlowPayload, 
  StepData 
} from './auth-types';
import { initialAuthState, authReducer } from './auth-reducer';
import { useTokenManager } from './hooks/useTokenManager';
import { usePinManager } from './hooks/usePinManager';
import { useAuthFlow } from './hooks/useAuthFlow';
import { isTokenExpired, getTokenInfo } from '@/utils/token';

// Create the context with undefined default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const router = useRouter();
  const { t } = useLanguage();

  // Initialize hooks with required dependencies
  const tokenManager = useTokenManager(
    dispatch, 
    (exp: number) => {}, // scheduleLock is no longer needed
    t
  );
  const pinManager = usePinManager(dispatch, t);
  const authFlow = useAuthFlow(
    state,
    dispatch,
    t,
    pinManager.setPin,
    () => {}, // Empty function since we don't use scheduleLock anymore
    async () => resendPhoneOtp(),
    tokenManager
  );

  // Initialize auth status
  useEffect(() => {
    const init = async () => {
      try {
        // Validate stored token
        const { authToken: token, isValid } = await tokenManager.checkTokens();
        if (!isValid || !token) {
          // Clear stale token and mark unauthenticated
          await tokenManager.setTokens(null);
          dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Unauthenticated });
        } else {
          // Store token in API client
          await tokenManager.setTokens(token);
          // Determine PIN & session state
          const pinExists = await pinManager.isPinSet();
          const session = await getSession();
          if (!pinExists) {
            dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.PinSetupPending });
          } else if (!session || session.expiresAt <= Date.now()) {
            dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.RequiresPin });
          } else {
            dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Authenticated });
          }
        }
      } catch (err) {
        logError('AuthContext init error:', err);
        dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Unauthenticated });
      }
    };
    init();
  }, [router]);

  // Auth methods
  const logout = useCallback(async () => {
    try {
      // Clear tokens
      await removeSecureItem(AUTH_TOKEN);
      
      // Clear session
      await clearSession();
      
      // Update state
      dispatch({ type: 'LOGOUT' });
      
      // Redirect to sign-in
      router.replace('/sign-in');
    } catch (err) {
      logError('Error during logout:', err);
    }
  }, [router]);

  const validatePin = useCallback(async (pin: string): Promise<boolean> => {
    return await pinManager.validatePin(pin);
  }, [pinManager]);

  const resendPhoneOtp = useCallback(async () => {
    dispatch({ type: 'CLEAR_ERROR' });
    if (!state.stepData.phone) {
      const errorMsg = t("errors.auth.missingPhoneForOtpResend");
      logError("[AuthContext] Cannot resend phone OTP: Phone number not found in stepData.");
      dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    info(`[AuthContext] Resending OTP to phone: ${state.stepData.phone}`);
    try {
      const channel = state.stepData.channel ?? OtpChannel.SMS;
      const response = await apiService.sendOtp('phone', state.stepData.phone, channel);
      if (response?.statusCode !== 200) {
        const errorMsg = response?.message || t("errors.auth.otpResendFailed");
        logError("[AuthContext] resendPhoneOtp failed:", response);
        dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
      } else {
        info("[AuthContext] Phone OTP resent successfully.");
        const expires = response.data?.expires;
        if (expires) {
          dispatch({ type: 'SET_STEP_DATA', payload: { ...state.stepData, otpExpires: expires } });
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || t("errors.auth.otpResendFailed");
      logError("[AuthContext] resendPhoneOtp error:", err);
      dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.stepData, dispatch, t]);

  const resendEmailOtp = useCallback(async (emailFromParam?: string) => {
    const emailToUse = emailFromParam || state.stepData.email;
    dispatch({ type: 'CLEAR_ERROR' });
    if (!emailToUse) {
      const errorMsg = t("errors.auth.missingEmailForOtpResend");
      logError("[AuthContext] Cannot resend email OTP: Email not found in stepData or params.");
      dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    info(`[AuthContext] Resending OTP to email: ${emailToUse}`);
    try {
      const response = await apiService.sendOtp('email', emailToUse);
      if (response?.statusCode !== 200) {
        const errorMsg = response?.message || t("errors.auth.emailOtpResendFailed");
        logError("[AuthContext] resendEmailOtp failed:", response);
        dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
      } else {
        info("[AuthContext] Email OTP resent successfully.");
        const expires = response.data?.expires;
        if (expires) {
          dispatch({ type: 'SET_STEP_DATA', payload: { ...state.stepData, email: emailToUse, emailOtpExpires: expires } });
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || t("errors.auth.emailOtpResendFailed");
      logError("[AuthContext] resendEmailOtp error:", err);
      dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.stepData, dispatch, t]);

  // Flow management
  const initiateFlow = useCallback((flowType: AuthFlowType) => {
    authFlow.initiateFlow(flowType);
  }, [authFlow]);

  const advanceFlow = useCallback(async (payload: FlowPayload) => {
    await authFlow.advanceFlow(payload);
  }, [authFlow]);

  const forgotPin = useCallback(async () => {
    info('[AuthContext] Initiating PIN reset flow');
    await setSecureItem('PIN_FORGOT', "true");
    await pinManager.clearPin();
    initiateFlow(AuthFlowType.FORGOT_PIN);
    router.push('/sign-in');
  }, [initiateFlow, router, pinManager]);

  const lock = useCallback(() => {
    info('[AuthContext] Locking session');
    dispatch({ type: 'LOCKOUT', payload: 'Session locked.' });
  }, [dispatch]);

  const value: AuthContextType = {
    ...state,
    validatePin,
    setPin: pinManager.setPin,
    checkPin: pinManager.checkPin,
    logout,
    resendPhoneOtp,
    resendEmailOtp,
    initiateFlow,
    advanceFlow,
    forgotPin,
    lock,
    setAuthToken: tokenManager.setTokens,
    clearAuthToken: () => tokenManager.setTokens(null),
    getAuthToken: async () => (await tokenManager.checkTokens()).authToken,
  };

  return (
    <AuthContext.Provider value={value}>
      <AuthDispatchContext.Provider value={dispatch}>
        {children}
      </AuthDispatchContext.Provider>
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Context to expose the dispatch function directly
const AuthDispatchContext = createContext<React.Dispatch<any> | undefined>(undefined);

/**
 * Hook to access the Auth dispatch function directly
 * Use this when you need to dispatch actions without the entire Auth context
 */
export function useAuthDispatch() {
  const dispatch = useContext(AuthDispatchContext);
  if (!dispatch) {
    throw new Error('useAuthDispatch must be used within an AuthProvider');
  }
  return dispatch;
}

export default AuthProvider;
