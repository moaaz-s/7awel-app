// Utility functions for managing simple local storage flags and data.
// IMPORTANT: This uses standard storage and MAY NOT be secure for sensitive data like PINs.
// It serves as a placeholder for integration with Capacitor Secure Storage or similar.

const PIN_HASH_KEY = 'app_pin_hash';
const PIN_ATTEMPTS_KEY = 'app_pin_attempts';
const PIN_LOCK_UNTIL_KEY = 'app_pin_lock_until';
// Session expiry timestamp (ms). When present & in future, user is considered "unlocked"
const SESSION_EXP_KEY = 'app_session_exp';
const SESSION_KEY = 'app_session';


import { getItem, setItem, removeItem } from '@/utils/secure-storage';
import { info, error } from "@/utils/logger";
import type { Session } from '@/context/auth/auth-types';
import { PIN_FORGOT } from '@/constants/storage-keys';
import { APP_CONFIG } from '@/constants/app-config';

/**
 * Retrieves the stored PIN hash.
 * @returns Promise<string | null> - The stored hash or null if not set.
 */
export const getPinHash = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  const secure = await getItem(PIN_HASH_KEY);
  info('[storage] Retrieved PIN hash from secure storage:', secure);
  if (secure != null && secure !== '') return secure; // Treat empty string as null
  
  return null;
};

/**
 * Stores a PIN hash.
 * @param hash - The hash string to store.
 * @returns Promise<void>
 */
export const setPinHash = async (hash: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  info('[storage] setPinHash: writing', hash);
  await setItem(PIN_HASH_KEY, hash);
};

/**
 * Clears the stored PIN hash from secure storage.
 * @returns Promise<void>
 */
export const clearPinHash = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  await removeItem(PIN_HASH_KEY);
  
  await resetPinAttempts();
  await setPinLockUntil(0);
};

export const setPinForgotten = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  await setItem(PIN_FORGOT, 'true');
};

export const clearPinForgotten = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  await removeItem(PIN_FORGOT);
};

export const isPinForgotten = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  const forgotten = await getItem(PIN_FORGOT);
  return !!forgotten;
};

// ---------------- Session Management ----------------

/**
 * Get the current session state
 * @returns Promise<Session | null> Current session or null if no session exists
 */
export async function getSession(): Promise<Session | null> {
  try {
    const stored = await getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as Session;
    
    // Validate session data
    if (!session || 
        typeof session.isActive !== 'boolean' ||
        typeof session.lastActivity !== 'number' ||
        typeof session.expiresAt !== 'number' ||
        typeof session.pinVerified !== 'boolean') {
      error('Invalid session data');
      await clearSession();
      return null;
    }

    // Check expiration
    if (session.expiresAt < Date.now()) {
      await clearSession();
      return null;
    }

    return session;
  } catch (err) {
    error('Failed to get session:', err);
    return null;
  }
}

/**
 * Save session state
 * @param session Session state to save
 */
export async function setSession(session: Session): Promise<void> {
  try {
    await setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    error('Failed to save session:', err);
  }
}

/**
 * Clear current session state
 */
export async function clearSession(): Promise<void> {
  try {
    await removeItem(SESSION_KEY);
  } catch (err) {
    error('Failed to clear session:', err);
  }
}

// ---------------- Brute force lockout helpers ----------------

export const getPinAttempts = async (): Promise<number> => {
  const val = await getItem(PIN_ATTEMPTS_KEY);
  return val ? parseInt(val, 10) || 0 : 0;
};

export const incrementPinAttempts = async (): Promise<number> => {
  const MAX_PIN_ATTEMPTS = APP_CONFIG.SECURITY.MAX_PIN_ATTEMPTS;

  const current = await getPinAttempts();
  const next = current + 1;
  const attemps = Math.min(next, MAX_PIN_ATTEMPTS);
  await setItem(PIN_ATTEMPTS_KEY, String(attemps));
  return attemps;
};

export const resetPinAttempts = async (): Promise<void> => {
  await removeItem(PIN_ATTEMPTS_KEY);
};

export const getPinLockUntil = async (): Promise<number | null> => {
  const val = await getItem(PIN_LOCK_UNTIL_KEY);
  return val ? parseInt(val, 10) || null : null;
};

export const setPinLockUntil = async (timestamp: number): Promise<void> => {
  await setItem(PIN_LOCK_UNTIL_KEY, String(timestamp));
};

// ---------------- OTP brute force helpers ----------------

const OTP_ATTEMPTS_PREFIX = 'app_otp_attempts_';
const OTP_LOCK_PREFIX = 'app_otp_lock_until_';

function attemptsKey(value: string) {
  return `${OTP_ATTEMPTS_PREFIX}${encodeURIComponent(value)}`;
}

function lockKey(value: string) {
  return `${OTP_LOCK_PREFIX}${encodeURIComponent(value)}`;
}

export const getOtpAttempts = async (value: string): Promise<number> => {
  const val = await getItem(attemptsKey(value));
  return val ? parseInt(val, 10) || 0 : 0;
};

export const incrementOtpAttempts = async (value: string): Promise<number> => {
  const current = await getOtpAttempts(value);
  const next = current + 1;
  await setItem(attemptsKey(value), String(next));
  return next;
};

export const resetOtpAttempts = async (value: string): Promise<void> => {
  await removeItem(attemptsKey(value));
};

export const getOtpLockUntil = async (value: string): Promise<number | null> => {
  const val = await getItem(lockKey(value));
  if (!val) return null;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const setOtpLockUntil = async (value: string, until: number): Promise<void> => {
  await setItem(lockKey(value), String(until));
};
