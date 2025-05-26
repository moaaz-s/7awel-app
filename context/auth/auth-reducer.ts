/**
 * auth-reducer.ts
 * 
 * Pure reducer function for managing authentication state transitions.
 * Separated from the context to improve maintainability and testability.
 */
import { AuthStatus } from './auth-state-machine';
import { AuthState, AuthAction } from './auth-types';
import { AUTH_STEP_AUTHENTICATED } from '@/context/auth/flow/flowSteps';
import { getFlowTypeSteps, AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { error as logError, info } from '@/utils/logger';

/**
 * Initial authentication state
 */
export const initialAuthState: AuthState = {
  authStatus: AuthStatus.Initial, // Changed from Pending to Initial to match our enhanced enum
  isLoading: false, // Changed from true to false to prevent UI from being disabled on initial load
  isTokenReady: false,
  currentStep: null,
  activeFlow: null,
  stepData: {},
  error: null,
  deviceInfo: null
};

/**
 * Pure reducer function for authentication state management
 */
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_DEVICE_INFO':
      return {
        ...state,
        deviceInfo: action.payload
      };

    case 'START_FLOW': {
      const { type, initialData, initialIndex } = action.payload;
      
      const flowSteps = getFlowTypeSteps(type as AuthFlowType);
      const idx = (initialIndex != null && initialIndex >= 0 && initialIndex < flowSteps.length) ? initialIndex : 0;
      
      // If the first step is already AUTHENTICATED, set status immediately
      if (flowSteps[idx].step === AUTH_STEP_AUTHENTICATED) {
        return {
          ...state,
          authStatus: AuthStatus.Authenticated,
          isTokenReady: true,
          currentStep: AUTH_STEP_AUTHENTICATED,
          activeFlow: null,
          stepData: { ...state.stepData, ...initialData },
          error: null
        };
      }
      
      if (flowSteps.length === 0) {
        logError('[Auth Reducer] No valid steps for flow:', type);
        return {
          ...state,
          error: 'Failed to initialize authentication flow'
        };
      }
      
      return {
        ...state,
        activeFlow: { type, steps: flowSteps, currentIndex: idx },
        currentStep: flowSteps[idx].step,
        stepData: { ...state.stepData, ...initialData },
        error: null
      };
    }

    case 'ADVANCE_STEP': {
      const { nextStep, nextData, nextIndex } = action.payload;
      // Merge previous stepData with nextData for accurate auth checks
      const mergedData = { ...state.stepData, ...nextData };
      
      // If we've reached the authenticated step and have both token & pin, mark full auth
      if (nextStep === AUTH_STEP_AUTHENTICATED && mergedData.tokenValid && mergedData.pinSet) {
        return {
          ...state,
          authStatus: AuthStatus.Authenticated,
          isTokenReady: true,
          currentStep: nextStep,
          activeFlow: null,
          stepData: { ...state.stepData, ...nextData }
        };
      }
      
      // Some steps declare the next step explicitly (e.g. AUTH_STEP_PHONE_ENTRY)
      if (nextIndex === null && nextStep) {
        // If nextStep is explicitly provided, we're transitioning to a specific step
        // outside of the regular flow progression (e.g., to AUTH_STEP_AUTHENTICATED)
        info('[Auth Reducer] Transitioning to explicit step:', nextStep);
        return {
          ...state,
          currentStep: nextStep,
          stepData: {
            ...state.stepData,
            ...nextData
          },
          // Keep the flow active but with updated state
          activeFlow: state.activeFlow
            ? {
                ...state.activeFlow,
                // Don't update the index since we're outside normal progression
                currentIndex: state.activeFlow.currentIndex
              }
            : null
        };
      } else if (nextIndex === null) {
          // No valid next step and no explicit step provided - this is an error condition
          logError('[Auth Reducer] No valid next step found and no explicit step provided', {
            currentStep: state.currentStep,
            currentIndex: state.activeFlow?.currentIndex,
            flowType: state.activeFlow?.type,
            stepData: state.stepData
          });
          
          // Throw an error in development, but in production just end the flow gracefully
          if (process.env.NODE_ENV !== 'production') {
            throw new Error('Auth flow error: No valid next step found and no explicit step provided');
          }
          
          // In production, end the flow as gracefully as possible
          return {
            ...state,
            currentStep: null,
            stepData: {
              ...state.stepData,
              ...nextData
            },
            activeFlow: null, // Clear the active flow
            error: 'Flow ended unexpectedly. No valid next step found.'
          };
      }

      // Normal step advance
      return {
        ...state,
        currentStep: nextStep,
        stepData: {
          ...state.stepData,
          ...nextData
        },
        activeFlow: state.activeFlow
          ? {
              ...state.activeFlow,
              currentIndex: nextIndex
            }
          : null
      };
    }

    case 'SET_STEP_DATA':
      return {
        ...state,
        stepData: {
          ...state.stepData,
          ...action.payload
        }
      };

    case 'SET_FLOW_ERROR':
      return {
        ...state,
        error: action.payload
      };

    case 'END_FLOW':
      return {
        ...state,
        activeFlow: null,
        currentStep: null
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    case 'SET_AUTH_STATUS': // Handle Authenticated status
      if (action.payload === AuthStatus.Authenticated) {
        return {
          ...state,
          isTokenReady: true,
          authStatus: AuthStatus.Authenticated,
          currentStep: AUTH_STEP_AUTHENTICATED,
          activeFlow: null
        };
      }
      return {
        ...state,
        authStatus: action.payload
      };

    case 'LOGOUT':
      return {
        ...initialAuthState,
        authStatus: AuthStatus.Unauthenticated,
        isLoading: false,
        isTokenReady: false,
      };

    default:
      return state;
  }
}
