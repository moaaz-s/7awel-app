/**
 * useFlow.ts
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
 * @returns Object containing flow management functions
 */
import { useCallback } from 'react';
import { info, warn, error as logError } from '@/utils/logger';
import { AuthFlowType, getFlowTypeSteps, getNextValidIndex, FlowStep, FlowCtx } from '@/context/auth/flow/flowsOrchestrator';
import { STEP_HANDLERS, StepHandler } from '@/context/auth/flow/flowStepHandlers';
import { getItem as getSecureItem } from '@/utils/secure-storage';
import { isPinSet as serviceIsPinSet } from '@/utils/pin-service';
import { AUTH_TOKEN } from '@/constants/storage-keys';
import { isTokenExpired } from '@/utils/token-utils';
import { getSession } from '@/utils/storage';
import { FlowPayload, StepData } from '../auth-types';
import { getDeviceInfo } from '@/utils/device-fingerprint';
import { FlowService } from '@/services/flow-service';

/**
 * Custom hook for managing authentication flows.
 */
export function useFlow(
  state: any,
  dispatch: React.Dispatch<any>,
  t: (key: string, params?: Record<string, any>) => string
) {
  /**
   * Builds the flow context object used to determine step conditions.
   * 
   * @param data - Optional additional data to include in the context
   * @returns Promise resolving to FlowCtx context object
   */
  const buildFlowCtx = useCallback(async (data?: StepData): Promise<FlowCtx> => {
    return FlowService.buildFlowContext(data || state.stepData);
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
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      dispatch({ type: 'CLEAR_ERROR' });
      const flowInit = await FlowService.initiateFlow(flowType, initialData);
      
      dispatch({ type: 'SET_DEVICE_INFO', payload: flowInit.deviceInfo });

      dispatch({
        type: 'START_FLOW',
        payload: {
          type: flowType,
          initialIndex: flowInit.initialIndex,
          ...(initialData && { initialData })
        }
      });

      
      info(`[AuthFlow] Started flow: ${flowType}, first step: ${flowInit.initialIndex !== null ? flowInit.steps[flowInit.initialIndex].step : 'null'}`);
    } catch (error: any) {
      logError('[AuthFlow] Error initializing flow:', error);
      dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.FLOW_INIT_FAILED') });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, t]);

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

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      if (!state.currentStep) {
        throw new Error('advanceFlow called while currentStep is null');
      }
      
      const stepKey = state.currentStep;
      const handler = STEP_HANDLERS[stepKey as keyof typeof STEP_HANDLERS];
      
      if (!handler) {
        throw new Error(`No handler for step ${state.currentStep}`);
      }

      // Execute the handler
      const { nextData, nextStep: explicitNextStep } = await handler({ state, payload, dispatch, t });

      // Determine next step using FlowService
      const flow = state.activeFlow?.steps || [];
      const currIndex = state.activeFlow?.currentIndex ?? 0;
      
      let nextIdx: number | null = null;
      let nextStep: string | null = null;

      if (explicitNextStep) {
        // If handler returned an explicit step, find its index
        const explicitIndex = flow.findIndex((s: FlowStep) => s.step === explicitNextStep);
        if (explicitIndex !== -1) {
          nextIdx = explicitIndex;
          nextStep = explicitNextStep;
        } else {
          nextStep = explicitNextStep;
        }
      } else {
        // Use FlowService to determine next step
        const nextStepInfo = await FlowService.determineNextStep(
          flow,
          currIndex,
          nextData,
          payload
        );
        nextIdx = nextStepInfo.nextIndex;
        nextStep = nextStepInfo.nextStep;
      }

      info(`[AuthFlow] Advancing to index: ${nextIdx}`, "Next step:", nextStep, nextData);

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
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state, dispatch, t]);

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
