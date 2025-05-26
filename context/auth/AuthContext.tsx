"use client";

/**
 * AuthContext.tsx
 * 
 * Main authentication context provider that integrates specialized hooks
 * for token management, PIN handling, and auth flow coordination.
 */
import React, { createContext, useReducer, useContext, useEffect, useCallback, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { info, warn, error as logError } from '@/utils/logger';
import { useLanguage } from '@/context/LanguageContext';
import { 
  AuthFlowType, 

} from '@/context/auth/flow/flowsOrchestrator';
import { apiService, OtpChannel } from '@/services/api-service';
import { clearSession, getSession } from '@/utils/storage';
import { AUTH_STEP_TOKEN_ACQUISITION } from '@/context/auth/flow/flowSteps';
import { AuthStatus } from './auth-state-machine';
import { 
  AuthContextType, 
  FlowPayload, 
  StepData 
} from './auth-types';
import { initialAuthState, authReducer } from './auth-reducer';
import { usePinManager } from './hooks/usePinManager';
import { useFlow } from './flow/useFlow';
import { httpClient } from '@/services/http-client';
import { initAndValidate, signIn as serviceSignIn, signOut as serviceLogout } from '@/utils/token-service';

// Create the context with undefined default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const router = useRouter();
  const { t } = useLanguage();

  const [isTokenReady, setIsTokenReady] = useState(false);

  // Initialize hooks with required dependencies (token logic moved to token-service)
  const pinManager = usePinManager(dispatch, t);
  const authFlow = useFlow(state, dispatch, t);

  // Initialize auth status
  useEffect(() => {
    const init = async () => {
      try {
        const isValidToken = await initAndValidate();
        setIsTokenReady(isValidToken);

        if (!isValidToken) {
          dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Unauthenticated });
        } else {
          // Determine PIN & session state
          const pinExists = await pinManager.isPinSet();
          const session = await getSession();
          if (!pinExists) {
            dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.PinSetupPending });
          } else if (!session || session.expiresAt <= Date.now()) {
            // Check PIN lockout state
            if (await pinManager.isLocked()) {
              // If we set AuthStatus to Locked, it will trigger the GlobalLockScreen.tsx wrapper component which is not a great UX.
              dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.RequiresPin });
            } else {
              dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.RequiresPin });
            }
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

  // Soft logout - clears session but preserves PIN & local data
  const softLogout = useCallback(async () => {
    info('[AuthContext] Performing soft logout - clearing session only');
    
    try {
      // Clear session data (but not PIN or local data)
      await clearSession();
      
      // Update state to logged out
      dispatch({ type: 'LOGOUT' });
      
      info('[AuthContext] Soft logout completed');
    } catch (error) {
      logError('[AuthContext] Error during soft logout:', error);
      // Even if there's an error, ensure we clear the auth state
      dispatch({ type: 'LOGOUT' });
    }
  }, [dispatch]);

  /**
   * Hard logout - clears everything including PIN and local data
   * Used when user explicitly chooses to log out
   */
  const hardLogout = useCallback(async () => {
    info('[AuthContext] Performing hard logout - clearing all data');
    
    try {
      // Clear stored tokens & terminate remote auth token session
      await serviceLogout();
      
      // Clear session data
      await clearSession();
      
      // Clear all local data (user profile, transactions, etc.)
      const { getStorageManager } = await import('@/services/storage-manager');
      const storage = getStorageManager();
      await storage.clearAll();
      
      // Clear PIN
      await pinManager.clearPin();
      
      // Register logout event (for analytics/audit)
      info('[AuthContext] Hard logout completed, all data cleared');
      
      // Update state to logged out
      dispatch({ type: 'LOGOUT' });
      
      // AppInitializer will handle navigation to signin page
    } catch (error) {
      logError('[AuthContext] Error during hard logout:', error);
      // Even if there's an error, ensure we clear the auth state
      dispatch({ type: 'LOGOUT' });
    }
  }, [dispatch]);

  useEffect(() => {
    // On 401/403, attempt token refresh before logout
    httpClient.initInterceptors(async () => {
      const ok = await initAndValidate();
      setIsTokenReady(ok);

      if (!ok) softLogout();
    });
  }, [softLogout]);

  const validatePin = useCallback(async (pin: string): Promise<boolean> => {
    return await pinManager.validatePin(pin);
  }, [pinManager]);

  const resendPhoneOtp = useCallback(async () => {
    dispatch({ type: 'CLEAR_ERROR' });
    if (!state.stepData.phone) {
      const errorMsg = t("uiErrors.phoneMissing");
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
        const errorMsg = response?.message || t("errors.OTP_RESEND_FAILED");
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
      const errorMsg = err.message || t("errors.OTP_RESEND_FAILED");
      logError("[AuthContext] resendPhoneOtp error:", err);
      dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.stepData, dispatch, t]);

  const resendEmailOtp = useCallback(async () => {
    const emailToUse = state.stepData.email;
    dispatch({ type: 'CLEAR_ERROR' });
    if (!emailToUse) {
      const errorMsg = t("uiErrors.missingEmail");
      logError("[AuthContext] Cannot resend email OTP: Email not found in stepData or params.");
      dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
      return;
    }
    dispatch({ type: 'SET_LOADING', payload: true });
    info(`[AuthContext] Resending OTP to email: ${emailToUse}`);
    try {
      const response = await apiService.sendOtp('email', emailToUse);
      if (response?.statusCode !== 200) {
        const errorMsg = response?.message || t("errors.OTP_RESEND_FAILED");
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
      const errorMsg = err.message || t("errors.OTP_RESEND_FAILED");
      logError("[AuthContext] resendEmailOtp error:", err);
      dispatch({ type: 'SET_FLOW_ERROR', payload: errorMsg });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.stepData.email, dispatch, t]);

  // Flow management
  const initiateFlow = useCallback((flowType: AuthFlowType, initialData?: StepData) => {
    authFlow.initiateFlow(flowType, initialData);
  }, [authFlow]);

  const advanceFlow = useCallback(async (payload: FlowPayload) => {
    await authFlow.advanceFlow(payload);
  }, [authFlow]);

  // Mark PIN-forgot flow: clear PIN; navigation happens in AppInitializer or SignIn page
  const forgotPin = useCallback(async () => {
    info('[AuthContext] Initiating PIN reset flow');
    await pinManager.setPinForgotten();
  }, [pinManager]);

  // Update status on token acquisition
  useEffect(() => {
    async function updateStatus() {
      const isValidToken = await initAndValidate();
      setIsTokenReady(isValidToken);

      if (isValidToken) {
        dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Authenticated });
      }
    }

    if (state.currentStep === AUTH_STEP_TOKEN_ACQUISITION) {
      updateStatus();
    }
  }, [state.currentStep, dispatch]);

  const value: AuthContextType = {
    ...state,
    isTokenReady,
    validatePin,
    setPin: pinManager.setPin,
    checkPin: pinManager.checkPin,
    resetAttempts: pinManager.resetAttempts,
    resendPhoneOtp,
    resendEmailOtp,
    initiateFlow,
    advanceFlow,
    forgotPin,
    // Token actions
    signIn: serviceSignIn,
    softLogout,
    hardLogout,
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
