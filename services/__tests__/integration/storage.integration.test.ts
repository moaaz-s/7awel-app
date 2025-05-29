import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
import { MAX_PIN_ATTEMPTS } from '@/constants/auth-constants';

describe('Storage Integration Tests', () => {
  // Clean up after each test
  afterEach(async () => {
    await clearPinHash();
    await clearPinForgotten();
    await clearSession();
    await resetPinAttempts();
    await setPinLockUntil(0);
    await resetOtpAttempts('test@example.com');
    await setOtpLockUntil('test@example.com', 0);
  });

  describe('PIN Hash Management', () => {
    it('should store and retrieve PIN hash', async () => {
      const hash = '100000.salt.hash';
      await setPinHash(hash);
      
      const retrieved = await getPinHash();
      expect(retrieved).toBe(hash);
    });

    it('should return null when PIN hash is not set', async () => {
      await clearPinHash();
      const hash = await getPinHash();
      expect(hash).toBeNull();
    });

    it('should clear PIN hash and related data', async () => {
      // Set up initial state
      await setPinHash('test-hash');
      await incrementPinAttempts();
      await setPinLockUntil(Date.now() + 1000);

      // Clear everything
      await clearPinHash();

      // Verify everything is cleared
      const [hash, attempts, lockUntil] = await Promise.all([
        getPinHash(),
        getPinAttempts(),
        getPinLockUntil()
      ]);

      expect(hash).toBeNull();
      expect(attempts).toBe(0);
      expect(lockUntil).toBeNull();
    });
  });

  describe('PIN Forgotten State', () => {
    it('should manage PIN forgotten state correctly', async () => {
      // Initially should be false
      expect(await isPinForgotten()).toBe(false);

      // Set forgotten state
      await setPinForgotten();
      expect(await isPinForgotten()).toBe(true);

      // Clear forgotten state
      await clearPinForgotten();
      expect(await isPinForgotten()).toBe(false);
    });
  });

  describe('Session Management', () => {
    const testSession = {
      isActive: true,
      lastActivity: Date.now(),
      expiresAt: Date.now() + 3600000,
      pinVerified: true
    };

    it('should store and retrieve session', async () => {
      await setSession(testSession);
      const retrieved = await getSession();
      expect(retrieved).toEqual(testSession);
    });

    it('should handle expired session', async () => {
      const expiredSession = {
        ...testSession,
        expiresAt: Date.now() - 1000 // Already expired
      };

      await setSession(expiredSession);
      const retrieved = await getSession();
      expect(retrieved).toBeNull(); // Should return null for expired session
    });

    it('should clear session', async () => {
      await setSession(testSession);
      await clearSession();
      const retrieved = await getSession();
      expect(retrieved).toBeNull();
    });
  });

  describe('PIN Attempts Management', () => {
    it('should track PIN attempts correctly', async () => {
      // Initially should be 0
      expect(await getPinAttempts()).toBe(0);

      // Increment a few times
      await incrementPinAttempts();
      await incrementPinAttempts();
      expect(await getPinAttempts()).toBe(2);

      // Reset attempts
      await resetPinAttempts();
      expect(await getPinAttempts()).toBe(0);
    });

    it('should not exceed MAX_PIN_ATTEMPTS', async () => {
      // Set attempts to max
      for (let i = 0; i < MAX_PIN_ATTEMPTS + 2; i++) {
        await incrementPinAttempts();
      }

      const attempts = await getPinAttempts();
      expect(attempts).toBe(MAX_PIN_ATTEMPTS);
    });
  });

  describe('OTP Management', () => {
    const testEmail = 'test@example.com';

    it('should manage OTP attempts correctly', async () => {
      // Initially should be 0
      expect(await getOtpAttempts(testEmail)).toBe(0);

      // Increment attempts
      await incrementOtpAttempts(testEmail);
      await incrementOtpAttempts(testEmail);
      expect(await getOtpAttempts(testEmail)).toBe(2);

      // Reset attempts
      await resetOtpAttempts(testEmail);
      expect(await getOtpAttempts(testEmail)).toBe(0);
    });

    it('should manage OTP lockout correctly', async () => {
      const lockTime = Date.now() + 300000; // 5 minutes from now
      
      await setOtpLockUntil(testEmail, lockTime);
      const retrieved = await getOtpLockUntil(testEmail);
      expect(retrieved).toBe(lockTime);

      // Clear lockout
      await setOtpLockUntil(testEmail, 0);
      expect(await getOtpLockUntil(testEmail)).toBe(0);
    });
  });
}); 