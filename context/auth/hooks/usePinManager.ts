/**
 * usePinManager.ts
 * 
 * Custom hook for centralized PIN management across the authentication flow.
 * Handles PIN creation, validation, hash storage, and attempt tracking.
 */
import { useCallback } from 'react';
import { info, warn, error as logError } from '@/utils/logger';
import {
  setPin as serviceSetPin,
  validatePin as serviceValidatePin,
  clearPin as serviceClearPin,
  isPinSet as serviceIsPinSet,
  resetAttempts as serviceResetAttempts,
  getLockUntil as serviceGetLockUntil,
  isLocked as serviceIsLocked,
  clearLockout as serviceClearLockout
} from '@/utils/pin-service';
import { isPinForgotten, setPinForgotten } from '@/utils/storage';

/**
 * Custom hook for managing PIN authentication.
 * 
 * This hook provides functions to set, validate, and clear PINs,
 * along with handling PIN attempt tracking and security measures.
 * 
 * @param dispatch - The dispatch function from the auth reducer
 * @param t - Translation function
 * @returns Object containing PIN management functions
 */
export const usePinManager = (
  dispatch: React.Dispatch<any>, 
  t: (key: string, params?: Record<string, any>) => string
) => {
  /**
   * Sets a new PIN and stores its hash securely.
   * 
   * @param pin - The PIN to set
   * @returns Promise resolving to true if successful, false otherwise
   */
  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    info('[PinManager] Setting PIN...');
    try {
      await serviceSetPin(pin);
      info('[PinManager] PIN set successfully.');
      dispatch({ type: 'SET_STEP_DATA', payload: { pinSet: true } });
      return true;
    } catch (err) {
      logError('[PinManager] Failed to set PIN:', err);
      dispatch({ type: 'SET_FLOW_ERROR', payload: t('errors.PIN_SET_FAILED') });
      return false;
    }
  }, [dispatch, t]);

  /**
   * Validates a PIN against the stored hash.
   * Tracks invalid attempts and implements security lockout after max attempts.
   * 
   * @param pin - The PIN to validate
   * @returns Promise resolving to true if PIN is valid, false otherwise
   */
  const validatePin = useCallback(async (pin: string): Promise<boolean> => {
    info('[PinManager] Validating PIN');
    try {
      const result = await serviceValidatePin(pin);
      if (result.valid) {
        info('[PinManager] PIN validation successful.');
        return true;
      }

      dispatch({
        type: 'SET_FLOW_ERROR',
        payload: t('errors.PIN_INVALID', { count: (result.attemptsRemaining || 0).toString() })
      });
      return false;
    } catch (err: any) {
      logError('[PinManager] Error validating PIN:', err);
      return false;
    }
  }, [dispatch, t]);

  /**
   * Simple PIN check without incrementing attempts (for testing/internal use)
   */
  const checkPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      // Allow hardcoded PIN for development
      if (process.env.NODE_ENV !== 'production' && pin === "1234") {
        return true;
      }
      // We want a simple boolean check; ignore lock/attempts logic here
      const validRes = await serviceValidatePin(pin);
      return validRes.valid;
    } catch (err) {
      logError('[PinManager] Error checking PIN:', err);
      return false;
    }
  }, []);

  /**
   * Checks if a PIN has been set in the system.
   * 
   * @returns Promise resolving to true if PIN exists, false otherwise
   */
  const isPinSet = useCallback((): Promise<boolean> => {
    return serviceIsPinSet();
  }, []);

  /**
   * Clears the stored PIN hash and resets security state.
   * 
   * @returns Promise resolving to true if successful, false otherwise
   */
  const clearPin = useCallback(async (): Promise<boolean> => {
    try {
      await serviceClearPin();
      info('[PinManager] PIN cleared successfully.');
      dispatch({ type: 'SET_STEP_DATA', payload: { pinSet: false } });
      return true;
    } catch (err) {
      logError('[PinManager] Error clearing PIN:', err);
      return false;
    }
  }, [dispatch]);

  /**
   * Resets the PIN attempt counter without affecting the PIN itself.
   * @returns Promise resolving when attempts are reset
   */
  const resetAttempts = useCallback(async (): Promise<void> => {
    await serviceResetAttempts();
  }, []);

  return {
    setPin,
    validatePin,
    checkPin,
    isPinSet,
    clearPin,
    resetAttempts,
    // Lockout utilities
    getLockUntil: serviceGetLockUntil,
    isLocked: serviceIsLocked,
    clearLockout: serviceClearLockout,
    isPinForgotten,
    setPinForgotten: async () => {
      await setPinForgotten();
      await clearPin();
    }
  };
}
