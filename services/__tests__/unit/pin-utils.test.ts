import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPin, verifyPin } from '@/utils/pin-utils';
import { info, error as logError } from '@/utils/logger';

// Mock the logger
vi.mock('@/utils/logger', () => ({
  info: vi.fn(),
  error: vi.fn()
}));

// Mock crypto.subtle
const mockSubtle = {
  importKey: vi.fn().mockImplementation(async (format, keyData, algorithm, extractable, keyUsages) => {
    return { keyData, algorithm };
  }),
  deriveBits: vi.fn().mockImplementation(async (algorithm, key, length) => {
    const keyData = (key as any).keyData;
    const iterations = algorithm.iterations;
    const hash = btoa(keyData + '_' + iterations + '_' + length);
    return new Uint8Array(hash.split('').map(c => c.charCodeAt(0)));
  })
};

vi.stubGlobal('crypto', {
  subtle: mockSubtle,
  getRandomValues: vi.fn().mockImplementation((arr) => {
    // Generate truly random values for testing
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
});

describe('Pin Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset crypto.subtle mocks
    mockSubtle.importKey.mockClear();
    mockSubtle.deriveBits.mockClear();
  });

  describe('hashPin', () => {
    it('should generate a valid hash string with correct format', async () => {
      const pin = '1234';
      const hash = await hashPin(pin);

      // Check format: "<iterations>.<saltBase64>.<hashBase64>"
      const parts = hash.split('.');
      expect(parts).toHaveLength(3);
      expect(parseInt(parts[0], 10)).toBe(100_000); // ITERATIONS
      expect(parts[1]).toMatch(/^[A-Za-z0-9+/=]+$/); // Valid base64
      expect(parts[2]).toMatch(/^[A-Za-z0-9+/=]+$/); // Valid base64
    });

    it('should generate different hashes for the same PIN', async () => {
      const pin = '1234';
      const hash1 = await hashPin(pin);
      const hash2 = await hashPin(pin);
      console.log('hash1', hash1);
      console.log('hash2', hash2);
      expect(hash1).not.toBe(hash2); // Different salts should produce different hashes
    });

    it('should handle empty PIN', async () => {
      const hash = await hashPin('');
      const parts = hash.split('.');
      expect(parts).toHaveLength(3);
      expect(parseInt(parts[0], 10)).toBe(100_000);
    });
  });

  describe('verifyPin', () => {
    it('should verify correct PIN', async () => {
      const pin = '1234';
      const hash = await hashPin(pin);
      const result = await verifyPin(pin, hash);
      expect(result).toBe(true);
    });

    it('should reject incorrect PIN', async () => {
      const pin = '1234';
      const hash = await hashPin(pin);
      const result = await verifyPin('wrong', hash);
      expect(result).toBe(false);
    });

    it('should handle empty PIN verification', async () => {
      const pin = '';
      const hash = await hashPin(pin);
      const result = await verifyPin(pin, hash);
      expect(result).toBe(true);
    });

    it('should reject invalid hash format', async () => {
      const result = await verifyPin('1234', 'invalid.hash.format');
      expect(result).toBe(false);
      expect(logError).toHaveBeenCalledWith('[pin-utils] Invalid components in stored hash.');
    });

    it('should reject hash with invalid components', async () => {
      const result = await verifyPin('1234', '100000.!!!!.hash');
      expect(result).toBe(false);
      expect(logError).toHaveBeenCalledWith('[pin-utils] Error verifying PIN:', expect.any(Error));
    });

    it('should log verification attempts', async () => {
      const pin = '1234';
      const hash = await hashPin(pin);
      await verifyPin(pin, hash);

      expect(info).toHaveBeenCalledWith(
        '[pin-utils] Verifying PIN using Web Crypto:',
        expect.objectContaining({
          pin,
          storedHash: hash
        })
      );
    });

    it('should handle crypto errors gracefully', async () => {
      mockSubtle.importKey.mockRejectedValueOnce(new Error('Crypto error'));

      const result = await verifyPin('1234', '100000.salt.hash');
      expect(result).toBe(false);
      expect(logError).toHaveBeenCalledWith(
        '[pin-utils] Error verifying PIN:',
        expect.any(Error)
      );
    });

    it('should verify PIN with different iterations', async () => {
      const pin = '1234';
      const hash = await hashPin(pin);
      
      // Modify iterations in the hash
      const parts = hash.split('.');
      parts[0] = '200000'; // Double the iterations
      const modifiedHash = parts.join('.');

      const result = await verifyPin(pin, modifiedHash);
      expect(result).toBe(false); // Should fail because iterations don't match
    });

    it('should handle very long PINs', async () => {
      const longPin = '1'.repeat(1000); // Very long PIN
      const hash = await hashPin(longPin);
      const result = await verifyPin(longPin, hash);
      expect(result).toBe(true);
    });
  });
}); 