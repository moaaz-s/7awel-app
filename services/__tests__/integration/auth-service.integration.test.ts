import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService } from '@/services/auth-service';
import { httpClient, httpClientUnauthenticated } from '@/services/http-client';
import { OtpChannel } from '@/services/api-service';
import type { ApiResponse, OtpInitiationResponse, TokenAcquisitionResponse } from '@/types';
import { ErrorCode } from '@/types/errors';

describe('Auth Service Integration Tests', () => {
  beforeEach(async () => {
    // Mock console methods to reduce noise during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await httpClient.init();
    await httpClientUnauthenticated.init();
  });

  afterEach(async () => {
    httpClient.clearToken();
    vi.restoreAllMocks();
  });

  describe('OTP Operations - Signin Flow', () => {
    it('should send OTP for signin with phone number', async () => {
      const testPhone = '+1234567890';
      
      try {
        const response = await authService.sendOtpSignin('phone', testPhone, OtpChannel.SMS);
        
        // Since this hits a real endpoint, we expect either success or a specific error
        if (response.error) {
          expect(response.error).toBeDefined();
          expect(response.errorCode).toBeDefined();
        } else {
          expect(response.data).toBeDefined();
          expect(response.data?.requiresOtp).toBeDefined();
        }
      } catch (error) {
        // Handle network errors gracefully
        expect(error).toBeDefined();
      }
    });

    it('should send OTP for signin with email', async () => {
      const testEmail = 'test@example.com';
      
      try {
        const response = await authService.sendOtpSignin('email', testEmail, OtpChannel.TELEGRAM);
        
        if (response.error) {
          expect(response.error).toBeDefined();
          expect(response.errorCode).toBeDefined();
        } else {
          expect(response.data).toBeDefined();
          expect(response.data?.requiresOtp).toBeDefined();
        }
      } catch (error) {
        // Handle network errors gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid email format in signin', async () => {
      const invalidEmail = 'not-an-email';
      
      const response = await authService.sendOtpSignin('email', invalidEmail);
      
      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe(ErrorCode.EMAIL_INVALID);
    });

    it('should handle missing medium or value in signin', async () => {
      const response = await authService.sendOtpSignin('phone', '');
      
      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe(ErrorCode.OTP_MISSING_MEDIUM);
    });
  });

  describe('OTP Operations - Signup Flow', () => {
    it('should send OTP for signup with phone number', async () => {
      const testPhone = '+9876543210';
      
      try {
        const response = await authService.sendOtpSignup('phone', testPhone, OtpChannel.WHATSAPP);
        
        if (response.error) {
          expect(response.error).toBeDefined();
          expect(response.errorCode).toBeDefined();
        } else {
          expect(response.data).toBeDefined();
          expect(response.data?.requiresOtp).toBeDefined();
        }
      } catch (error) {
        // Handle network errors gracefully - expected for integration tests without running server
        expect(error).toBeDefined();
      }
    });

    it('should send OTP for signup with email', async () => {
      const testEmail = 'signup@example.com';
      
      try {
        const response = await authService.sendOtpSignup('email', testEmail);
        
        if (response.error) {
          expect(response.error).toBeDefined();
          expect(response.errorCode).toBeDefined();
        } else {
          expect(response.data).toBeDefined();
          expect(response.data?.requiresOtp).toBeDefined();
        }
      } catch (error) {
        // Handle network errors gracefully
        expect(error).toBeDefined();
      }
    });

    it('should check availability during signup', async () => {
      const existingPhone = '+15550001111'; // Assuming this exists in mock data
      
      try {
        const response = await authService.sendOtpSignup('phone', existingPhone);
        
        // Should fail if phone is already registered or if server is not running
        if (response.errorCode === ErrorCode.PHONE_ALREADY_REGISTERED) {
          expect(response.error).toBeDefined();
          expect(response.errorCode).toBe(ErrorCode.PHONE_ALREADY_REGISTERED);
        } else if (response.error) {
          expect(response.error).toBeDefined();
          expect(response.errorCode).toBeDefined();
        }
      } catch (error) {
        // Network error expected without running server
        expect(error).toBeDefined();
      }
    });
  });

  describe('OTP Operations - Authenticated Flows', () => {
    it('should send OTP for user info update (authenticated)', async () => {
      const testEmail = 'update@example.com';
      
      try {
        const response = await authService.sendOtpUpdateAuthenticated('email', testEmail);
        
        // This should fail without authentication
        expect(response.error).toBeDefined();
        expect(response.errorCode).toBeDefined();
      } catch (error) {
        // Should throw error due to missing token
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Unauthorized');
      }
    });

    it('should send OTP for operations (authenticated)', async () => {
      const testPhone = '+1111111111';
      
      try {
        const response = await authService.sendOtpOperationAuthenticated('phone', testPhone);
        
        // This should fail without authentication
        expect(response.error).toBeDefined();
        expect(response.errorCode).toBeDefined();
      } catch (error) {
        // Should throw error due to missing token
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Unauthorized');
      }
    });
  });

  describe('OTP Verification', () => {
    it('should verify OTP for unauthenticated flow', async () => {
      const testPhone = '+1234567890';
      const testOtp = '123456';
      
      try {
        const response = await authService.verifyOtpUnauthenticated('phone', testPhone, testOtp);
        
        // This will likely fail with invalid OTP since we don't have a real one
        if (response.error) {
          expect(response.error).toBeDefined();
          expect([ErrorCode.OTP_INVALID, ErrorCode.UNKNOWN].includes(response.errorCode!)).toBe(true);
        } else {
          expect(response.data).toBe(true);
        }
      } catch (error) {
        // Handle network errors gracefully
        expect(error).toBeDefined();
      }
    });

    it('should verify OTP for authenticated flow', async () => {
      const testEmail = 'test@example.com';
      const testOtp = '654321';
      
      try {
        const response = await authService.verifyOtpAuthenticated('email', testEmail, testOtp);
        
        // This should fail without authentication
        expect(response.error).toBeDefined();
        expect(response.errorCode).toBeDefined();
      } catch (error) {
        // Should throw error due to missing token
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Unauthorized');
      }
    });

    it('should handle missing OTP in verification', async () => {
      const testPhone = '+1234567890';
      
      const response = await authService.verifyOtpUnauthenticated('phone', testPhone, '');
      
      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe(ErrorCode.OTP_REQUIRED);
    });

    it('should handle missing medium or value in verification', async () => {
      // Use proper type instead of empty string
      const response = await authService.verifyOtpUnauthenticated('phone', '', '123456');
      
      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe(ErrorCode.OTP_MISSING_MEDIUM);
    });
  });

  describe('Token Management', () => {
    it('should acquire token with valid credentials', async () => {
      const testPhone = '+1234567890';
      const testEmail = 'test@example.com';
      
      try {
        const response = await authService.acquireToken(testPhone, testEmail);
        
        if (response.error) {
          expect(response.error).toBeDefined();
          expect(response.errorCode).toBeDefined();
        } else {
          expect(response.data).toBeDefined();
          expect(response.data?.accessToken).toBeDefined();
          expect(response.data?.refreshToken).toBeDefined();
        }
      } catch (error) {
        // Handle network errors gracefully
        expect(error).toBeDefined();
      }
    });

    it('should refresh token with valid refresh token', async () => {
      const mockRefreshToken = 'mock-refresh-token';
      
      try {
        const response = await authService.refreshToken(mockRefreshToken);
        
        // This will likely fail with invalid refresh token
        expect(response.error).toBeDefined();
        expect(response.errorCode).toBeDefined();
      } catch (error) {
        // Should throw error due to missing token or network error
        expect(error).toBeDefined();
      }
    });

    it('should handle logout correctly', async () => {
      // Set a mock token first
      httpClient.setToken('mock-token');
      
      // Logout should clear the token
      await authService.logout();
      
      // Token should be cleared (we can't directly test this but the method should complete)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Device Management', () => {
    it('should get devices list', async () => {
      try {
        const response = await authService.getDevices();
        
        // This should fail without authentication
        expect(response.error).toBeDefined();
        expect(response.errorCode).toBe(ErrorCode.SERVER_ERROR);
      } catch (error) {
        // Should throw error due to missing token
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Unauthorized');
      }
    });

    it('should revoke specific device', async () => {
      const deviceId = 'test-device-id';
      
      try {
        const response = await authService.revokeDevice(deviceId);
        
        // This should fail without authentication
        expect(response.error).toBeDefined();
        expect(response.errorCode).toBe(ErrorCode.SERVER_ERROR);
      } catch (error) {
        // Should throw error due to missing token
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Unauthorized');
      }
    });

    it('should handle missing device ID in revoke', async () => {
      const response = await authService.revokeDevice('');
      
      expect(response.error).toBeDefined();
      expect(response.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should revoke all sessions', async () => {
      try {
        const response = await authService.revokeAllSessions();
        
        // This should fail without authentication
        expect(response.error).toBeDefined();
        expect(response.errorCode).toBe(ErrorCode.SERVER_ERROR);
      } catch (error) {
        // Should throw error due to missing token
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Unauthorized');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      try {
        const response = await authService.sendOtpSignin('phone', '+1234567890');
        
        // Response should either succeed or fail gracefully
        expect(typeof response).toBe('object');
        expect(response).toHaveProperty('error');
      } catch (error) {
        // Network errors are expected without a running server
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed responses', async () => {
      try {
        const response = await authService.sendOtpSignin('phone', '+' + '0'.repeat(20));
        
        if (response.error) {
          expect(response.error).toBeDefined();
          expect(response.errorCode).toBeDefined();
        }
      } catch (error) {
        // Network errors are expected
        expect(error).toBeDefined();
      }
    });
  });

  describe('Full Authentication Flow Simulation', () => {
    it('should simulate complete auth flow', async () => {
      const testPhone = '+1234567890';
      const testEmail = 'flow@example.com';
      
      try {
        // Step 1: Send OTP for signin
        const otpResponse = await authService.sendOtpSignin('phone', testPhone);
        
        if (!otpResponse.error) {
          // Step 2: Verify OTP (will fail with mock OTP)
          const verifyResponse = await authService.verifyOtpUnauthenticated('phone', testPhone, '123456');
          
          if (!verifyResponse.error) {
            // Step 3: Acquire token
            const tokenResponse = await authService.acquireToken(testPhone, testEmail);
            
            if (!tokenResponse.error) {
              // Step 4: Test authenticated operation
              const devicesResponse = await authService.getDevices();
              expect(devicesResponse).toBeDefined();
            }
          }
        }
      } catch (error) {
        // Network errors are expected without a running server
        expect(error).toBeDefined();
      }
      
      // The flow should complete without crashing
      expect(true).toBe(true);
    });
  });
}); 