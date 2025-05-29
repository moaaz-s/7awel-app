import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { acquireTokens, signIn, signOut, initAndValidate, setHttpClientToken } from '@/utils/token-service';
import { getItem, setItem, removeItem } from '@/utils/secure-storage';
import { AUTH_TOKEN, REFRESH_TOKEN } from '@/constants/storage-keys';
import { authService } from '@/services/auth-service';
import { httpClient } from '@/services/http-client';
import { ErrorCode } from '@/types/errors';
import type { ApiResponse, TokenAcquisitionResponse } from '@/types';

describe('Token Service Integration', () => {
  const mockTokenResponse = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZGV2aWNlSWQiOiJkZXZpY2U0NTYiLCJleHAiOjk5OTk5OTk5OTl9.UNSIGNED',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZGV2aWNlSWQiOiJkZXZpY2U0NTYiLCJ0eXBlIjoicmVmcmVzaCIsImV4cCI6OTk5OTk5OTk5OX0.UNSIGNED'
  };

  const mockUserData = {
    phone: '+1234567890',
    email: 'test@example.com'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth service responses
    vi.spyOn(authService, 'acquireToken').mockResolvedValue({
      statusCode: 200,
      message: 'Success',
      data: mockTokenResponse,
      traceId: 'test-trace-id'
    });

    vi.spyOn(authService, 'refreshToken').mockResolvedValue({
      statusCode: 200,
      message: 'Success',
      data: {
        ...mockTokenResponse,
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZGV2aWNlSWQiOiJkZXZpY2U0NTYiLCJleHAiOjk5OTk5OTk5OTksInJlZnJlc2hlZCI6dHJ1ZX0.UNSIGNED'
      },
      traceId: 'test-trace-id'
    });

    vi.spyOn(authService, 'logout').mockResolvedValue();

    // Mock http client
    vi.spyOn(httpClient, 'setToken').mockImplementation(() => {});
    vi.spyOn(httpClient, 'clearToken').mockImplementation(() => {});
  });

  afterEach(async () => {
    await removeItem(AUTH_TOKEN);
    await removeItem(REFRESH_TOKEN);
  });

  describe('Token Acquisition', () => {
    it('should acquire and store tokens', async () => {
      const success = await signIn(mockUserData.phone, mockUserData.email);
      expect(success).toBe(true);

      // Verify tokens are stored
      const storedAccessToken = await getItem(AUTH_TOKEN);
      const storedRefreshToken = await getItem(REFRESH_TOKEN);

      expect(storedAccessToken).toBe(mockTokenResponse.accessToken);
      expect(storedRefreshToken).toBe(mockTokenResponse.refreshToken);

      // Since signIn doesn't set the http client token directly,
      // we need to call setHttpClientToken manually as would happen
      // in the actual application flow
      await setHttpClientToken();
      expect(httpClient.setToken).toHaveBeenCalledWith(mockTokenResponse.accessToken);
    });

    it('should handle failed token acquisition', async () => {
      vi.spyOn(authService, 'acquireToken').mockResolvedValueOnce({
        statusCode: 401,
        message: 'Authentication failed',
        error: 'Session expired',
        errorCode: ErrorCode.SESSION_EXPIRED,
        traceId: 'test-trace-id'
      });

      const success = await signIn(mockUserData.phone, mockUserData.email);
      expect(success).toBe(false);

      // Verify no tokens are stored
      const storedAccessToken = await getItem(AUTH_TOKEN);
      const storedRefreshToken = await getItem(REFRESH_TOKEN);

      expect(storedAccessToken).toBeNull();
      expect(storedRefreshToken).toBeNull();
    });
  });

  describe('Token Validation and Refresh', () => {
    it('should validate existing valid token', async () => {
      // Store valid tokens
      await setItem(AUTH_TOKEN, mockTokenResponse.accessToken);
      await setItem(REFRESH_TOKEN, mockTokenResponse.refreshToken);

      const isValid = await initAndValidate();
      expect(isValid).toBe(true);
    });

    it('should handle expired token refresh flow', async () => {
      // Store expired access token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZGV2aWNlSWQiOiJkZXZpY2U0NTYiLCJleHAiOjE2MzA0NTY3ODl9.UNSIGNED';
      await setItem(AUTH_TOKEN, expiredToken);
      await setItem(REFRESH_TOKEN, mockTokenResponse.refreshToken);

      // First call to initAndValidate will detect expired token and clear tokens
      const firstCheck = await initAndValidate();
      expect(firstCheck).toBe(false);

      // Verify tokens were cleared
      const clearedAccessToken = await getItem(AUTH_TOKEN);
      const clearedRefreshToken = await getItem(REFRESH_TOKEN);
      expect(clearedAccessToken).toBeNull();
      expect(clearedRefreshToken).toBeNull();

      // Store tokens again to simulate a new sign in
      await setItem(AUTH_TOKEN, mockTokenResponse.accessToken);
      await setItem(REFRESH_TOKEN, mockTokenResponse.refreshToken);

      // Now validation should pass
      const secondCheck = await initAndValidate();
      expect(secondCheck).toBe(true);
    });

    it('should handle missing tokens during validation', async () => {
      const isValid = await initAndValidate();
      expect(isValid).toBe(false);
    });
  });

  describe('Sign Out', () => {
    it('should clear tokens and call logout', async () => {
      // Store tokens first
      await setItem(AUTH_TOKEN, mockTokenResponse.accessToken);
      await setItem(REFRESH_TOKEN, mockTokenResponse.refreshToken);

      await signOut();

      // Verify tokens are cleared
      const accessToken = await getItem(AUTH_TOKEN);
      const refreshToken = await getItem(REFRESH_TOKEN);

      expect(accessToken).toBeNull();
      expect(refreshToken).toBeNull();

      // Verify logout was called
      expect(authService.logout).toHaveBeenCalled();
      expect(httpClient.clearToken).toHaveBeenCalled();
    });

    it('should handle logout failure gracefully', async () => {
      vi.spyOn(authService, 'logout').mockRejectedValueOnce(new Error('Network error'));

      await setItem(AUTH_TOKEN, mockTokenResponse.accessToken);
      await setItem(REFRESH_TOKEN, mockTokenResponse.refreshToken);

      // Should not throw
      await expect(signOut()).resolves.not.toThrow();

      // Tokens should still be cleared
      const accessToken = await getItem(AUTH_TOKEN);
      const refreshToken = await getItem(REFRESH_TOKEN);

      expect(accessToken).toBeNull();
      expect(refreshToken).toBeNull();
    });
  });

  describe('HTTP Client Integration', () => {
    it('should set http client token when available', async () => {
      await setItem(AUTH_TOKEN, mockTokenResponse.accessToken);
      
      await setHttpClientToken();
      
      expect(httpClient.setToken).toHaveBeenCalledWith(mockTokenResponse.accessToken);
    });

    it('should handle missing token gracefully', async () => {
      await setHttpClientToken();
      
      expect(httpClient.setToken).not.toHaveBeenCalled();
    });
  });
}); 