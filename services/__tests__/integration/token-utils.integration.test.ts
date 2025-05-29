import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createToken, decodeToken, isTokenExpired, getTokenInfo } from '@/utils/token-utils';
import { getItem, setItem, removeItem } from '@/utils/secure-storage';
import { AUTH_TOKEN } from '@/constants/storage-keys';

describe('Token Utils Integration', () => {
  // حالة واقعية لبيانات المستخدم
  const mockUserData = {
    sub: 'user123',
    deviceId: 'device456',
    permissions: ['read', 'write'],
    profile: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  };

  describe('Token Lifecycle', () => {
    it('should handle complete token lifecycle', async () => {
      // 1. create token
      const token = createToken(mockUserData, 3600); // valid for 1 hour
      expect(token).toMatch(/^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\./);

      // 2. store token
      await setItem(AUTH_TOKEN, token);
      const storedToken = await getItem(AUTH_TOKEN);
      expect(storedToken).toBe(token);

      // 3. decode token and verify data
      const decoded = decodeToken(token);
      expect(decoded).toMatchObject({
        sub: mockUserData.sub,
        deviceId: mockUserData.deviceId,
        permissions: mockUserData.permissions,
        profile: mockUserData.profile,
        iat: expect.any(Number),
        exp: expect.any(Number)
      });

      // 4. verify token expiration
      expect(isTokenExpired(token)).toBe(false);
      expect(isTokenExpired(token, 4000)).toBe(true); // should expire with large buffer

      // 5. extract token info
      const tokenInfo = getTokenInfo(token);
      expect(tokenInfo).toMatchObject({
        isValid: true,
        subject: mockUserData.sub,
        deviceId: mockUserData.deviceId,
        expiresAt: expect.any(Date),
        remainingSeconds: expect.any(Number)
      });

      // 6. delete token
      await removeItem(AUTH_TOKEN);
      const removedToken = await getItem(AUTH_TOKEN);
      expect(removedToken).toBeNull();
    });
  });

  describe('Token Expiration Scenarios', () => {
    it('should handle expired tokens correctly', () => {
      // create expired token
      const expiredToken = createToken(mockUserData, -3600); // expired 1 hour ago
      
      expect(isTokenExpired(expiredToken)).toBe(true);
      expect(getTokenInfo(expiredToken)).toMatchObject({
        isValid: false,
        subject: mockUserData.sub,
        deviceId: mockUserData.deviceId,
        expiresAt: expect.any(Date),
        remainingSeconds: expect.any(Number)
      });
    });

    it('should handle token expiration buffer periods', () => {
      const token = createToken(mockUserData, 600); // valid for 10 minutes
      
      // verify different buffer periods
      expect(isTokenExpired(token, 0)).toBe(false);
      expect(isTokenExpired(token, 300)).toBe(false); // 5 minutes buffer
      expect(isTokenExpired(token, 900)).toBe(true); // 15 minutes buffer
    });
  });

  describe('Token Format Validation', () => {
    it('should validate token structure', () => {
      const token = createToken(mockUserData);
      const parts = token.split('.');
      
      // verify token structure
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'); // header is constant
      expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/); // payload base64url
      expect(parts[2]).toBe('UNSIGNED'); // signature is constant in test environment
    });

    it('should handle malformed tokens', () => {
      const malformedTokens = [
        'invalid',
        'invalid.token',
        'invalid.token.signature',
        'eyJ.invalid.signature',
        '..'
      ];

      malformedTokens.forEach(token => {
        expect(decodeToken(token)).toBeNull();
        expect(isTokenExpired(token)).toBe(true);
        expect(getTokenInfo(token)).toMatchObject({ isValid: false });
      });
    });
  });

  describe('Token Payload Validation', () => {
    it('should handle tokens with missing claims', () => {
      const incompletePayload = {
        // without sub or deviceId
        someData: 'test'
      };
      
      const token = createToken(incompletePayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toHaveProperty('someData', 'test');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
      expect(decoded).not.toHaveProperty('sub');
      expect(decoded).not.toHaveProperty('deviceId');
    });

    it('should handle tokens with additional claims', () => {
      const extendedPayload = {
        ...mockUserData,
        customClaim: 'custom value',
        nestedData: {
          field1: 'value1',
          field2: 'value2'
        }
      };
      
      const token = createToken(extendedPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toMatchObject(extendedPayload);
      expect(decoded?.customClaim).toBe('custom value');
      expect(decoded?.nestedData).toMatchObject({
        field1: 'value1',
        field2: 'value2'
      });
    });
  });
}); 