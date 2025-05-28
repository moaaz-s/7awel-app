import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPinHash,
  setPinHash,
  clearPinHash,
  setPinForgotten,
  clearPinForgotten,
  isPinForgotten,
  getSession,
  setSession,
  clearSession,
  getPinAttempts,
  incrementPinAttempts,
  resetPinAttempts,
  getPinLockUntil,
  setPinLockUntil,
  getOtpAttempts,
  incrementOtpAttempts,
  resetOtpAttempts,
  getOtpLockUntil,
  setOtpLockUntil
} from '@/utils/storage';
import { getItem, setItem, removeItem } from '@/utils/secure-storage';
import { info, error } from '@/utils/logger';
import { MAX_PIN_ATTEMPTS } from '@/constants/auth-constants';
import { PIN_FORGOT } from '@/constants/storage-keys';

// Mock secure storage
vi.mock('@/utils/secure-storage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  info: vi.fn(),
  error: vi.fn()
}));

describe('Storage Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window check
    vi.stubGlobal('window', {});
  });

  describe('PIN Hash Management', () => {
    it('should get PIN hash from secure storage', async () => {
      const hash = 'test-hash';
      (getItem as any).mockResolvedValueOnce(hash);
      
      const result = await getPinHash();
      
      expect(result).toBe(hash);
      expect(getItem).toHaveBeenCalledWith('app_pin_hash');
      expect(info).toHaveBeenCalledWith('[storage] Retrieved PIN hash from secure storage:', hash);
    });

    it('should return null for empty PIN hash', async () => {
      (getItem as any).mockResolvedValueOnce('');
      
      const result = await getPinHash();
      
      expect(result).toBeNull();
    });

    it('should set PIN hash in secure storage', async () => {
      const hash = 'test-hash';
      
      await setPinHash(hash);
      
      expect(setItem).toHaveBeenCalledWith('app_pin_hash', hash);
      expect(info).toHaveBeenCalledWith('[storage] setPinHash: writing', hash);
    });

    it('should clear PIN hash and reset attempts', async () => {
      await clearPinHash();
      
      expect(removeItem).toHaveBeenCalledWith('app_pin_hash');
      expect(removeItem).toHaveBeenCalledWith('app_pin_attempts');
      expect(setItem).toHaveBeenCalledWith('app_pin_lock_until', '0');
    });
  });

  describe('PIN Forgotten State', () => {
    it('should set PIN forgotten state', async () => {
      await setPinForgotten();
      
      expect(setItem).toHaveBeenCalledWith(PIN_FORGOT, 'true');
    });

    it('should clear PIN forgotten state', async () => {
      await clearPinForgotten();
      
      expect(removeItem).toHaveBeenCalledWith(PIN_FORGOT);
    });

    it('should check PIN forgotten state', async () => {
      (getItem as any).mockResolvedValueOnce('true');
      
      const result = await isPinForgotten();
      
      expect(result).toBe(true);
      expect(getItem).toHaveBeenCalledWith(PIN_FORGOT);
    });
  });

  describe('Session Management', () => {
    const mockSession = {
      isActive: true,
      lastActivity: Date.now(),
      expiresAt: Date.now() + 3600000,
      pinVerified: true
    };

    it('should get valid session', async () => {
      (getItem as any).mockResolvedValueOnce(JSON.stringify(mockSession));
      
      const result = await getSession();
      
      expect(result).toEqual(mockSession);
      expect(getItem).toHaveBeenCalledWith('app_session');
    });

    it('should return null for expired session', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: Date.now() - 1000
      };
      (getItem as any).mockResolvedValueOnce(JSON.stringify(expiredSession));
      
      const result = await getSession();
      
      expect(result).toBeNull();
      expect(removeItem).toHaveBeenCalledWith('app_session');
    });

    it('should handle invalid session data', async () => {
      (getItem as any).mockResolvedValueOnce('invalid-json');
      
      const result = await getSession();
      
      expect(result).toBeNull();
      expect(error).toHaveBeenCalled();
    });

    it('should set session', async () => {
      await setSession(mockSession);
      
      expect(setItem).toHaveBeenCalledWith('app_session', JSON.stringify(mockSession));
    });

    it('should clear session', async () => {
      await clearSession();
      
      expect(removeItem).toHaveBeenCalledWith('app_session');
    });
  });

  describe('PIN Attempts Management', () => {
    it('should get PIN attempts', async () => {
      (getItem as any).mockResolvedValueOnce('3');
      
      const result = await getPinAttempts();
      
      expect(result).toBe(3);
      expect(getItem).toHaveBeenCalledWith('app_pin_attempts');
    });

    it('should increment PIN attempts', async () => {
      (getItem as any).mockResolvedValueOnce('2');
      
      const result = await incrementPinAttempts();
      
      expect(result).toBe(3);
      expect(setItem).toHaveBeenCalledWith('app_pin_attempts', '3');
    });

    it('should not exceed max PIN attempts', async () => {
      (getItem as any).mockResolvedValueOnce(String(MAX_PIN_ATTEMPTS));
      
      const result = await incrementPinAttempts();
      
      expect(result).toBe(MAX_PIN_ATTEMPTS);
      expect(setItem).toHaveBeenCalledWith('app_pin_attempts', String(MAX_PIN_ATTEMPTS));
    });

    it('should reset PIN attempts', async () => {
      await resetPinAttempts();
      
      expect(removeItem).toHaveBeenCalledWith('app_pin_attempts');
    });
  });

  describe('PIN Lock Management', () => {
    it('should get PIN lock until timestamp', async () => {
      const timestamp = Date.now() + 3600000;
      (getItem as any).mockResolvedValueOnce(String(timestamp));
      
      const result = await getPinLockUntil();
      
      expect(result).toBe(timestamp);
      expect(getItem).toHaveBeenCalledWith('app_pin_lock_until');
    });

    it('should set PIN lock until timestamp', async () => {
      const timestamp = Date.now() + 3600000;
      
      await setPinLockUntil(timestamp);
      
      expect(setItem).toHaveBeenCalledWith('app_pin_lock_until', String(timestamp));
    });
  });

  describe('OTP Management', () => {
    const testValue = 'test@example.com';

    it('should get OTP attempts', async () => {
      (getItem as any).mockResolvedValueOnce('2');
      
      const result = await getOtpAttempts(testValue);
      
      expect(result).toBe(2);
      expect(getItem).toHaveBeenCalledWith('app_otp_attempts_test%40example.com');
    });

    it('should increment OTP attempts', async () => {
      (getItem as any).mockResolvedValueOnce('1');
      
      const result = await incrementOtpAttempts(testValue);
      
      expect(result).toBe(2);
      expect(setItem).toHaveBeenCalledWith('app_otp_attempts_test%40example.com', '2');
    });

    it('should reset OTP attempts', async () => {
      await resetOtpAttempts(testValue);
      
      expect(removeItem).toHaveBeenCalledWith('app_otp_attempts_test%40example.com');
    });

    it('should get OTP lock until timestamp', async () => {
      const timestamp = Date.now() + 3600000;
      (getItem as any).mockResolvedValueOnce(String(timestamp));
      
      const result = await getOtpLockUntil(testValue);
      
      expect(result).toBe(timestamp);
      expect(getItem).toHaveBeenCalledWith('app_otp_lock_until_test%40example.com');
    });

    it('should set OTP lock until timestamp', async () => {
      const timestamp = Date.now() + 3600000;
      
      await setOtpLockUntil(testValue, timestamp);
      
      expect(setItem).toHaveBeenCalledWith('app_otp_lock_until_test%40example.com', String(timestamp));
    });
  });
}); 