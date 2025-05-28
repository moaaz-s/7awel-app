import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setHttpClientToken,
  acquireTokens,
  initAndValidate,
  signIn,
  signOut
} from '@/utils/token-service';
import { getItem, setItem, removeItem } from '@/utils/secure-storage';
import { authService } from '@/services/auth-service';
import { httpClient } from '@/services/http-client';
import { info, error } from '@/utils/logger';
import { AUTH_TOKEN, REFRESH_TOKEN } from '@/constants/storage-keys';

// Mock dependencies
vi.mock('@/utils/secure-storage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}));

vi.mock('@/services/auth-service', () => ({
  authService: {
    acquireToken: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn()
  }
}));

vi.mock('@/services/http-client', () => ({
  httpClient: {
    setToken: vi.fn(),
    clearToken: vi.fn()
  }
}));

vi.mock('@/utils/logger', () => ({
  info: vi.fn(),
  error: vi.fn()
}));

vi.mock('@/utils/token-utils', () => ({
  isTokenExpired: vi.fn().mockReturnValue(false)
}));

describe('Token Service', () => {
  const mockAuthToken = 'mock-auth-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockPhone = '+1234567890';
  const mockEmail = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setHttpClientToken', () => {
    it('should set token in http client when auth token exists', async () => {
      (getItem as any).mockResolvedValueOnce(mockAuthToken);
      
      await setHttpClientToken();
      
      expect(httpClient.setToken).toHaveBeenCalledWith(mockAuthToken);
      expect(info).toHaveBeenCalledWith('[token-service] Setting http client token');
      expect(info).toHaveBeenCalledWith('[token-service] Token found');
    });

    it('should not set token when auth token is missing', async () => {
      (getItem as any).mockResolvedValueOnce(null);
      
      await setHttpClientToken();
      
      expect(httpClient.setToken).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith('[token-service] Setting http client token');
    });
  });

  describe('acquireTokens', () => {
    it('should successfully acquire and store tokens', async () => {
      const mockResponse = {
        data: {
          accessToken: mockAuthToken,
          refreshToken: mockRefreshToken
        },
        error: null,
        errorCode: null
      };
      (authService.acquireToken as any).mockResolvedValueOnce(mockResponse);
      
      const result = await acquireTokens(mockPhone, mockEmail);
      
      expect(result).toBe(true);
      expect(authService.acquireToken).toHaveBeenCalledWith(mockPhone, mockEmail);
      expect(setItem).toHaveBeenCalledWith(AUTH_TOKEN, mockAuthToken);
      expect(setItem).toHaveBeenCalledWith(REFRESH_TOKEN, mockRefreshToken);
      expect(info).toHaveBeenCalledWith('[token-service] Acquired token:');
    });

    it('should handle missing tokens in response', async () => {
      const mockResponse = {
        data: {},
        error: null,
        errorCode: null
      };
      (authService.acquireToken as any).mockResolvedValueOnce(mockResponse);
      
      const result = await acquireTokens(mockPhone, mockEmail);
      
      expect(result).toBe(false);
      expect(error).toHaveBeenCalled();
    });

    it('should handle acquisition error', async () => {
      const mockResponse = {
        data: null,
        error: new Error('Acquisition failed'),
        errorCode: 'ERROR'
      };
      (authService.acquireToken as any).mockResolvedValueOnce(mockResponse);
      
      const result = await acquireTokens(mockPhone, mockEmail);
      
      expect(result).toBe(false);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('initAndValidate', () => {
    it('should return true for valid token', async () => {
      (getItem as any)
        .mockResolvedValueOnce(mockAuthToken);
      
      const result = await initAndValidate();
      
      expect(result).toBe(true);
    });

    it('should attempt refresh for expired token', async () => {
      // First call for getAuthToken
      (getItem as any).mockResolvedValueOnce(mockAuthToken);
      // Second call for getRefreshToken
      (getItem as any).mockResolvedValueOnce(mockRefreshToken);
      
      // Mock isTokenExpired to return true for this test only
      const isTokenExpiredMock = vi.spyOn(await import('@/utils/token-utils'), 'isTokenExpired');
      isTokenExpiredMock.mockReturnValueOnce(true);
      
      const mockResponse = {
        data: {
          accessToken: 'new-auth-token',
          refreshToken: 'new-refresh-token'
        },
        error: null,
        errorCode: null
      };
      (authService.refreshToken as any).mockResolvedValueOnce(mockResponse);
      
      const result = await initAndValidate();
      
      expect(result).toBe(true);
      expect(authService.refreshToken).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should return false when no auth token exists', async () => {
      (getItem as any).mockResolvedValueOnce(null);
      
      const result = await initAndValidate();
      
      expect(result).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should successfully sign in user', async () => {
      const mockResponse = {
        data: {
          accessToken: mockAuthToken,
          refreshToken: mockRefreshToken
        },
        error: null,
        errorCode: null
      };
      (authService.acquireToken as any).mockResolvedValueOnce(mockResponse);
      
      const result = await signIn(mockPhone, mockEmail);
      
      expect(result).toBe(true);
    });

    it('should handle sign in failure', async () => {
      const mockResponse = {
        data: null,
        error: new Error('Sign in failed'),
        errorCode: 'ERROR'
      };
      (authService.acquireToken as any).mockResolvedValueOnce(mockResponse);
      
      const result = await signIn(mockPhone, mockEmail);
      
      expect(result).toBe(false);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should clear tokens and call logout', async () => {
      await signOut();
      
      expect(removeItem).toHaveBeenCalledWith(AUTH_TOKEN);
      expect(removeItem).toHaveBeenCalledWith(REFRESH_TOKEN);
      expect(httpClient.clearToken).toHaveBeenCalled();
      expect(authService.logout).toHaveBeenCalled();
    });

    it('should handle logout error', async () => {
      (authService.logout as any).mockRejectedValueOnce(new Error('Logout failed'));
      
      await signOut();
      
      expect(error).toHaveBeenCalled();
      expect(removeItem).toHaveBeenCalledWith(AUTH_TOKEN);
      expect(removeItem).toHaveBeenCalledWith(REFRESH_TOKEN);
    });
  });
}); 