// constants/storage-keys.ts
// -----------------------------------------------------------------------------
// Centralised list of keys & TTLs used by secure-storage / localStorage.
// Keeping them here avoids typo bugs and helps us migrate easily to new storage
// back-ends (IndexedDB, Capacitor Secure Storage, etc.)
// -----------------------------------------------------------------------------

/**
 * Storage keys used throughout the application
 */

// Authentication
export const AUTH_TOKEN = 'auth_token';

// User preferences
export const LANGUAGE = 'language';
export const THEME = 'theme';
export const CURRENCY = 'currency';

// Security
export const PIN_HASH = 'pin_hash';
export const BIOMETRICS_ENABLED = 'biometrics_enabled';

// Session
export const SESSION = 'session';
export const SESSION_EXP = 'session_exp';

// Generic helper: collect all constants in one object if needed elsewhere
export const StorageKeys = {
  AUTH_TOKEN,
  LANGUAGE,
  THEME,
  CURRENCY,
  PIN_HASH,
  BIOMETRICS_ENABLED,
  SESSION,
  SESSION_EXP,
} as const;
