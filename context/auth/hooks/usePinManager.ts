/**
 * usePinManager.ts
 * 
 * Custom hook for centralized PIN management across the authentication flow.
 * Handles PIN creation, validation, hash storage, and attempt tracking.
 */
import { useCallback } from 'react';
import { info, warn, error as logError } from '@/utils/logger';
import { hashPin, verifyPin } from '@/utils/pin-utils';
import { 
  getPinHash, 
  clearPinHash, 
  setPinHash, 
  getPinAttempts, 
  incrementPinAttempts, 
  resetPinAttempts 
} from '@/utils/storage';
import { MAX_PIN_ATTEMPTS } from '@/constants/auth-constants';

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
      const hash = await hashPin(pin);
      await setPinHash(hash);
      await resetPinAttempts();
      
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
      const storedHash = await getPinHash();
      
      if (!storedHash) {
        warn('[PinManager] No PIN hash found.');
        return false;
      }
      
      const isValidPin = await verifyPin(pin, storedHash);
      
      if (isValidPin) {
        info('[PinManager] PIN validation successful.');
        await resetPinAttempts();
        // session activation moved to step handlers
        return true;
      } else {
        info('[PinManager] PIN validation failed.');
        const attempts = await incrementPinAttempts();
        
        if (attempts >= MAX_PIN_ATTEMPTS) {
          info('[PinManager] Max PIN attempts reached. Locking account.');
          dispatch({ type: 'LOCKOUT', payload: t('errors.MAX_PIN_ATTEMPTS_REACHED') });
        } else {
          dispatch({ 
            type: 'SET_FLOW_ERROR', 
            payload: t('errors.PIN_INVALID_ATTEMPTS', { count: (MAX_PIN_ATTEMPTS - attempts).toString() }) 
          });
        }
        
        return false;
      }
    } catch (err: any) {
      logError('[PinManager] Error validating PIN:', err.message);
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
      
      const storedHash = await getPinHash();
      return storedHash ? await verifyPin(pin, storedHash) : false;
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
  const isPinSet = useCallback(async (): Promise<boolean> => {
    try {
      const hash = await getPinHash();
      return !!hash;
    } catch (err) {
      logError('[PinManager] Error checking if PIN is set:', err);
      return false;
    }
  }, []);

  /**
   * Clears the stored PIN hash and resets security state.
   * 
   * @returns Promise resolving to true if successful, false otherwise
   */
  const clearPin = useCallback(async (): Promise<boolean> => {
    try {
      await clearPinHash();
      await resetPinAttempts();
      
      info('[PinManager] PIN cleared successfully.');
      dispatch({ type: 'SET_STEP_DATA', payload: { pinSet: false } });
      
      return true;
    } catch (err) {
      logError('[PinManager] Error clearing PIN:', err);
      return false;
    }
  }, [dispatch]);

  return {
    setPin,
    validatePin,
    checkPin,
    isPinSet,
    clearPin
  };
}
