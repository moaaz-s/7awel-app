import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decodeToken, isTokenExpired, getTokenInfo, createToken } from '@/utils/token-utils';
import { info, warn, error } from '@/utils/logger';

// Mock the logger
vi.mock('@/utils/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));

describe('Token Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('decodeToken', () => {
    it('should decode a valid JWT token', () => {
      const payload = { sub: 'user123', exp: 1234567890 };
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(payload))}.signature`;
      
      const result = decodeToken(token);
      
      expect(result).toEqual(payload);
    });

    it('should return null for empty token', () => {
      const result = decodeToken('');
      expect(result).toBeNull();
    });

    it('should return null for invalid token format', () => {
      const result = decodeToken('invalid.token');
      expect(result).toBeNull();
      expect(warn).toHaveBeenCalledWith('[TokenUtils] Invalid token format');
    });

    it('should handle base64url format', () => {
      const payload = { sub: 'user123', exp: 1234567890 };
      const base64url = btoa(JSON.stringify(payload))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64url}.signature`;
      
      const result = decodeToken(token);
      
      expect(result).toEqual(payload);
    });

    it('should handle decoding errors', () => {
      const result = decodeToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-base64.signature');
      expect(result).toBeNull();
      expect(error).toHaveBeenCalled();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for null token', () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it('should return true for expired token', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) - 1000 };
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(payload))}.signature`;
      
      expect(isTokenExpired(token)).toBe(true);
    });

    it('should return false for valid token', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) + 1000 };
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(payload))}.signature`;
      
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should consider buffer period', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) + 200 };
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(payload))}.signature`;
      
      expect(isTokenExpired(token, 300)).toBe(true);
    });

    it('should handle invalid token', () => {
      expect(isTokenExpired('invalid.token')).toBe(true);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('getTokenInfo', () => {
    it('should return null for null token', () => {
      expect(getTokenInfo(null)).toEqual({ isValid: false });
    });

    it('should return token information for valid token', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const payload = { sub: 'user123', exp, deviceId: 'device123' };
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(payload))}.signature`;
      
      const result = getTokenInfo(token);
      
      expect(result).toEqual({
        isValid: true,
        expiresAt: new Date(exp * 1000),
        subject: 'user123',
        deviceId: 'device123',
        remainingSeconds: expect.any(Number)
      });
    });

    it('should handle invalid token', () => {
      const result = getTokenInfo('invalid.token');
      expect(result).toEqual({ isValid: false });
    });
  });

  describe('createToken', () => {
    it('should create a valid JWT token', () => {
      const payload = { sub: 'user123', deviceId: 'device123' };
      const token = createToken(payload);
      
      expect(token).toMatch(/^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      
      const decoded = decodeToken(token);
      expect(decoded).toMatchObject({
        sub: 'user123',
        deviceId: 'device123',
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
    });

    it('should use custom expiration time', () => {
      const payload = { sub: 'user123' };
      const expiresInSeconds = 3600;
      const token = createToken(payload, expiresInSeconds);
      
      const decoded = decodeToken(token);
      expect(decoded?.exp).toBe(decoded?.iat! + expiresInSeconds);
    });

    it('should handle creation errors', () => {
      vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('JSON error');
      });
      
      expect(() => createToken({ sub: 'user123' })).toThrow('Failed to create token');
      expect(error).toHaveBeenCalled();
    });
  });
}); 