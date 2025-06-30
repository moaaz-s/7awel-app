/**
 * AuthContext.tsx
 * 
 * Main authentication context provider that integrates specialized hooks
 * for token management, PIN handling, and auth flow coordination.
 */
import React, { createContext, useContext, useCallback, useEffect, useReducer, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { info, error as logError } from '@/utils/logger';
import { useSessionManagement } from '@/context/auth/hooks/useSessionManagement';
import { SessionService } from '@/services/session-service';
import { ErrorCode } from '@/types/errors';

import { 
  AUTH_STEP_AUTHENTICATED,
} from '@/context/auth/flow/flowSteps';
import { AuthStatus } from './auth-state-machine';
import { 
  AuthContextType, 
  AuthFlowState,
  FlowPayload
} from './auth-types';
import { initialAuthState, authReducer } from './auth-reducer';
import { httpClient } from '@/services/httpClients/base';
import { initAndValidate, signOut as serviceLogout } from '@/utils/token-service';
import { useLanguage } from '@/context/LanguageContext';
import { 
  AuthFlowType, 
  buildFlowState, 
  advanceFlow as advanceFlowOrchestration,
  initiateFlow as initiateFlowOrchestration,
  FlowOrchestrationResult
} from '@/context/auth/flow/flowsOrchestrator';
import { clearPin } from '@/utils/pin-service';

// Create the context with undefined default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ============================================================================
  // State and Hooks
  // ============================================================================
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const router = useRouter();
  const { t } = useLanguage();

  const [isTokenReady, setIsTokenReady] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Initialize session management hook
  const { 
    lockSession, 
    unlockSession,
    isIdle,
    idleTimeRemaining 
  } = useSessionManagement(state, dispatch);

  // ============================================================================
  // Auth Status and Token Management
  // ============================================================================
  // Initialize auth status
  useEffect(() => {
    const init = async () => {
      try {
        if (authInitialized) return;
        setAuthInitialized(true);

        info('[AuthContext] Initializing interceptors...');
        // On 401/403, attempt token refresh before logout
        httpClient.initInterceptors(async () => {
          const ok = await initAndValidate();
          setIsTokenReady(ok);

          if (!ok) {
            logError('[AuthContext] Token expired, logging out', {
              state,
              isTokenReady,
              ok
            });
            // Token expired: clear tokens and prompt login
            await serviceLogout();
            dispatch({ type: 'LOGOUT' });
          }
        });
        
        info('[AuthContext] Initializing auth...');

        await initAndValidate();

        // eslint-disable-next-line prefer-const
        let {tokenExists, tokenValid, pinSetFlag} = await buildFlowState();

        info(`[AuthContext] Device has token: ${tokenExists}, token is expired: ${!tokenValid}`);

        if (!tokenExists || !tokenValid) { 
          info('[AuthContext] setting status to Unauthenticated');
          dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Unauthenticated });
          setIsTokenReady(false);
        } else {
          info('[AuthContext] Token found, initializing...');

          const authStatus = pinSetFlag ? AuthStatus.PinSetupPending: AuthStatus.RequiresPin;
          
          info(`[AuthContext] Setting auth status to: ${authStatus}`);

          dispatch({ type: 'SET_AUTH_STATUS', payload: authStatus });
          setIsTokenReady(true);
        }
      } catch (err) {
        logError('[AuthContext] init error:', err);
        dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Unauthenticated });
        setIsTokenReady(false);
      }
    };
    init();
  }, [router, dispatch, state, isTokenReady, authInitialized]);

  // ============================================================================
  // Session Methods
  // ============================================================================

  /**
   * Hard logout - clears everything including PIN and local data
   * Used when user explicitly chooses to log out
   */
  const hardLogout = useCallback(async () => {
    info('[AuthContext] Performing hard logout - clearing all data');
    
    try {
      
      // Clear session data
      await SessionService.voidSession();
      dispatch({ type: 'CLEAR_SESSION' });
      
      // TODO: Clear all data stored locally
      
      // Clear PIN
      await clearPin();

      // Clear stored tokens & terminate remote auth token session
      await serviceLogout();
      
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

  // ============================================================================
  // Flow Management
  // ============================================================================

  // Flow management
  const initiateFlow = useCallback((flowType: AuthFlowType, initialData?: Partial<AuthFlowState>) => {
    info(`[AuthContext] Initiating flow: ${flowType}`);
    
    // Check if we're re-entering the same flow - if so, just reset
    if (state.activeFlow?.type === flowType) {
      info('[AuthContext] Re-entering same flow, resetting to initial step');
      dispatch({ type: 'END_FLOW' });
    }

    
    // Use orchestration function to initialize flow (now async)
    const initFlowAsync = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const flowConfig = await initiateFlowOrchestration(flowType, initialData);
        
        // Check for initialization errors
        if (!flowConfig.success) {
          logError('[AuthContext] Failed to initialize flow:', flowConfig.errorCode);
          dispatch({ type: 'SET_FLOW_ERROR', payload: 'Failed to initialize flow' });
          return;
        }
        
        dispatch({
          type: 'START_FLOW',
          payload: {
            type: flowConfig.flowType,
            initialData: flowConfig.flowState,
            initialIndex: flowConfig.currentStepIndex
          }
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    initFlowAsync();
  }, [state.activeFlow?.type, dispatch]);

  /**
   * Advance the authentication flow to the next step
   * Uses the orchestration function which handles both side effects and pure logic
   */
  const advanceFlow = useCallback(async (payload: FlowPayload) => {
    dispatch({ type: 'CLEAR_ERROR' });
    info(`[advanceFlow] Advancing flow from step: ${state.currentStep}`, "Payload:", payload);
    
    // Set loading state
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      if (!state.currentStep) {
        throw new Error('[advanceFlow] called while currentStep is null');
      }
      
      // Get current flow steps
      const flowSteps = state.activeFlow?.steps || [];
      
      // Use orchestration function to advance flow (handles both side effects and pure logic)
      const orchestrationResult: FlowOrchestrationResult = await advanceFlowOrchestration(
        state.currentStep,
        state.flowState,
        payload,
        flowSteps
      );
      
      // Handle orchestration errors
      if (!orchestrationResult.success) {
        const errorMessage = orchestrationResult.errorCode 
          ? t(`errors.${orchestrationResult.errorCode}`) 
          : 'An error occurred';
        throw new Error(errorMessage);
      }
      
      // Update state with orchestration result
      if (orchestrationResult.flowState) {
        dispatch({
          type: 'SET_FLOW_STATE',
          payload: orchestrationResult.flowState
        });
      }
      
      // TODO: Check if correct (when session is returned?)
      // Handle session if returned
      if (orchestrationResult.session) {
        dispatch({ type: 'SET_SESSION', payload: orchestrationResult.session });
        dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Authenticated });
      }
      
      if (orchestrationResult.nextStep) {
        // Find the index of the next step in the flow
        const nextIndex = flowSteps.findIndex(s => s.step === orchestrationResult.nextStep);
        
        dispatch({
          type: 'ADVANCE_STEP',
          payload: {
            nextStep: orchestrationResult.nextStep,
            nextData: orchestrationResult.flowState || state.flowState,
            nextIndex: nextIndex >= 0 ? nextIndex : 0
          }
        });
        
        // Check if we've reached the end
        if (orchestrationResult.nextStep === AUTH_STEP_AUTHENTICATED) {
          dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Authenticated });
        }
      }
      
      info('[AuthContext] Advanced flow', {
        from: state.currentStep,
        to: orchestrationResult.nextStep,
        flowState: orchestrationResult.flowState
      });
      
    } catch (error: any) {
      logError("[AuthContext] Flow advance error:", error);
      dispatch({ type: 'SET_FLOW_ERROR', payload: error.message || 'An error occurred' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state, dispatch, t]);


  // ============================================================================
  // Context Value
  // ============================================================================
  const value: AuthContextType = {
    ...state,
    isTokenReady,
    initiateFlow,
    advanceFlow,
    // Token actions
    hardLogout,
    lockSession,
    unlockSession,
    isIdle,
    idleTimeRemaining
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
