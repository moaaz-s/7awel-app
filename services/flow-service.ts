import { AuthFlowType, getFlowTypeSteps, getNextValidIndex, FlowStep, FlowCtx } from '@/context/auth/flow/flowsOrchestrator';
import { STEP_HANDLERS } from '@/context/auth/flow/flowStepHandlers';
import { getItem as getSecureItem } from '@/utils/secure-storage';
import { isPinSet } from '@/utils/pin-service';
import { AUTH_TOKEN } from '@/constants/storage-keys';
import { isTokenExpired } from '@/utils/token-utils';
import { getSession } from '@/utils/storage';
import { FlowPayload, StepData } from '@/context/auth/auth-types';
import { getDeviceInfo } from '@/utils/device-fingerprint';
import { info, error as logError } from '@/utils/logger';

export class FlowService {
  /**
   * Builds the flow context object used to determine step conditions.
   */
  static async buildFlowContext(stepData?: StepData): Promise<FlowCtx> {
    // Check local session validity
    const session = await getSession();
    const sessionActive = Boolean(session && session.expiresAt > Date.now());
    
    // Validate token exists and isn't expired
    const authToken = await getSecureItem(AUTH_TOKEN);
    const tokenValid = Boolean(authToken) && !isTokenExpired(authToken);
    
    const pinSetFlag = await isPinSet();
    
    return {
      tokenValid,
      phoneValidated: Boolean(stepData?.phoneValidated),
      emailVerified: Boolean(stepData?.emailVerified),
      pinSet: pinSetFlag || Boolean(stepData?.pinSet),
      pinVerified: Boolean(stepData?.pinVerified),
      sessionActive: sessionActive,
      // Add expiration timestamps
      otpExpiry: stepData?.otpExpires,
      emailOtpExpiry: stepData?.emailOtpExpires,
      // Add user profile data
      firstName: stepData?.firstName,
      lastName: stepData?.lastName
    };
  }

  /**
   * Initiates a new authentication flow.
   */
  static async initiateFlow(flowType: AuthFlowType, initialData?: StepData) {
    info(`[FlowService] Initiating flow: ${flowType}`);
    
    try {
      // Get device information for the flow
      const deviceInfo = await getDeviceInfo();
      
      // Build flow context
      const ctx = await this.buildFlowContext(initialData);
      
      // Get complete flow steps
      const steps = getFlowTypeSteps(flowType);
      
      if (steps.length === 0) {
        throw new Error(`No valid steps for flow: ${flowType}`);
      }
      
      // Determine the first step
      const initialIndex = getNextValidIndex(steps, -1, ctx);
      
      return {
        type: flowType,
        initialIndex,
        deviceInfo,
        steps,
        initialData
      };
    } catch (err: any) {
      logError('[FlowService] Error initializing flow:', err);
      throw err;
    }
  }

  /**
   * Determines the next step in the flow based on current state and context
   */
  static async determineNextStep(
    flow: FlowStep[],
    currentIndex: number,
    stepData: StepData,
    payload: FlowPayload
  ) {
    try {
      const currentStep = flow[currentIndex].step;
      const handler = STEP_HANDLERS[currentStep as keyof typeof STEP_HANDLERS];
      
      if (!handler) {
        throw new Error(`No handler for step ${currentStep}`);
      }

      // Build updated context with current step data
      const ctx = await this.buildFlowContext(stepData);
      
      // Get next valid step index based on context
      const nextIdx = getNextValidIndex(flow, currentIndex, ctx);
      const nextStep = nextIdx !== null ? flow[nextIdx].step : null;

      return {
        nextStep,
        nextIndex: nextIdx,
        context: ctx
      };
    } catch (err: any) {
      logError('[FlowService] Error determining next step:', err);
      throw err;
    }
  }

  /**
   * Validates if a step transition is allowed
   */
  static async validateStepTransition(
    fromStep: string,
    toStep: string,
    context: FlowCtx
  ): Promise<boolean> {
    // Add custom validation logic here
    return true; // Placeholder implementation
  }
} 