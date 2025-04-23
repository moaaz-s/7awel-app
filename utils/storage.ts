// Utility functions for managing simple local storage flags and data.
// IMPORTANT: This uses standard localStorage and is NOT secure for sensitive data like PINs.
// It serves as a placeholder for integration with Capacitor Secure Storage or similar.

const ONBOARDING_KEY = 'app_onboarding_completed';
const PIN_HASH_KEY = 'app_pin_hash';

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
  if (typeof window !== 'undefined') {
    return localStorage.getItem(PIN_HASH_KEY);
  }
  return null;
};

/**
 * Stores a (dummy) PIN hash.
 * @param hash - The dummy hash string to store.
 * @returns Promise<void>
 */
export const setPinHash = async (hash: string): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PIN_HASH_KEY, hash);
  }
};

/**
 * Clears all authentication-related flags and data from local storage.
 * @returns Promise<void>
 */
export const clearAll = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(PIN_HASH_KEY);
    // Add removal of session token key here when implemented
  }
};
