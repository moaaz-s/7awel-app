// Define constants for the authentication flow steps managed by the API

/** Initial state before any interaction */
export const AUTH_STEP_INITIATE = "initiate"; // Starting point, before any UI shown

/** User needs to enter phone number */
export const AUTH_STEP_PHONE_ENTRY = "phone_entry";

/** Waiting for the user to enter the OTP sent to their phone */
export const AUTH_STEP_PHONE_OTP_PENDING = "phone_otp_pending";

/** Waiting for the user to enter their email address */
export const AUTH_STEP_EMAIL_ENTRY_PENDING = "email_entry_pending";

/** Waiting for the user to enter the OTP sent to their email */
export const AUTH_STEP_EMAIL_OTP_PENDING = "email_otp_pending";

/** Server authentication token acquisition after MFA verification */
export const AUTH_STEP_TOKEN_ACQUISITION = "token_acquisition";

/** Waiting for user to complete profile information during signup */
export const AUTH_STEP_USER_PROFILE_PENDING = "user_profile_pending";

/** Waiting for user wallet creation and initialization (first time only) */
export const AUTH_STEP_WALLET_CREATION_PENDING = "wallet_creation_pending";

/** Waiting for the user to set up their PIN for the first time */
export const AUTH_STEP_PIN_SETUP_PENDING = "PIN_SETUP_PENDING";

/** Waiting for the user to enter their existing PIN */
export const AUTH_STEP_PIN_ENTRY_PENDING = "pin_entry_pending";

/** User is fully authenticated and PIN is verified */
export const AUTH_STEP_AUTHENTICATED = "AUTHENTICATED";

// Add other steps as needed (e.g., MFA, KYC)

export type AuthStep = 
  | typeof AUTH_STEP_INITIATE
  | typeof AUTH_STEP_PHONE_ENTRY
  | typeof AUTH_STEP_PHONE_OTP_PENDING
  | typeof AUTH_STEP_EMAIL_ENTRY_PENDING
  | typeof AUTH_STEP_EMAIL_OTP_PENDING
  | typeof AUTH_STEP_TOKEN_ACQUISITION
  | typeof AUTH_STEP_USER_PROFILE_PENDING
  | typeof AUTH_STEP_WALLET_CREATION_PENDING
  | typeof AUTH_STEP_PIN_SETUP_PENDING
  | typeof AUTH_STEP_PIN_ENTRY_PENDING
  | typeof AUTH_STEP_AUTHENTICATED
  | null; // Add null to represent the initial or loading state
