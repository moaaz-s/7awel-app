/**
 * useAuthFlow.ts
 * 
 * Custom hook for managing authentication flows.
 * 
 * This hook coordinates the entire authentication process, from flow initialization
 * to step progression, context building, and token acquisition. It implements the 
 * declarative flow engine pattern where each authentication flow is defined as a
 * series of steps with conditions determining their execution.
 * 
 * @param state - Current authentication state
 * @param dispatch - Auth reducer dispatch function
 * @param t - Translation function
 * @param setPin - Function to set PIN
 * @param scheduleLock - Function to schedule app locking
 * @param resendPhoneOtp - Function to resend phone OTP
 * @param tokenManager - Token manager instance for token operations
 * @returns Object containing flow management functions
 */
import { useCallback } from 'react';
import { info, warn, error as logError } from '@/utils/logger';
import { AuthFlowType, getFlowTypeSteps, getNextValidIndex, FlowStep, FlowCtx } from '@/constants/auth-flows';
import { STEP_HANDLERS, StepHandler } from '@/context/auth-step-handlers';
import { getItem as getSecureItem } from '@/utils/secure-storage';
import { getPinHash } from '@/utils/storage';
import { AUTH_TOKEN } from '@/constants/storage-keys';
import { isTokenExpired } from '@/utils/token';
import { getSession } from '@/utils/storage';
import { FlowPayload, StepData } from '../auth-types';
import { getDeviceInfo } from '@/utils/device-fingerprint';
import { useTokenManager } from './useTokenManager';

/**
 * Custom hook for managing authentication flows.
 */
export function useAuthFlow(
  state: any,
  dispatch: React.Dispatch<any>,
  t: (key: string, params?: Record<string, any>) => string,
  setPin: (pin: string) => Promise<boolean>,
  scheduleLock: (exp: number) => void,
  resendPhoneOtp: () => Promise<void>,
  tokenManager: ReturnType<typeof useTokenManager> 
) {
  /**
   * Builds the flow context object used to determine step conditions.
   * 
   * @param data - Optional additional data to include in the context
   * @returns Promise resolving to FlowCtx context object
   */
  const buildFlowCtx = useCallback(async (data?: StepData): Promise<FlowCtx> => {
    // Check local session validity
    const session = await getSession();
    const sessionActive = Boolean(session && session.expiresAt > Date.now());
    // Validate token exists and isn't expired
    const authToken = await getSecureItem(AUTH_TOKEN);
    // Validate token exists and isn't expired
    const tokenValid = Boolean(authToken) && !isTokenExpired(authToken);
    const pinHash = await getPinHash();
    const stepData = data || state.stepData;
    return {
      tokenValid,
      phoneValidated: Boolean(stepData.phoneValidated),
      emailVerified: Boolean(stepData.emailVerified),
      pinSet: Boolean(pinHash) || Boolean(stepData.pinSet),
      pinVerified: Boolean(stepData.pinVerified),
      sessionActive,
      // Add expiration timestamps
      otpExpiry: stepData.otpExpires,
      emailOtpExpiry: stepData.emailOtpExpires
    };
  }, [state.stepData]);

  /**
   * Initiates a new authentication flow.
   * 
   * This function collects device information, clears any existing errors,
   * determines the appropriate flow steps based on the flow type, and
   * dispatches actions to update the auth state.
   * 
   * @param flowType - Type of authentication flow to initiate (signup, signin, etc.)
   * @param initialData - Optional initial data for the flow
   * @returns Promise that resolves when flow is initiated
   */
  const initiateFlow = useCallback(async (flowType: AuthFlowType, initialData?: StepData) => {
    info(`[AuthFlow] Initiating flow: ${flowType}`);
    
    // Explicitly set loading to true during initialization
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Get device information for the flow
      const deviceInfo = await getDeviceInfo();
      dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
      
      // Clear any previous errors
      dispatch({ type: 'CLEAR_ERROR' });
      
      // Build flow context
      const ctx = await buildFlowCtx();
      
      // Get complete flow steps without filtering to avoid premature step filtering
      const steps = getFlowTypeSteps(flowType);
      
      if (steps.length === 0) {
        throw new Error(`No valid steps for flow: ${flowType}`);
      }
      
      // Determine the first step / -1 is exceptional to account for the fact that there is no previous step
      const initialIndex = getNextValidIndex(steps, -1, ctx);
      
      // Start the flow
      dispatch({
        type: 'START_FLOW',
        payload: {
          type: flowType,
          initialIndex,
          ...(initialData && { initialData })
        }
      });
      
      info(`[AuthFlow] Started flow: ${flowType}, first step: ${initialIndex !== null ? steps[initialIndex].step : 'null'}`);
    } catch (error: any) {
      logError('[AuthFlow] Error initializing flow:', error);
      dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.FLOW_INIT_FAILED') });
    } finally {
      // Always set loading to false when initialization is complete,
      // regardless of success or failure
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, buildFlowCtx, t]);

  /**
   * Advances the current authentication flow to the next step.
   * 
   * This function:
   * 1. Clears existing errors
   * 2. Executes the current step handler with the provided payload
   * 3. Determines the next valid step based on the flow definition and context
   * 4. Updates the auth state with the next step
   * 
   * @param payload - Data required for the current step
   * @returns Promise that resolves when flow is advanced
   */
  const advanceFlow = useCallback(async (payload: FlowPayload) => {
    dispatch({ type: 'CLEAR_ERROR' });
    info(`[AuthFlow] Advancing flow from step: ${state.currentStep}`, "Payload:", payload);

    // Set loading state to true during the step transition
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      if (!state.currentStep) {
        throw new Error('advanceFlow called while currentStep is null');
      }
      
      const stepKey = state.currentStep;
      const handler = STEP_HANDLERS[stepKey as keyof typeof STEP_HANDLERS] as StepHandler | undefined;
      
      info("[AuthFlow] Steps:", state.activeFlow?.steps);
      info("[AuthFlow] Current step:", stepKey, payload);
      info("[AuthFlow] Handler:", handler);

      if (!handler) {
        throw new Error(`No handler for step ${state.currentStep}`);
      }

      // Execute the handler which returns only nextData
      const { nextData, nextStep: explicitNextStep } = await handler({
        state,
        payload,
        dispatch,
        t,
        scheduleLock,
        setPin,
        resendPhoneOtp,
        tokenManager 
      });

      // Use the updated nextData to build the flow context
      const updatedCtx = await buildFlowCtx(nextData);
      const flow = state.activeFlow?.steps || [];
      const currIndex = state.activeFlow?.currentIndex ?? 0;
      
      // Get the next valid step based on the updated context
      const nextIdx = getNextValidIndex(flow, currIndex, updatedCtx);
      
      // Determine the next step from the flow definition
      const nextStep = explicitNextStep || (nextIdx !== null ? flow[nextIdx].step : null);

      info(`[AuthFlow] Advancing to index: ${nextIdx}`, "Next step:", nextStep, nextData);

      // Dispatch with the determined next step
      dispatch({ 
        type: 'ADVANCE_STEP', 
        payload: { 
          nextStep, 
          nextData, 
          nextIndex: nextIdx 
        } 
      });

    } catch (error: any) {
      logError("[AuthFlow] Error in advanceFlow:", error);
      dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.UNKNOWN_ERROR') });
    } finally {
      // Always set loading to false when the step transition is complete,
      // regardless of success or failure
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state, dispatch, buildFlowCtx, t, scheduleLock, setPin, resendPhoneOtp, tokenManager]);

  /**
   * End the current flow and reset flow state
   */
  const endFlow = useCallback(() => {
    dispatch({ type: 'END_FLOW' });
    info('[AuthFlow] Flow ended.');
  }, [dispatch]);

  return {
    initiateFlow,
    advanceFlow,
    endFlow,
    buildFlowCtx
  };
}
