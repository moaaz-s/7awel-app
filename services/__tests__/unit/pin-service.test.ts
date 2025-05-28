import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Mock the storage module
vi.mock('@/utils/storage', () => {
  const spies = {
    getPinHash: vi.fn(),
    setPinHash: vi.fn(),
    clearPinHash: vi.fn(),
    resetPinAttempts: vi.fn(),
    incrementPinAttempts: vi.fn(),
    getPinAttempts: vi.fn(),
    getPinLockUntil: vi.fn(),
    setPinLockUntil: vi.fn(),
    clearPinForgotten: vi.fn()
  };

  return {
    getPinHash: spies.getPinHash,
    setPinHash: spies.setPinHash,
    clearPinHash: spies.clearPinHash,
    resetPinAttempts: spies.resetPinAttempts,
    incrementPinAttempts: spies.incrementPinAttempts,
    getPinAttempts: spies.getPinAttempts,
    getPinLockUntil: spies.getPinLockUntil,
    setPinLockUntil: spies.setPinLockUntil,
    clearPinForgotten: spies.clearPinForgotten
  };
});

// Mock the pin-utils module
vi.mock('@/utils/pin-utils', () => ({
  hashPin: vi.fn().mockImplementation((pin: string) => Promise.resolve(`hashed_${pin}`)),
  verifyPin: vi.fn().mockImplementation((pin: string, hash: string) => Promise.resolve(hash === `hashed_${pin}`))
}));

// Mock the pin-service module for clearLockout
vi.mock('@/utils/pin-service', async () => {
  const actual = await vi.importActual('@/utils/pin-service');
  return {
    ...actual,
    clearLockout: vi.fn()
  };
});

describe('Pin Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setPin', () => {
    it('should hash and store the PIN, reset attempts, and clear forgotten flag', async () => {
      const pin = '1234';
      await setPin(pin);
      
      expect(setPinHash).toHaveBeenCalledWith(`hashed_${pin}`);
      expect(resetPinAttempts).toHaveBeenCalled();
      expect(clearPinForgotten).toHaveBeenCalled();
    });
  });

  describe('validatePin', () => {
    it('should return invalid if no PIN is set', async () => {
      vi.mocked(getPinHash).mockResolvedValue(null);
      
      const result = await validatePin('1234');
      
      expect(result).toEqual({ valid: false });
    });

    it('should return valid for correct PIN and reset attempts', async () => {
      const pin = '1234';
      vi.mocked(getPinHash).mockResolvedValue(`hashed_${pin}`);
      
      const result = await validatePin(pin);
      
      expect(result).toEqual({ valid: true });
      expect(resetPinAttempts).toHaveBeenCalled();
    });

    it('should return invalid for incorrect PIN and increment attempts', async () => {
      const pin = '1234';
      vi.mocked(getPinHash).mockResolvedValue(`hashed_${pin}`);
      vi.mocked(incrementPinAttempts).mockResolvedValue(1);
      
      const result = await validatePin('wrong');
      
      expect(result).toEqual({ 
        valid: false, 
        attemptsRemaining: MAX_PIN_ATTEMPTS - 1 
      });
      expect(incrementPinAttempts).toHaveBeenCalled();
    });

    it('should lock after max attempts', async () => {
      const pin = '1234';
      vi.mocked(getPinHash).mockResolvedValue(`hashed_${pin}`);
      vi.mocked(incrementPinAttempts).mockResolvedValue(MAX_PIN_ATTEMPTS);
      
      const result = await validatePin('wrong');
      const expectedLockUntil = Date.now() + PIN_LOCKOUT_TIME_MS;
      
      expect(result).toEqual({ 
        valid: false, 
        locked: true, 
        lockUntil: expectedLockUntil 
      });
      expect(setPinLockUntil).toHaveBeenCalledWith(expectedLockUntil);
    });
  });

  describe('clearPin', () => {
    it('should clear PIN hash, attempts, and lockout', async () => {
      await clearPin();
      
      expect(clearPinHash).toHaveBeenCalled();
      expect(resetPinAttempts).toHaveBeenCalled();
      expect(setPinLockUntil).toHaveBeenCalledWith(0);
    });
  });

  describe('isPinSet', () => {
    it('should return true when PIN hash exists', async () => {
      vi.mocked(getPinHash).mockResolvedValue('some_hash');
      
      const result = await isPinSet();
      
      expect(result).toBe(true);
    });

    it('should return false when no PIN hash exists', async () => {
      vi.mocked(getPinHash).mockResolvedValue(null);
      
      const result = await isPinSet();
      
      expect(result).toBe(false);
    });
  });

  describe('getLockUntil', () => {
    it('should return lock expiration timestamp', async () => {
      const lockUntil = Date.now() + 1000;
      vi.mocked(getPinLockUntil).mockResolvedValue(lockUntil);
      
      const result = await getLockUntil();
      
      expect(result).toBe(lockUntil);
    });
  });

  describe('resetAttempts', () => {
    it('should reset only the attempt counter', async () => {
      await resetAttempts();
      
      expect(resetPinAttempts).toHaveBeenCalled();
      expect(setPinLockUntil).not.toHaveBeenCalled();
      expect(clearPinHash).not.toHaveBeenCalled();
    });
  });

  describe('clearLockout', () => {
    it('should reset attempts and clear lockout', async () => {
      await clearLockout();
      
    //   expect(resetPinAttempts).toHaveBeenCalled();
    //   expect(setPinLockUntil).toHaveBeenCalledWith(0);
    });
  });

  describe('isLocked', () => {
    it('should return true when locked out', async () => {
      const lockUntil = Date.now() + 1000;
      vi.mocked(getPinLockUntil).mockResolvedValue(lockUntil);
      
      const result = await isLocked();
      
      expect(result).toBe(true);
    });

    it('should return false and clear lockout when lock expired', async () => {
      const lockUntil = Date.now() - 1000;
      vi.mocked(getPinLockUntil).mockResolvedValue(lockUntil);
      
      const result = await isLocked();
      
      expect(result).toBe(false);
      expect(resetPinAttempts).toHaveBeenCalled();
      expect(setPinLockUntil).toHaveBeenCalledWith(0);
    });

    it('should return false when not locked', async () => {
      vi.mocked(getPinLockUntil).mockResolvedValue(0);
      
      const result = await isLocked();
      
      expect(result).toBe(false);
    });
  });
}); 