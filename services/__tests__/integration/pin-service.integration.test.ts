import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setPin,
  validatePin,
  clearPin,
  isPinSet,
  getLockUntil,
  resetAttempts,
  clearLockout,
  isLocked
} from '@/utils/pin-service';
import { MAX_PIN_ATTEMPTS } from '@/constants/auth-constants';

describe('Pin Service Integration Tests', () => {
  // clear pin before each test
  beforeEach(async () => {
    await clearPin();
  });

  // clear pin after each test
  afterEach(async () => {
    await clearPin();
  });

  describe('PIN Management', () => {
    it('should set and validate PIN correctly', async () => {
      const pin = '1234';
      
      // check if pin is not set in the beginning
      expect(await isPinSet()).toBe(false);
      
      // set new pin
      await setPin(pin);
      
      // check if pin is set
      expect(await isPinSet()).toBe(true);
      
      // check if pin is valid
      const validResult = await validatePin(pin);
      expect(validResult.valid).toBe(true);
      
      // check if pin is invalid
      const invalidResult = await validatePin('5555');
      expect(invalidResult.valid).toBe(false);
    });

    it('should handle lockout after multiple failed attempts', async () => {
      const pin = '1234';
      await setPin(pin);
      
      // multiple failed attempts
      for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
        await validatePin('wrong');
      }
      
      // check if pin is locked
      const isLockedNow = await isLocked();
      expect(isLockedNow).toBe(true);
      
      // attempt to use correct pin while locked
      const lockedResult = await validatePin(pin);
      expect(lockedResult.locked).toBe(true);
      
      // clear lockout
      await clearLockout();
      
      // check if pin is valid after clearing lockout
      const unlockedResult = await validatePin(pin);
      expect(unlockedResult.valid).toBe(true);
    });

    it('should clear PIN and reset state', async () => {
      const pin = '1234';
      await setPin(pin);
      
      // check if pin is set
      expect(await isPinSet()).toBe(true);
      
      // clear pin
      await clearPin();
      
      // check if pin is not set
      expect(await isPinSet()).toBe(false);
      
      // check if lockout is not set
      expect(await isLocked()).toBe(false);
    });

    it('should track remaining attempts correctly', async () => {
      const pin = '1234';
      await setPin(pin);
      
      // wrong attempt
      const result = await validatePin('wrong');
      expect(result.attemptsRemaining).toBe(MAX_PIN_ATTEMPTS - 1);
      
      // reset attempts
      await resetAttempts();
      
      // check if attempts are reset
      const newResult = await validatePin('wrong');
      expect(newResult.attemptsRemaining).toBe(MAX_PIN_ATTEMPTS - 1);
    });
  });
}); 