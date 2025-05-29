import { describe, it, expect, beforeEach } from 'vitest';
import { hashPin, verifyPin } from '@/utils/pin-utils';

describe('Pin Utils Integration Tests', () => {
  describe('PIN Hashing and Verification', () => {
    it('should hash and verify PIN correctly', async () => {
      const pin = '1234';
      const hash = await hashPin(pin);
      
      // check hash format
      const parts = hash.split('.');
      expect(parts).toHaveLength(3);
      expect(parseInt(parts[0])).toBe(100_000); // number of iterations
      expect(parts[1]).toBeTruthy(); // salt
      expect(parts[2]).toBeTruthy(); // hash
      
      // check if pin is valid
      const isValid = await verifyPin(pin, hash);
      expect(isValid).toBe(true);
    });

    it('should generate unique hashes for same PIN', async () => {
      const pin = '1234';
      const hash1 = await hashPin(pin);
      const hash2 = await hashPin(pin);
      
      // hash should be different due to the salt
      expect(hash1).not.toBe(hash2);
      
      // both hashes should be valid
      expect(await verifyPin(pin, hash1)).toBe(true);
      expect(await verifyPin(pin, hash2)).toBe(true);
    });

    it('should reject wrong PIN', async () => {
      const correctPin = '1234';
      const wrongPin = '4321';
      
      const hash = await hashPin(correctPin);
      const isValid = await verifyPin(wrongPin, hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle special characters in PIN', async () => {
      const specialPin = '12@#$%^&*()34';
      const hash = await hashPin(specialPin);
      
      expect(await verifyPin(specialPin, hash)).toBe(true);
      expect(await verifyPin('wrong', hash)).toBe(false);
    });

    it('should handle empty PIN', async () => {
      const emptyPin = '';
      const hash = await hashPin(emptyPin);
      
      expect(await verifyPin(emptyPin, hash)).toBe(true);
      expect(await verifyPin('not-empty', hash)).toBe(false);
    });

    it('should handle very long PIN', async () => {
      const longPin = '1'.repeat(100);
      const hash = await hashPin(longPin);
      
      expect(await verifyPin(longPin, hash)).toBe(true);
      expect(await verifyPin(longPin.substring(1), hash)).toBe(false);
    });

    it('should reject malformed hash', async () => {
      const pin = '1234';
      
      // test invalid hash formats
      expect(await verifyPin(pin, 'invalid')).toBe(false);
      expect(await verifyPin(pin, 'invalid.hash')).toBe(false);
      expect(await verifyPin(pin, 'invalid.hash.format')).toBe(false);
      expect(await verifyPin(pin, '100000.invalidbase64.hash')).toBe(false);
    });
  });
}); 