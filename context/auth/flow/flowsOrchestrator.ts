import {
  AuthStep,
  AUTH_STEP_PHONE_ENTRY,
  AUTH_STEP_PHONE_OTP_PENDING,
  AUTH_STEP_EMAIL_ENTRY_PENDING,
  AUTH_STEP_EMAIL_OTP_PENDING,
  AUTH_STEP_USER_PROFILE_PENDING,
  AUTH_STEP_WALLET_CREATION_PENDING,
  AUTH_STEP_PIN_SETUP_PENDING,
  AUTH_STEP_PIN_ENTRY_PENDING,
  AUTH_STEP_AUTHENTICATED,
  AUTH_STEP_TOKEN_ACQUISITION
} from './flowSteps';

import { AuthFlowState, FlowPayload, Session } from '@/context/auth/auth-types';
import { info, warn, error as logError } from '@/utils/logger';
import { checkTokenStatus } from '@/utils/token-service';
import { isPinSet as serviceIsPinSet } from '@/utils/pin-service';
import { userService } from '@/services/user-service';
import { executeStepSideEffects, SideEffectResult } from '../auth-side-effects';
import { ErrorCode } from '@/types/errors';
import { SessionService } from '@/services/session-service';

/* ------------------------------------------------------------------
 * Pure handler types and implementations
 * ------------------------------------------------------------------ */

type PureStepHandler = (state: AuthFlowState, payload: FlowPayload) => {
  nextStep?: AuthStep | null;
  nextData: Partial<AuthFlowState>;
};

// Pure handler for phone entry - prepares state for OTP sending
const phoneEntryHandler: PureStepHandler = (state, payload) => {
  const { countryCode, phoneNumber } = payload;
  
  // Validate input
  if (!countryCode || !phoneNumber)
    throw new Error('Country code and phone number are required.');
  
  // Prepare state for OTP step
  return {
    nextStep: AUTH_STEP_PHONE_OTP_PENDING,
    nextData: {
      ...state,
      phone: countryCode + phoneNumber,
      phoneNumber,
      countryCode,
      phoneValidated: false, // Will be true after OTP verification
    }
  };
};

// Pure handler for phone OTP verification - validates input and prepares for next step
const phoneOtpHandler: PureStepHandler = (state, payload) => {
  const { otp } = payload;
  
  if (!otp)
    throw new Error('OTP code is required.');
  
  // After successful OTP verification, move to email or token acquisition
  return {
    nextData: {
      ...state,
      phoneValidated: true,
      phoneOtpExpires: undefined, // Clear OTP expiry
    }
  };
};

// Pure handler for email entry - prepares state for email OTP
const emailEntryHandler: PureStepHandler = (state, payload) => {
  const { email } = payload;
  
  if (!email)
    throw new Error('Email is required.');
  
  return {
    nextStep: AUTH_STEP_EMAIL_OTP_PENDING,
    nextData: {
      ...state,
      email,
      emailVerified: false,
    }
  };
};

// Pure handler for email OTP verification
const emailOtpHandler: PureStepHandler = (state, payload) => {
  const { emailCode } = payload;
  
  if (!emailCode)
    throw new Error('Email OTP code is required.');
  
  return {
    nextData: {
      ...state,
      emailVerified: true,
      emailOtpExpires: undefined, // Clear OTP expiry
    }
  };
};

// Pure handler for token acquisition - just marks as ready
const tokenAcquisitionHandler: PureStepHandler = (state, payload) => {
  return {
    nextData: {
      ...state,
      tokenValid: true,
    }
  };
};

// Pure handler for user profile - validates and stores profile data
const userProfileHandler: PureStepHandler = (state, payload) => {
  const {user} = payload;
  
  if (!user || !user.firstName || !user.lastName)
    throw new Error('First name and last name are required.');
  
  // Note: This creates partial user data - the full user object should be fetched from API
  return {
    nextData: {
      ...state,
      user
    }
  };
};

// Pure handler for wallet creation - validates wallet creation and stores wallet data
const walletCreationHandler: PureStepHandler = (state, payload) => {
  const { walletAddress } = payload;
  
  if (!walletAddress)
    throw new Error('Wallet address is required after wallet creation.');
  
  return {
    nextData: {
      ...state,
      walletAddress,
      walletCreated: true,
    }
  };
};

// Pure handler for PIN setup
const pinSetupHandler: PureStepHandler = (state, payload) => {
  return {
    nextStep: AUTH_STEP_AUTHENTICATED,
    nextData: {
      ...state,
      pinSet: true,
      pinVerified: true,
    }
  };
};

// Pure handler for PIN entry (verification)
const pinEntryHandler: PureStepHandler = (state, payload) => { 
  return {
    nextStep: AUTH_STEP_AUTHENTICATED,
    nextData: {
      ...state,
      pinSet: true,
      pinVerified: true,
    }
  };
};

// Pure handler for authenticated state - final step
const authenticatedHandler: PureStepHandler = (state, payload) => {
  return {
    nextData: {
      ...state,
      sessionActive: true,
    }
  };
};

/* ------------------------------------------------------------------
 * Predicate-based flow engine types
 * ------------------------------------------------------------------ */

export interface FlowStep {
  step: AuthStep;
  /**
   * Return true if this step should be VISITED given current context.
   * If omitted, defaults to true (always visit).
   */
  condition?: (ctx: AuthFlowState) => boolean;
  /**
   * Pure handler for this step - returns next step and data without side effects
   */
  handler?: PureStepHandler;

  /**
   * Side effect for this step - returns result of side effect
   */
  sideEffect?: (flowState: AuthFlowState, payload: FlowPayload) => Promise<SideEffectResult>;
}

// Common step definitions - can be reused across flows
const COMMON_STEPS: Record<string, FlowStep> = {
  // Authentication steps (common to all flows)
  PHONE_ENTRY: { 
    step: AUTH_STEP_PHONE_ENTRY, 
    condition: (ctx: AuthFlowState) => !ctx.tokenValid && !ctx.phoneValidated,
    handler: phoneEntryHandler,
  },
  PHONE_OTP: { 
    step: AUTH_STEP_PHONE_OTP_PENDING, 
    condition: (ctx: AuthFlowState) => !ctx.tokenValid && ctx.phoneValidated && (!ctx.phoneOtpExpires || ctx.phoneOtpExpires > Date.now()),
    handler: phoneOtpHandler,
  },
  EMAIL_ENTRY: { 
    step: AUTH_STEP_EMAIL_ENTRY_PENDING, 
    condition: (ctx: AuthFlowState) => !ctx.tokenValid && ctx.phoneValidated && !ctx.emailVerified,
    handler: emailEntryHandler,
  },
  EMAIL_OTP: { 
    step: AUTH_STEP_EMAIL_OTP_PENDING, 
    condition: (ctx: AuthFlowState) => !ctx.tokenValid && ctx.phoneValidated && !ctx.emailVerified && (!ctx.emailOtpExpires || ctx.emailOtpExpires > Date.now()),
    handler: emailOtpHandler,
  },
  TOKEN_ACQUISITION: { 
    step: AUTH_STEP_TOKEN_ACQUISITION, 
    condition: (ctx: AuthFlowState) => ctx.phoneValidated && ctx.emailVerified && !ctx.tokenValid,
    handler: tokenAcquisitionHandler,
  },
  // PIN steps
  PIN_SETUP: { 
    step: AUTH_STEP_PIN_SETUP_PENDING, 
    condition: (ctx: AuthFlowState) => ctx.tokenValid && !ctx.pinSet,
    handler: pinSetupHandler,
  },
  PIN_ENTRY: { 
    step: AUTH_STEP_PIN_ENTRY_PENDING, 
    condition: (ctx: AuthFlowState) => ctx.tokenValid && ctx.pinSet && !ctx.pinVerified,
    handler: pinEntryHandler,
  },
  // Final step
  AUTHENTICATED: { 
    step: AUTH_STEP_AUTHENTICATED, 
    condition: (ctx: AuthFlowState) => ctx.tokenValid && ctx.pinSet && ctx.pinVerified,
    handler: authenticatedHandler,
  },
  // Signup-specific steps
  USER_PROFILE: { 
    step: AUTH_STEP_USER_PROFILE_PENDING, 
    condition: (ctx: AuthFlowState) => ctx.tokenValid && !ctx.user,
    handler: userProfileHandler,
  },
  WALLET_CREATION: { 
    step: AUTH_STEP_WALLET_CREATION_PENDING, 
    condition: (ctx: AuthFlowState) => ctx.tokenValid && !!ctx.user && !(ctx.walletCreated || false),
    handler: walletCreationHandler,
  },
};

// Add side-effects directly to the steps
Object.values(COMMON_STEPS).forEach(step => {
  step.sideEffect = (flowState, payload) => executeStepSideEffects(step.step, flowState, payload);
});

// Optimized flow definitions using common steps
const SIGNUP_FLOW_STEPS: FlowStep[] = [
  COMMON_STEPS.PHONE_ENTRY,
  COMMON_STEPS.PHONE_OTP,
  COMMON_STEPS.EMAIL_ENTRY,
  COMMON_STEPS.EMAIL_OTP,
  COMMON_STEPS.TOKEN_ACQUISITION,
  COMMON_STEPS.USER_PROFILE,
  COMMON_STEPS.WALLET_CREATION,
  { 
    step: AUTH_STEP_PIN_SETUP_PENDING, 
    condition: (ctx: AuthFlowState) => ctx.tokenValid && (ctx.walletCreated || false) && !ctx.pinSet,
    handler: pinSetupHandler, 
  },
  COMMON_STEPS.AUTHENTICATED,
];

const SIGNIN_FLOW_STEPS: FlowStep[] = [
  COMMON_STEPS.PHONE_ENTRY,
  COMMON_STEPS.PHONE_OTP,
  COMMON_STEPS.EMAIL_ENTRY,
  COMMON_STEPS.EMAIL_OTP,
  COMMON_STEPS.TOKEN_ACQUISITION, // Use COMMON_STEPS to get side effects
  COMMON_STEPS.USER_PROFILE,
  COMMON_STEPS.WALLET_CREATION,
  COMMON_STEPS.PIN_SETUP,
  COMMON_STEPS.PIN_ENTRY,
  COMMON_STEPS.AUTHENTICATED,
];

const FORGOT_PIN_FLOW_STEPS: FlowStep[] = [
  COMMON_STEPS.PHONE_ENTRY,
  COMMON_STEPS.PHONE_OTP,
  COMMON_STEPS.EMAIL_ENTRY,
  COMMON_STEPS.EMAIL_OTP,
  COMMON_STEPS.TOKEN_ACQUISITION,
  COMMON_STEPS.PIN_SETUP, // Resetting PIN
  COMMON_STEPS.AUTHENTICATED,
];


/* ------------------------------------------------------------------
 * Flow helpers
 * ------------------------------------------------------------------ */

export enum AuthFlowType {
  SIGNUP = 'signup',
  SIGNIN = 'signin',
  FORGOT_PIN = 'forgot_pin',
}

/**
 * Gets the complete flow steps for a given flow type without filtering based on context.
 * This is used during flow initialization to avoid premature filtering of steps.
 * 
 * @param flowType Type of authentication flow
 * @returns Complete array of flow steps without filtering
 */
export function getFlowTypeSteps(flowType: AuthFlowType): FlowStep[] {
  switch (flowType) {
    case AuthFlowType.SIGNUP:
      return SIGNUP_FLOW_STEPS;
    case AuthFlowType.FORGOT_PIN:
      return FORGOT_PIN_FLOW_STEPS;
    case AuthFlowType.SIGNIN:
    default:
      return SIGNIN_FLOW_STEPS;
  }
}

/**
 * Get the next step index that satisfies its predicate. Returns `null` if none.
 */
function getNextValidIndex(flow: FlowStep[], fromIndex: number, ctx: AuthFlowState): number | null {
  info(`[getNextValidIndex]: fromIndex=${fromIndex}, flow length=${flow.length}, steps=${flow.map(f => f.step).join(',')}, ctx=${JSON.stringify(ctx)}`);
  for (let i = fromIndex + 1; i < flow.length; i++) {
    const s = flow[i];
    info(`[getNextValidIndex]: condition ${s.step}`, ctx, s.condition)
    if (!s.condition || s.condition(ctx)) return i;
    info(`[getNextValidIndex]: skipping step ${s.step}: condition not met`);
  }
  return null;
}

// Deprecated pure-step lists (still used by some tests / components). Will be removed.
export const SIGNIN_FLOW: AuthStep[] = SIGNIN_FLOW_STEPS.map(s => s.step);
export const SIGNUP_FLOW: AuthStep[] = SIGNUP_FLOW_STEPS.map(s => s.step);
export const FORGOT_PIN_FLOW: AuthStep[] = FORGOT_PIN_FLOW_STEPS.map(s => s.step);

/**
 * Builds the authentication flow state by computing dynamic values.
 * This is a pure function that fetches and computes all necessary state values.
 * 
 * @param currentFlowState - Current flow state data
 * @param additionalData - Optional additional data to merge
 * @returns Promise resolving to complete AuthFlowState with computed values
 */
export async function buildFlowState(
  currentFlowState?: Partial<AuthFlowState>,
  additionalData?: Partial<AuthFlowState>
): Promise<AuthFlowState> {
  info(`[buildFlowState] Building flow state`);
  
  // Merge current state with additional data
  const mergedState = { 
    ...getInitialFlowState(),  // Use function for defaults instead of manual defaults
    ...currentFlowState,
    ...additionalData
  };
  
  // Compute dynamic values in parallel
  const [session, tokenMetadata, pinSetFlag] = await Promise.all([
    SessionService.loadSession(),
    checkTokenStatus(),
    serviceIsPinSet()
  ]);
  
  const sessionActive = Boolean(session);
  const sessionStatus = SessionService.getStatus(session);
  info(`[buildFlowState] Session status: ${sessionStatus}`);
  
  // Fetch user if needed
  let user = mergedState.user;
  const { exists: tokenExists, isExpired: tokenExpired } = tokenMetadata;

  if (!tokenExpired && !user) {
    const getUserRes = await userService.getUser();
    if (!getUserRes.error) {
      user = getUserRes?.data?.user;
    } else {
      warn('[buildFlowState] Error getting user:', getUserRes.error);
    }
  }
  
  // Check if user already has a wallet (for signin flows)
  const hasExistingWallet = Boolean(user?.walletAddress || mergedState.user?.walletAddress);
  
  // Return complete state with computed values
  return {
    // Merge with existing and computed values
    ...mergedState,
    // Override with computed values
    tokenExists,
    tokenValid: !tokenExpired,
    sessionActive,
    pinSet: pinSetFlag || mergedState.pinSet || false,
    pinVerified: mergedState.pinVerified || false,
    user: user || mergedState.user || null,
    walletCreated: hasExistingWallet || mergedState.walletCreated || false
  } as AuthFlowState;
}

/**
 * Determines the next step in the flow based on conditions and current state.
 * 
 * @param flow - Array of flow steps
 * @param currentIndex - Current step index
 * @param flowState - Current flow state
 * @param explicitNextStep - Optional explicit next step from handler
 * @returns Object with nextIndex and nextStep
 */
export function determineNextStep(
  flow: FlowStep[],
  currentIndex: number,
  flowState: AuthFlowState,
  explicitNextStep?: AuthStep
): { nextIndex: number | null; nextStep: AuthStep | null } {
  if (explicitNextStep) {
    // If handler returned an explicit step, find its index
    const explicitIndex = flow.findIndex((s: FlowStep) => s.step === explicitNextStep);
    if (explicitIndex !== -1) {
      return { nextIndex: explicitIndex, nextStep: explicitNextStep };
    } else {
      // Explicit step not in flow, keep it but no index
      return { nextIndex: null, nextStep: explicitNextStep };
    }
  } else {
    // Get the next valid step based on the flow conditions
    const nextIdx = getNextValidIndex(flow, currentIndex, flowState);
    const nextStep = nextIdx !== null ? flow[nextIdx].step : null;
    return { nextIndex: nextIdx, nextStep };
  }
}

/**
 * Gets the initial step index for a flow based on current state.
 * 
 * @param steps - Array of flow steps
 * @param flowState - Current flow state
 * @returns Initial step index or null if no valid step
 */
export function getInitialFlowIndex(
  steps: FlowStep[],
  flowState: AuthFlowState
): number | null {
  if (steps.length === 0) {
    return null;
  }
  
  // Find the first step whose condition is met
  return getNextValidIndex(steps, -1, flowState);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the initial flow state with default values
 */
export function getInitialFlowState(): AuthFlowState {
  return {
    phoneValidated: false,
    emailVerified: false,
    pinSet: false,
    pinVerified: false,
    registrationComplete: false,
    tokenExists: false,
    tokenValid: false,
    sessionActive: false,
    walletCreated: false, // Add wallet creation flag
  };
}

// ============================================================================
// Flow Orchestration Functions
// ============================================================================

export interface FlowOrchestrationResult {
  success: boolean;
  errorCode?: ErrorCode;
  nextStep?: AuthStep;
  flowState?: AuthFlowState;
  session?: Session;
}

/**
 * Advances the authentication flow to the next step
 * @param currentStep - Current authentication step
 * @param flowState - Current flow state
 * @param payload - Payload with data for the current step
 * @param flowSteps - Array of flow steps
 * @returns Promise with orchestration result including success status and error codes
 */
export async function advanceFlow(
  currentStep: AuthStep,
  flowState: AuthFlowState,
  payload: FlowPayload,
  flowSteps: FlowStep[]
): Promise<FlowOrchestrationResult> {
  if (!flowSteps || flowSteps.length === 0) {
    logError('[advanceFlow/flowOrchestration] Invalid flow configuration');
    return {
      success: false,
      errorCode: ErrorCode.VALIDATION_ERROR
    };
  }

  try {
    // 1. Find current step in flow
    const currentStepIndex = flowSteps.findIndex(s => s.step === currentStep);
    if (currentStepIndex === -1) {
      logError(`[advanceFlow/flowOrchestration] Current step ${currentStep} not found in flow`);
      return {
        success: false,
        errorCode: ErrorCode.VALIDATION_ERROR
      };
    }

    const currentStepObj = flowSteps[currentStepIndex];
    
    // 2. Execute side effect if exists
    let sideEffectData: Partial<AuthFlowState> = {};
    if (currentStepObj.sideEffect) {
      info(`[advanceFlow/flowOrchestration] Executing side effect for step: ${currentStep}`);
      const sideEffectResult = await currentStepObj.sideEffect(flowState, payload);
      
      if (!sideEffectResult.success) {
        warn(`[advanceFlow/flowOrchestration] Side effect failed for step ${currentStep}`, sideEffectResult);
        return {
          success: false,
          errorCode: sideEffectResult.errorCode || ErrorCode.AUTH_FLOW_UNKNOWN_SIDE_EFFECT_ERROR
        };
      }
      
      if (sideEffectResult.data) {
        sideEffectData = sideEffectResult.data;
        info(`[advanceFlow/flowOrchestration] Side effect data for step ${currentStep}:`, sideEffectData);
      }
    }

    // 3. Merge side effect data into flow state
    const preHandlerFlowState = {
      ...flowState,
      ...sideEffectData
    };

    // 4. Execute the pure step handler if it exists
    let handlerResult: { nextData: Partial<AuthFlowState>; nextStep?: AuthStep | null } | null = null;
    
    if (currentStepObj.handler) {
      info(`[advanceFlow/flowOrchestration] Executing handler for step: ${currentStep}`);
      try {
        handlerResult = currentStepObj.handler(preHandlerFlowState, payload);
      } catch (err) {
        logError(`[advanceFlow/flowOrchestration] Handler error for step ${currentStep}:`, err);
        return {
          success: false,
          errorCode: ErrorCode.UNKNOWN
        };
      }
    }

    // 5. Merge handler data into flow state
    const postHandlerFlowState = {
      ...preHandlerFlowState,
      ...(handlerResult?.nextData || {})
    };

    // 6. Determine next step
    const { nextIndex, nextStep } = determineNextStep(
      flowSteps,
      currentStepIndex,
      postHandlerFlowState,
      handlerResult?.nextStep as AuthStep | undefined
    );

    if (!nextStep || nextIndex === null) {
      logError(`[advanceFlow/flowOrchestration] No valid next step found after ${currentStep}`);
      return {
        success: false,
        errorCode: ErrorCode.VALIDATION_ERROR
      };
    }

    // 7. Build final flow state
    const finalFlowState = await buildFlowState(postHandlerFlowState);

    info(`[advanceFlow/flowOrchestration] Flow advanced from ${currentStep} to ${nextStep}`, {
      sideEffectData,
      handlerData: handlerResult?.nextData,
      finalFlowState
    });

    // Special handling for AUTH_STEP_AUTHENTICATED
    if (currentStep === AUTH_STEP_AUTHENTICATED) {
      const session = await SessionService.loadSession();
      if (session) {
        info('[advanceFlow/flowOrchestration]: Existing session found during AUTH_STEP_AUTHENTICATED', session);
        return {
          success: true,
          nextStep: AUTH_STEP_AUTHENTICATED,
          flowState: finalFlowState,
          session: session
        };
      }
    }

    // Return successful result with nextStep
    return {
      success: true,
      nextStep: nextStep as AuthStep,
      flowState: finalFlowState
    };
    
  } catch (err) {
    logError(`[advanceFlow/flowOrchestration] Unexpected error:`, err);
    return {
      success: false,
      errorCode: ErrorCode.UNKNOWN,
      flowState
    };
  }
}

/**
 * Initiates a new authentication flow
 * @param flowType - Type of flow to initiate
 * @param options - Flow options (e.g., for forgot PIN)
 * @returns Initial flow configuration
 */
export async function initiateFlow(
  flowType: AuthFlowType,
  state?: Partial<AuthFlowState>
): Promise<{
  success: true;
  flowType: AuthFlowType;
  steps: FlowStep[];
  currentStep: AuthStep;
  currentStepIndex: number;
  flowState: AuthFlowState;
} | {
  success: false;
  errorCode?: ErrorCode;
}> {
  const steps = getFlowTypeSteps(flowType);
  
  if (!steps || steps.length === 0) {
    return {
      success: false,
      errorCode: ErrorCode.VALIDATION_ERROR
    };
  }

  try {
    // Build initial flow state with options if provided
    const initialState = getInitialFlowState()
    
    // Use buildFlowState to compute all dynamic values (tokenValid, pinSet, etc.)
    const flowState = await buildFlowState(initialState, state);

    // For Forgot PIN flow, the user shouldn't be able to change the phone number, nor the email.
    if (flowType === AuthFlowType.FORGOT_PIN && flowState.user) {
      info('[initiateFlow/flowOrchestration] Forgot PIN flow initiated - setting phone and email to state');

      flowState.phone = flowState.user?.phone;
      flowState.phoneValidated = true;
      flowState.email = flowState.user?.email;
      flowState.emailVerified = true;
    }
    
    // Get initial step index based on the complete flow state
    const initialIndex = getInitialFlowIndex(steps, flowState);
    
    if (initialIndex === null || initialIndex >= steps.length) {
      return {
        success: false,
        errorCode: ErrorCode.VALIDATION_ERROR
      };
    }
    
    return {
      success: true,
      flowType,
      steps,
      currentStep: steps[initialIndex].step,
      currentStepIndex: initialIndex,
      flowState
    };
  } catch (error) {
    logError('[initiateFlow/flowOrchestration] Error building flow state:', error);
    return {
      success: false,
      errorCode: ErrorCode.UNKNOWN
    };
  }
}