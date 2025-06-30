// constants/auth-constants.ts
// -----------------------------------------------------------------------------
// Centralized authentication-related constants for consistent usage across
// the application. This helps avoid magic numbers and improves maintainability.
// -----------------------------------------------------------------------------

/**
 * Auth and session related constants
 */

// PIN related constants
export const PIN_LENGTH = 6;

// Session timeouts
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_IDLE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute
export const SESSION_LOCKOUT_TIMEOUT_WARNING_MS = 30 * 1000; // 30 seconds warning before lockout

// Auth related constants
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;
export const MAX_PIN_ATTEMPTS = 3;
export const PIN_LOCKOUT_TIME_MS = 1 * 60 * 1000; // 1 minutes

/** Maximum number of OTP verification attempts before lockout */
export const MAX_OTP_ATTEMPTS = 3;

/** How long OTP codes remain valid (10 minutes) */
export const OTP_EXPIRY_MS = 10 * 60 * 1000;

/** Duration of OTP lockout after too many failed attempts (5 minutes) */
export const OTP_LOCKOUT_DURATION_MS = 5 * 60 * 1000;

// Generic helper: collect all constants in one object if needed elsewhere
export const AuthConstants = {
  PIN_LENGTH,
  SESSION_TTL_MS,
  SESSION_IDLE_TIMEOUT_MS,
  PIN_MIN_LENGTH,
  PIN_MAX_LENGTH,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_TIME_MS,
  MAX_OTP_ATTEMPTS,
  OTP_EXPIRY_MS,
  OTP_LOCKOUT_DURATION_MS,
  SESSION_LOCKOUT_TIMEOUT_WARNING_MS,
} as const;
