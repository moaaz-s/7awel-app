import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/api-service';
import {
  getPinHash,
  setPinHash,
  clearPinHash,
  getSessionActive,
  setSessionActive,
  getPinAttempts,
  resetPinAttempts,
  setPinLockUntil,
  getPinLockUntil,
  incrementPinAttempts,
} from '@/utils/storage';
import {
  getItem as secureStorageGetItem,
  setItem as secureStorageSetItem,
  removeItem as secureStorageRemoveItem,
} from '@/utils/secure-storage';
import * as pinHash from '@/utils/pin-hash';

vi.mock('@/services/api-service');
vi.mock('@/utils/storage', () => ({
  getPinHash: vi.fn(),
  setPinHash: vi.fn(),
  clearPinHash: vi.fn(),
  getSessionActive: vi.fn(),
  setSessionActive: vi.fn(),
  getPinAttempts: vi.fn(),
  resetPinAttempts: vi.fn(),
  setPinLockUntil: vi.fn(),
  getPinLockUntil: vi.fn(),
  incrementPinAttempts: vi.fn(),
}));
vi.mock('@/utils/secure-storage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));
vi.mock('@/utils/pin-hash');
vi.mock('@/utils/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const mockToken = 'mock_token_123';
const mockPinHashVal = 'hashed-test-pin';

describe('AuthContext', () => {
  let wrapper: React.FC<{ children: React.ReactNode }>;

  const mockedApiService = vi.mocked(apiService);
  const mockedPinHash = vi.mocked(pinHash);

  beforeEach(() => {
    vi.resetAllMocks();

    mockedApiService.setToken.mockImplementation(() => {});

    vi.mocked(getPinHash).mockResolvedValue(null);
    vi.mocked(setPinHash).mockResolvedValue(undefined);
    vi.mocked(clearPinHash).mockResolvedValue(undefined);
    vi.mocked(getSessionActive).mockResolvedValue(false);
    vi.mocked(setSessionActive).mockResolvedValue(undefined);
    vi.mocked(getPinAttempts).mockResolvedValue(0);
    vi.mocked(resetPinAttempts).mockResolvedValue(undefined);
    vi.mocked(setPinLockUntil).mockResolvedValue(undefined);
    vi.mocked(getPinLockUntil).mockResolvedValue(null);
    vi.mocked(incrementPinAttempts).mockResolvedValue(1);

    vi.mocked(secureStorageGetItem).mockResolvedValue(null);
    vi.mocked(secureStorageSetItem).mockResolvedValue(undefined);
    vi.mocked(secureStorageRemoveItem).mockResolvedValue(undefined);

    mockedPinHash.hashPin.mockResolvedValue('default-hashed-pin');
    mockedPinHash.verifyPin.mockResolvedValue(true);

    wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
  });

  describe('Initial State (checkAuthStatus)', () => {
    it("should be 'unauthenticated' when no token or PIN exists", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isLoading).toBe(true);

      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      expect(result.current.authState).toBe('unauthenticated');
      expect(result.current.isLoading).toBe(false);
      expect(vi.mocked(secureStorageGetItem)).toHaveBeenCalledWith('auth_token');
      expect(vi.mocked(getPinHash)).toHaveBeenCalled();
    });

    it("should be 'authenticated' when a valid token exists", async () => {
      vi.mocked(secureStorageGetItem).mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isLoading).toBe(true);

      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      expect(result.current.authState).toBe('authenticated');
      expect(result.current.isLoading).toBe(false);
      expect(mockedApiService.setToken).toHaveBeenCalledWith(mockToken);
      expect(vi.mocked(secureStorageGetItem)).toHaveBeenCalledWith('auth_token');
    });

    it("should be 'requires_pin' when no token but a PIN hash exists and session is active", async () => {
      vi.mocked(secureStorageGetItem).mockResolvedValue(null);
      vi.mocked(getPinHash).mockResolvedValue(mockPinHashVal);
      vi.mocked(getSessionActive).mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.isLoading).toBe(true);

      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      expect(result.current.authState).toBe('requires_pin');
      expect(result.current.isLoading).toBe(false);
      expect(vi.mocked(secureStorageGetItem)).toHaveBeenCalledWith('auth_token');
      expect(vi.mocked(getPinHash)).toHaveBeenCalled();
      expect(vi.mocked(getSessionActive)).toHaveBeenCalled();
    });

    it("should be 'requires_pin' when a PIN hash exists but session is NOT active", async () => {
      vi.mocked(secureStorageGetItem).mockResolvedValue(null);
      vi.mocked(getPinHash).mockResolvedValue(mockPinHashVal);
      vi.mocked(getSessionActive).mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      expect(result.current.authState).toBe('requires_pin');
    });
  });

  describe('PIN workflow', () => {
    it('setPin should hash and authenticate', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      await act(async () => {
        await result.current.setPin('1234');
      });

      expect(mockedPinHash.hashPin).toHaveBeenCalledWith('1234');
      expect(vi.mocked(setPinHash)).toHaveBeenCalled();
      expect(result.current.authState).toBe('authenticated');
    });

    it('validatePin should return true and authenticate on correct PIN', async () => {
      vi.mocked(getPinHash).mockResolvedValue(mockPinHashVal);
      mockedPinHash.verifyPin.mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      let validated = false;
      await act(async () => {
        validated = await result.current.validatePin('1234');
      });

      expect(validated).toBe(true);
      expect(result.current.authState).toBe('authenticated');
    });
  });

  describe('Logout', () => {
    it('logout clears token and sets unauthenticated', async () => {
      vi.mocked(secureStorageGetItem).mockResolvedValue(mockToken);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      // Ensure we start authenticated
      expect(result.current.authState).toBe('authenticated');

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.authState).toBe('unauthenticated');
      expect(vi.mocked(secureStorageRemoveItem)).toHaveBeenCalledWith('auth_token');
    });
  });

  // --------------------------- OTP FLOW ---------------------------

  describe('OTP flow', () => {
    const phone = '+1555000';

    it('signin returns success and leaves authState unchanged', async () => {
      mockedApiService.login.mockResolvedValue({ statusCode: 200, data: { requiresOtp: true } } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      let res: { success: boolean } | undefined;
      await act(async () => {
        res = await result.current.signin(phone);
      });

      expect(mockedApiService.login).toHaveBeenCalledWith(phone);
      expect(res?.success).toBe(true);
      // Should still be unauthenticated because OTP not yet verified
      expect(result.current.authState).toBe('unauthenticated');
    });

    it('verifyOtp success with existing PIN sets requires_pin', async () => {
      mockedApiService.verifyOtp.mockResolvedValue({ statusCode: 200, data: { token: mockToken } } as any);
      vi.mocked(getPinHash).mockResolvedValue(mockPinHashVal);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      let res: { success: boolean } | undefined;
      await act(async () => {
        res = await result.current.verifyOtp(phone, '123456');
      });

      expect(res?.success).toBe(true);
      expect(secureStorageSetItem).toHaveBeenCalledWith('auth_token', mockToken);
      expect(mockedApiService.setToken).toHaveBeenCalledWith(mockToken);
      expect(result.current.authState).toBe('requires_pin');
    });

    it('verifyOtp success without PIN keeps unauthenticated', async () => {
      mockedApiService.verifyOtp.mockResolvedValue({ statusCode: 200, data: { token: mockToken } } as any);
      vi.mocked(getPinHash).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      let res: { success: boolean } | undefined;
      await act(async () => {
        res = await result.current.verifyOtp(phone, '123456');
      });

      expect(res?.success).toBe(true);
      expect(result.current.authState).toBe('unauthenticated');
    });

    it('verifyOtp failure returns error', async () => {
      mockedApiService.verifyOtp.mockResolvedValue({ statusCode: 400, error: 'Invalid OTP' } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      let res: { success: boolean; error?: string } | undefined;
      await act(async () => {
        res = await result.current.verifyOtp(phone, '999999');
      });

      expect(res?.success).toBe(false);
      expect(result.current.authState).toBe('unauthenticated');
    });
  });

  // --------------------------- PIN LOCKOUT ---------------------------

  describe('PIN lockout', () => {
    it('validatePin returns false when already locked', async () => {
      const future = Date.now() + 60_000; // +1 minute
      vi.mocked(getPinLockUntil).mockResolvedValue(future);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      let validated = true;
      await act(async () => {
        validated = await result.current.validatePin('9999');
      });

      expect(validated).toBe(false);
      expect(mockedPinHash.verifyPin).not.toHaveBeenCalled();
    });

    it('validatePin locks after max failed attempts', async () => {
      // Not locked initially
      vi.mocked(getPinLockUntil).mockResolvedValue(null);
      vi.mocked(getPinHash).mockResolvedValue(mockPinHashVal);
      mockedPinHash.verifyPin.mockResolvedValue(false);
      // Simulate MAX attempts reached (5)
      vi.mocked(incrementPinAttempts).mockResolvedValue(5);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

      let validated = true;
      await act(async () => {
        validated = await result.current.validatePin('9999');
      });

      expect(validated).toBe(false);
      expect(vi.mocked(setPinLockUntil)).toHaveBeenCalled();
      expect(result.current.authState).not.toBe('authenticated');
    });
  });
});
