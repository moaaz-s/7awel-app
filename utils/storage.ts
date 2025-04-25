// Utility functions for managing simple local storage flags and data.
// IMPORTANT: This uses standard localStorage and is NOT secure for sensitive data like PINs.
// It serves as a placeholder for integration with Capacitor Secure Storage or similar.

const ONBOARDING_KEY = 'app_onboarding_completed';
const PIN_HASH_KEY = 'app_pin_hash';
const PIN_ATTEMPTS_KEY = 'app_pin_attempts';
const PIN_LOCK_UNTIL_KEY = 'app_pin_lock_until';
// Session expiry timestamp (ms). When present & in future, user is considered "unlocked"
const SESSION_EXP_KEY = 'app_session_exp';
// Default session TTL: 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;

import { loadPlatform } from '@/platform';
import { getItem, setItem } from '@/utils/secure-storage';

/**
 * Checks if the onboarding process has been marked as completed.
 * @returns Promise<boolean> - True if onboarding is complete, false otherwise.
 */
export const getHasCompletedOnboarding = async (): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    const value = localStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } 
  return false; // Default to false if localStorage is not available (SSR)
};

/**
 * Marks the onboarding process as completed or not.
 * @param completed - Boolean flag indicating completion status.
 * @returns Promise<void>
 */
export const setHasCompletedOnboarding = async (completed: boolean): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ONBOARDING_KEY, String(completed));
  }
};

/**
 * Retrieves the stored (dummy) PIN hash.
 * @returns Promise<string | null> - The stored hash or null if not set.
 */
export const getPinHash = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  const secure = await getItem(PIN_HASH_KEY);
  console.log('[storage] Retrieved PIN hash from secure storage:', secure); // <-- Log secure hash
  if (secure != null) return secure;
  const legacyHash = localStorage.getItem(PIN_HASH_KEY);
  console.log('[storage] Retrieved PIN hash from localStorage (legacy):', legacyHash); // <-- Log legacy hash
  return legacyHash; // Return legacy hash if secure is null
};

/**
 * Stores a (dummy) PIN hash.
 * @param hash - The dummy hash string to store.
 * @returns Promise<void>
 */
export const setPinHash = async (hash: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  await setItem(PIN_HASH_KEY, hash);
};

/**
 * Clears the stored PIN hash from secure storage.
 * @returns Promise<void>
 */
export const clearPinHash = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  // Import removeItem directly from secure-storage
  const { removeItem } = await import('@/utils/secure-storage'); 
  await removeItem(PIN_HASH_KEY);
};

/**
 * Clears all authentication-related flags and data from local storage.
 * @returns Promise<void>
 */
export const clearAll = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(SESSION_EXP_KEY);
    localStorage.removeItem(PIN_ATTEMPTS_KEY);
    localStorage.removeItem(PIN_LOCK_UNTIL_KEY);
    // Add removal of session token key here when implemented
  }
};

// ---------------- Session helpers ----------------

/**
 * Sets a session-active flag with expiry NOW + ttlMs (defaults to 30min).
 */
export const setSessionActive = async (ttlMs: number = SESSION_TTL_MS): Promise<void> => {
  if (typeof window !== 'undefined') {
    const exp = Date.now() + ttlMs;
    localStorage.setItem(SESSION_EXP_KEY, String(exp));
  }
};

/**
 * Returns true if a non-expired session flag exists.
 */
export const getSessionActive = async (): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    const expStr = localStorage.getItem(SESSION_EXP_KEY);
    if (expStr) {
      const exp = parseInt(expStr, 10);
      if (!Number.isNaN(exp) && Date.now() < exp) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Clears the session expiry flag from local storage.
 * @returns Promise<void>
 */
export const clearSessionActive = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_EXP_KEY);
  }
};

// ---------------- Brute force lockout helpers ----------------

export const getPinAttempts = async (): Promise<number> => {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(PIN_ATTEMPTS_KEY);
  return val ? parseInt(val, 10) || 0 : 0;
};

export const incrementPinAttempts = async (): Promise<number> => {
  const current = await getPinAttempts();
  const next = current + 1;
  if (typeof window !== 'undefined') {
    localStorage.setItem(PIN_ATTEMPTS_KEY, String(next));
  }
  return next;
};

export const resetPinAttempts = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PIN_ATTEMPTS_KEY);
  }
};

export const getPinLockUntil = async (): Promise<number | null> => {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(PIN_LOCK_UNTIL_KEY);
  return val ? parseInt(val, 10) || null : null;
};

export const setPinLockUntil = async (timestamp: number): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PIN_LOCK_UNTIL_KEY, String(timestamp));
  }
};
