import { info } from '@/utils/logger';
import {
  AuthStep,
  AUTH_STEP_PHONE_ENTRY,
  AUTH_STEP_PHONE_OTP_PENDING,
  AUTH_STEP_EMAIL_ENTRY_PENDING,
  AUTH_STEP_EMAIL_OTP_PENDING,
  AUTH_STEP_USER_PROFILE_PENDING,
  AUTH_STEP_PIN_SETUP_PENDING,
  AUTH_STEP_PIN_ENTRY_PENDING,
  AUTH_STEP_AUTHENTICATED,
  AUTH_STEP_TOKEN_ACQUISITION
} from './flowSteps';

/* ------------------------------------------------------------------
 * Predicate-based flow engine types
 * ------------------------------------------------------------------ */

export interface FlowCtx {
  // Token validity
  tokenValid: boolean;
  // Phone OTP already verified
  phoneValidated: boolean;
  // Email link clicked
  emailVerified: boolean;
  // User has already set a PIN on this device
  pinSet: boolean;
  // User has successfully verified the PIN this session
  pinVerified: boolean;
  // Local PIN session is active and unexpired
  sessionActive: boolean;
  // Expiration timestamp for phone OTP
  otpExpiry?: number;
  // Expiration timestamp for email OTP
  emailOtpExpiry?: number;
  // First name
  firstName?: string;
  // Last name
  lastName?: string;
}

export interface FlowStep {
  step: AuthStep;
  /**
   * Return true if this step should be VISITED given current context.
   * If omitted, defaults to true (always visit).
   */
  condition?: (ctx: FlowCtx) => boolean;
}

/* ------------------------------------------------------------------
 * Flow definitions (maximal list with predicates)
 * ------------------------------------------------------------------ */

const SIGNUP_FLOW_STEPS: FlowStep[] = [
  // Conditional steps for signup flow
  { step: AUTH_STEP_PHONE_ENTRY, condition: ctx => !ctx.tokenValid && !ctx.phoneValidated },
  { step: AUTH_STEP_PHONE_OTP_PENDING, condition: ctx => !ctx.tokenValid && ctx.phoneValidated && (!ctx.otpExpiry || ctx.otpExpiry > Date.now()) },
  { step: AUTH_STEP_EMAIL_ENTRY_PENDING, condition: ctx => !ctx.tokenValid && ctx.phoneValidated && !ctx.emailVerified },
  { step: AUTH_STEP_EMAIL_OTP_PENDING, condition: ctx => !ctx.tokenValid && ctx.phoneValidated && !ctx.emailVerified && (!ctx.emailOtpExpiry || ctx.emailOtpExpiry > Date.now()) },
  { step: AUTH_STEP_TOKEN_ACQUISITION, condition: ctx => ctx.phoneValidated && ctx.emailVerified && !ctx.tokenValid },
  { step: AUTH_STEP_USER_PROFILE_PENDING, condition: ctx => ctx.tokenValid && (!ctx.firstName || !ctx.lastName) },
  { step: AUTH_STEP_PIN_SETUP_PENDING, condition: ctx => ctx.tokenValid && !ctx.pinSet },
  { step: AUTH_STEP_PIN_ENTRY_PENDING, condition: ctx => ctx.tokenValid && ctx.pinSet && !ctx.pinVerified && !ctx.sessionActive },
  { step: AUTH_STEP_AUTHENTICATED, condition: ctx => ctx.tokenValid && ctx.pinSet && ctx.pinVerified },
];

const SIGNIN_FLOW_STEPS: FlowStep[] = [
  // Conditional steps for signin flow
  { step: AUTH_STEP_PHONE_ENTRY, condition: ctx => !ctx.tokenValid && !ctx.phoneValidated },
  // Always require OTP verification after phone entry if not expired
  { step: AUTH_STEP_PHONE_OTP_PENDING, condition: ctx => !ctx.tokenValid && ctx.phoneValidated && (!ctx.otpExpiry || ctx.otpExpiry > Date.now()) },
  // Make email verification required after phone verification
  { step: AUTH_STEP_EMAIL_ENTRY_PENDING, condition: ctx => !ctx.tokenValid && ctx.phoneValidated && !ctx.emailVerified },
  { step: AUTH_STEP_EMAIL_OTP_PENDING, condition: ctx => !ctx.tokenValid && ctx.phoneValidated && !ctx.emailVerified && (!ctx.emailOtpExpiry || ctx.emailOtpExpiry > Date.now()) },
  { step: AUTH_STEP_TOKEN_ACQUISITION, condition: ctx => !ctx.tokenValid && ctx.phoneValidated && ctx.emailVerified },
  { step: AUTH_STEP_PIN_SETUP_PENDING, condition: ctx => ctx.tokenValid && !ctx.pinSet },
  { step: AUTH_STEP_PIN_ENTRY_PENDING, condition: ctx => ctx.tokenValid && ctx.pinSet && !ctx.pinVerified && !ctx.sessionActive },
  { step: AUTH_STEP_AUTHENTICATED, condition: ctx => ctx.tokenValid && ctx.pinSet && ctx.pinVerified },
];

// TODO: Either force phone & email validation again anyway, 
//       Or check if the user has already validated them through another flow (e.g. signin) in which case they will not be required.
const FORGOT_PIN_FLOW_STEPS: FlowStep[] = [
  { step: AUTH_STEP_PHONE_ENTRY, condition: ctx => !ctx.tokenValid && !ctx.phoneValidated },
  { step: AUTH_STEP_PHONE_OTP_PENDING, condition: ctx => !ctx.tokenValid && ctx.phoneValidated && (!ctx.otpExpiry || ctx.otpExpiry > Date.now()) },
  { step: AUTH_STEP_EMAIL_ENTRY_PENDING, condition: ctx => !ctx.emailVerified && ctx.phoneValidated },
  { step: AUTH_STEP_EMAIL_OTP_PENDING, condition: ctx => !ctx.emailVerified && (!ctx.emailOtpExpiry || ctx.emailOtpExpiry > Date.now()) },
  { step: AUTH_STEP_TOKEN_ACQUISITION, condition: ctx => ctx.phoneValidated && ctx.emailVerified && !ctx.tokenValid },
  { step: AUTH_STEP_PIN_SETUP_PENDING },
  { step: AUTH_STEP_AUTHENTICATED },
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
export function getNextValidIndex(flow: FlowStep[], fromIndex: number, ctx: FlowCtx): number | null {
  info(`[getNextValidIndex]: fromIndex=${fromIndex}, flow length=${flow.length}, steps=${flow.map(f => f.step).join(',')}, ctx=${JSON.stringify(ctx)}`);
  for (let i = fromIndex + 1; i < flow.length; i++) {
    const s = flow[i];
    if (!s.condition || s.condition(ctx)) return i;
    info(`[getNextValidIndex]: skipping step ${s.step}: condition not met`);
  }
  return null;
}

// Deprecated pure-step lists (still used by some tests / components). Will be removed.
export const SIGNIN_FLOW: AuthStep[] = SIGNIN_FLOW_STEPS.map(s => s.step);
export const SIGNUP_FLOW: AuthStep[] = SIGNUP_FLOW_STEPS.map(s => s.step);
export const FORGOT_PIN_FLOW: AuthStep[] = FORGOT_PIN_FLOW_STEPS.map(s => s.step);