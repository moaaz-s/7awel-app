// utils/pin-service.ts
// Centralized PIN operations: hashing, storage, attempt tracking, and lockout

import {
  hashPin,
  verifyPin
} from '@/utils/pin-utils';
import {
  getPinHash,
  setPinHash,
  clearPinHash,
  resetPinAttempts,
  incrementPinAttempts,
  getPinAttempts,
  getPinLockUntil,
  setPinLockUntil,
  clearPinForgotten
} from '@/utils/storage';
import { MAX_PIN_ATTEMPTS, PIN_LOCKOUT_TIME_MS } from '@/constants/auth-constants';

export interface ValidatePinResult {
  valid: boolean;
  attemptsRemaining?: number;
  locked?: boolean;
  lockUntil?: number;
}

/**
 * Set a new PIN: hash it, store it, and reset attempt counter.
 */
export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  await setPinHash(hash);
  await resetPinAttempts();
  // Clear any "forgot PIN" flag when a new PIN is set
  await clearPinForgotten();
}

/**
 * Validate a PIN: verify, track attempts, and lock on max attempts.
 */
export async function validatePin(pin: string): Promise<ValidatePinResult> {
  // First check if we're already locked
  const currentLockUntil = await getPinLockUntil();
  if (currentLockUntil && currentLockUntil > Date.now()) {
    return { valid: false, locked: true, lockUntil: currentLockUntil };
  }

  const storedHash = await getPinHash();
  if (!storedHash) {
    return { valid: false };
  }

  const valid = await verifyPin(pin, storedHash);
  if (valid) {
    await resetPinAttempts();
    return { valid };
  }

  const attempts = await incrementPinAttempts();
  if (attempts >= MAX_PIN_ATTEMPTS) {
    const lockUntil = Date.now() + PIN_LOCKOUT_TIME_MS;
    await setPinLockUntil(lockUntil);
    return { valid: false, locked: true, lockUntil };
  }

  return { valid: false, attemptsRemaining: MAX_PIN_ATTEMPTS - attempts };
}

/**
 * Clear stored PIN and security state.
 */
export async function clearPin(): Promise<void> {
  await clearPinHash();
  await resetPinAttempts();
  await setPinLockUntil(0);
}

/**
 * Returns true if a PIN hash is stored.
 */
export async function isPinSet(): Promise<boolean> {
  const hash = await getPinHash();
  return !!hash;
}

/**
 * Returns the lock expiration timestamp or null.
 */
export function getLockUntil(): Promise<number | null> {
  return getPinLockUntil();
}

/**
 * Reset only the attempt counter (no hash or lockout change).
 */
export async function resetAttempts(): Promise<void> {
  await resetPinAttempts();
}

/**
 * Clear lockout state and reset attempts.
 */
export async function clearLockout(): Promise<void> {
  await resetPinAttempts();
  await setPinLockUntil(0);
}

/**
 * Returns true if currently locked out.
 */
export async function isLocked(): Promise<boolean> {
  const lockUntil = await getPinLockUntil();
  return !!lockUntil && lockUntil > Date.now();
}
