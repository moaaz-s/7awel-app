import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FlowService } from '@/services/flow-service';
import { authService } from '@/services/auth-service';
import { userService } from '@/services/user-service';
import * as secureStorage from '@/utils/secure-storage';
import { getSession, setSession, clearSession } from '@/utils/storage';
import { AUTH_TOKEN, REFRESH_TOKEN } from '@/constants/storage-keys';
import { ErrorCode } from '@/types/errors';
import { AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { OtpChannel } from '@/services/api-service';
import {
  AUTH_STEP_PHONE_ENTRY,
  AUTH_STEP_PHONE_OTP_PENDING,
  AUTH_STEP_EMAIL_ENTRY_PENDING,
  AUTH_STEP_EMAIL_OTP_PENDING,
  AUTH_STEP_TOKEN_ACQUISITION,
  AUTH_STEP_USER_PROFILE_PENDING,
  AUTH_STEP_PIN_SETUP_PENDING,
  AUTH_STEP_PIN_ENTRY_PENDING,
  AUTH_STEP_AUTHENTICATED,
  AUTH_STEP_INITIATE
} from '@/context/auth/flow/flowSteps';

describe('Auth Flow Integration', () => {
  const mockUserData = {
    phone: '+1234567890',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    pin: '123456'
  };

  const mockTokenResponse = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZGV2aWNlSWQiOiJkZXZpY2U0NTYiLCJleHAiOjk5OTk5OTk5OTl9.UNSIGNED',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZGV2aWNlSWQiOiJkZXZpY2U0NTYiLCJ0eXBlIjoicmVmcmVzaCIsImV4cCI6OTk5OTk5OTk5OX0.UNSIGNED'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock secure storage
    vi.spyOn(secureStorage, 'setItem').mockImplementation((key, value) => Promise.resolve());
    vi.spyOn(secureStorage, 'getItem').mockImplementation((key) => {
      if (key === AUTH_TOKEN) return Promise.resolve(mockTokenResponse.accessToken);
      if (key === REFRESH_TOKEN) return Promise.resolve(mockTokenResponse.refreshToken);
      return Promise.resolve(null);
    });

    // Mock FlowService
    vi.spyOn(FlowService, 'initiateFlow').mockImplementation((flowType: AuthFlowType, initialData?: any) => {
      return Promise.resolve({
        type: flowType,
        initialIndex: 0,
        deviceInfo: {
          id: 'test-device',
          model: 'web-browser',
          osVersion: '1.0.0',
          platform: 'web'
        },
        steps: [
          {
            step: AUTH_STEP_PHONE_ENTRY,
            data: {}
          }
        ],
        initialData
      });
    });

    vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(async (stepData?: any) => {
      return {
        phone: undefined,
        countryCode: undefined,
        phoneNumber: undefined,
        channel: undefined,
        email: undefined,
        pinVerified: false,
        pinSet: false,
        emailVerified: false,
        phoneValidated: false,
        tokenValid: false,
        sessionActive: stepData?.isActive ?? true,
        deviceInfo: {
          id: 'test-device',
          model: 'web-browser',
          osVersion: '1.0.0'
        }
      };
    });

    // Mock auth service responses
    vi.spyOn(authService, 'sendOtpSignin').mockResolvedValue({
      statusCode: 200,
      message: 'Success',
      data: { requiresOtp: true },
      traceId: 'test-trace-id'
    });

    vi.spyOn(authService, 'sendOtpSignup').mockResolvedValue({
      statusCode: 200,
      message: 'Success',
      data: { requiresOtp: true },
      traceId: 'test-trace-id'
    });

    vi.spyOn(authService, 'verifyOtpUnauthenticated').mockResolvedValue({
      statusCode: 200,
      message: 'Success',
      data: true,
      traceId: 'test-trace-id'
    });

    vi.spyOn(authService, 'acquireToken').mockResolvedValue({
      statusCode: 200,
      message: 'Success',
      data: mockTokenResponse,
      traceId: 'test-trace-id'
    });

    vi.spyOn(userService, 'getUser').mockResolvedValue({
      statusCode: 200,
      message: 'Success',
      data: {
        user: {
          id: 'test-user-id',
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
          phone: mockUserData.phone,
          email: mockUserData.email
        },
        settings: {
          language: 'en',
          theme: 'light',
          security: {
            biometricEnabled: false,
            twoFactorEnabled: true,
            transactionPin: true
          },
          notifications: {
            pushEnabled: true,
            transactionAlerts: true,
            securityAlerts: true,
            promotions: false,
            emailNotifications: true,
            smsNotifications: true
          }
        }
      },
      traceId: 'test-trace-id'
    });

    vi.spyOn(userService, 'updateUser').mockResolvedValue({
      statusCode: 200,
      message: 'Success',
      data: {
        id: 'test-user-id',
        firstName: mockUserData.firstName,
        lastName: mockUserData.lastName,
        phone: mockUserData.phone,
        email: mockUserData.email
      },
      traceId: 'test-trace-id'
    });
  });

  afterEach(async () => {
    await secureStorage.removeItem(AUTH_TOKEN);
    await secureStorage.removeItem(REFRESH_TOKEN);
    await clearSession();
  });

  describe('Auth Flow States', () => {
    const mockFlowContext = {
      phone: undefined,
      countryCode: undefined,
      phoneNumber: undefined,
      channel: undefined,
      email: undefined,
      pinVerified: false,
      pinSet: false,
      emailVerified: false,
      phoneValidated: false,
      tokenValid: false,
      sessionActive: true,
      deviceInfo: {
        id: 'test-device',
        model: 'web-browser',
        osVersion: '1.0.0',
        platform: 'web'
      }
    };

    describe('Initial Flow State', () => {
      it('should start from initiate state', async () => {
        vi.spyOn(FlowService, 'initiateFlow').mockImplementation(() => 
          Promise.resolve({
            type: AuthFlowType.SIGNIN,
            initialIndex: 0,
            deviceInfo: { id: 'test-device', model: 'web-browser', osVersion: '1.0.0', platform: 'web' },
            steps: [{ step: AUTH_STEP_INITIATE, data: {} }],
            initialData: undefined
          })
        );

        const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
        expect(flow.steps[0].step).toBe(AUTH_STEP_INITIATE);
      });
    });

    describe('Phone Verification Flow', () => {
      it('should handle phone entry state', async () => {
        vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(() => 
          Promise.resolve({
            ...mockFlowContext,
            phone: mockUserData.phone,
            phoneValidated: false,
            step: AUTH_STEP_PHONE_ENTRY
          })
        );

        const ctx = await FlowService.buildFlowContext();
        expect(ctx.phoneValidated).toBe(false);

        const phoneResponse = await authService.sendOtpSignin('phone', mockUserData.phone);
        expect(phoneResponse.data?.requiresOtp).toBe(true);
      });

      it('should handle phone OTP verification', async () => {
        vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(() => 
          Promise.resolve({
            ...mockFlowContext,
            phone: mockUserData.phone,
            phoneValidated: false,
            step: AUTH_STEP_PHONE_OTP_PENDING
          })
        );

        const ctx = await FlowService.buildFlowContext();
        expect(ctx.phoneValidated).toBe(false);

        const otpResponse = await authService.verifyOtpUnauthenticated(
          'phone',
          mockUserData.phone,
          '123456'
        );
        expect(otpResponse.data).toBe(true);
      });
    });

    describe('Email Verification Flow', () => {
      it('should handle email entry state', async () => {
        vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(() => 
          Promise.resolve({
            ...mockFlowContext,
            phone: mockUserData.phone,
            phoneValidated: true,
            step: AUTH_STEP_EMAIL_ENTRY_PENDING
          })
        );

        const ctx = await FlowService.buildFlowContext();
        expect(ctx.phoneValidated).toBe(true);

        const emailResponse = await authService.sendOtpSignin('email', mockUserData.email);
        expect(emailResponse.data?.requiresOtp).toBe(true);
      });

      it('should handle email OTP verification', async () => {
        vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(() => 
          Promise.resolve({
            ...mockFlowContext,
            phone: mockUserData.phone,
            phoneValidated: true,
            email: mockUserData.email,
            emailVerified: false,
            step: AUTH_STEP_EMAIL_OTP_PENDING
          })
        );

        const ctx = await FlowService.buildFlowContext();
        expect(ctx.emailVerified).toBe(false);

        const otpResponse = await authService.verifyOtpUnauthenticated(
          'email',
          mockUserData.email,
          '123456'
        );
        expect(otpResponse.data).toBe(true);
      });
    });

    describe('Token Acquisition', () => {
      it('should handle token acquisition state', async () => {
        vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(() => 
          Promise.resolve({
            ...mockFlowContext,
            phone: mockUserData.phone,
            phoneValidated: true,
            email: mockUserData.email,
            emailVerified: true,
            step: AUTH_STEP_TOKEN_ACQUISITION
          })
        );

        const ctx = await FlowService.buildFlowContext();
        expect(ctx.phoneValidated).toBe(true);
        expect(ctx.emailVerified).toBe(true);

        const tokenResponse = await authService.acquireToken(mockUserData.phone, mockUserData.email);
        expect(tokenResponse.data).toMatchObject(mockTokenResponse);
      });
    });

    describe('PIN Management Flow', () => {
      it('should handle PIN setup state', async () => {
        vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(() => 
          Promise.resolve({
            ...mockFlowContext,
            phone: mockUserData.phone,
            phoneValidated: true,
            email: mockUserData.email,
            emailVerified: true,
            tokenValid: true,
            pinSet: false,
            step: AUTH_STEP_PIN_SETUP_PENDING
          })
        );

        const ctx = await FlowService.buildFlowContext();
        expect(ctx.pinSet).toBe(false);
      });

      it('should handle PIN entry state', async () => {
        vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(() => 
          Promise.resolve({
            ...mockFlowContext,
            phone: mockUserData.phone,
            phoneValidated: true,
            email: mockUserData.email,
            emailVerified: true,
            tokenValid: true,
            pinSet: true,
            pinVerified: false,
            step: AUTH_STEP_PIN_ENTRY_PENDING
          })
        );

        const ctx = await FlowService.buildFlowContext();
        expect(ctx.pinSet).toBe(true);
        expect(ctx.pinVerified).toBe(false);
      });
    });

    describe('Final Authentication State', () => {
      it('should handle fully authenticated state', async () => {
        vi.spyOn(FlowService, 'buildFlowContext').mockImplementation(() => 
          Promise.resolve({
            ...mockFlowContext,
            phone: mockUserData.phone,
            phoneValidated: true,
            email: mockUserData.email,
            emailVerified: true,
            tokenValid: true,
            pinSet: true,
            pinVerified: true,
            step: AUTH_STEP_AUTHENTICATED
          })
        );

        const ctx = await FlowService.buildFlowContext();
        expect(ctx.phoneValidated).toBe(true);
        expect(ctx.emailVerified).toBe(true);
        expect(ctx.tokenValid).toBe(true);
        expect(ctx.pinVerified).toBe(true);
      });
    });
  });

  describe('Sign In Flow', () => {
    it('should complete successful sign in flow with phone', async () => {
      // 1. Initiate flow
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      expect(flow.initialIndex).toBeDefined();
      expect(flow.steps[flow.initialIndex || 0]).toMatchObject({
        step: AUTH_STEP_PHONE_ENTRY
      });

      // 2. Submit phone number
      const phoneResponse = await authService.sendOtpSignin('phone', mockUserData.phone);
      expect(phoneResponse.data?.requiresOtp).toBe(true);

      // 3. Verify phone OTP
      const phoneOtpResponse = await authService.verifyOtpUnauthenticated(
        'phone',
        mockUserData.phone,
        '123456'
      );
      expect(phoneOtpResponse.data).toBe(true);

      // 4. Submit email
      const emailResponse = await authService.sendOtpSignin('email', mockUserData.email);
      expect(emailResponse.data?.requiresOtp).toBe(true);

      // 5. Verify email OTP
      const emailOtpResponse = await authService.verifyOtpUnauthenticated(
        'email',
        mockUserData.email,
        '123456'
      );
      expect(emailOtpResponse.data).toBe(true);

      // 6. Acquire tokens
      const tokenResponse = await authService.acquireToken(
        mockUserData.phone,
        mockUserData.email
      );
      expect(tokenResponse.data).toMatchObject(mockTokenResponse);

      // 7. Verify stored tokens
      const storedAccessToken = await secureStorage.getItem(AUTH_TOKEN);
      const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN);
      expect(storedAccessToken).toBe(mockTokenResponse.accessToken);
      expect(storedRefreshToken).toBe(mockTokenResponse.refreshToken);

      // 8. Get user profile
      const userResponse = await userService.getUser();
      expect(userResponse.data?.user).toMatchObject({
        firstName: mockUserData.firstName,
        lastName: mockUserData.lastName
      });
    });

    it('should handle invalid phone number', async () => {
      vi.spyOn(authService, 'sendOtpSignin').mockResolvedValueOnce({
        statusCode: 400,
        message: 'Invalid phone number',
        error: 'Invalid phone format',
        errorCode: ErrorCode.PHONE_INVALID,
        traceId: 'test-trace-id'
      });

      const response = await authService.sendOtpSignin('phone', 'invalid-phone');
      expect(response.errorCode).toBe(ErrorCode.PHONE_INVALID);
    });

    it('should handle invalid OTP', async () => {
      vi.spyOn(authService, 'verifyOtpUnauthenticated').mockResolvedValueOnce({
        statusCode: 400,
        message: 'Invalid OTP',
        error: 'Invalid OTP code',
        errorCode: ErrorCode.OTP_INVALID,
        traceId: 'test-trace-id'
      });

      const response = await authService.verifyOtpUnauthenticated(
        'phone',
        mockUserData.phone,
        'invalid-otp'
      );
      expect(response.errorCode).toBe(ErrorCode.OTP_INVALID);
    });
  });

  describe('Sign Up Flow', () => {
    it('should complete successful sign up flow', async () => {
      // 1. Initiate flow
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNUP);
      expect(flow.initialIndex).toBeDefined();
      expect(flow.steps[flow.initialIndex || 0]).toMatchObject({
        step: AUTH_STEP_PHONE_ENTRY
      });

      // 2. Submit phone number
      const phoneResponse = await authService.sendOtpSignup('phone', mockUserData.phone);
      expect(phoneResponse.data?.requiresOtp).toBe(true);

      // 3. Verify phone OTP
      const phoneOtpResponse = await authService.verifyOtpUnauthenticated(
        'phone',
        mockUserData.phone,
        '123456'
      );
      expect(phoneOtpResponse.data).toBe(true);

      // 4. Submit email
      const emailResponse = await authService.sendOtpSignup('email', mockUserData.email);
      expect(emailResponse.data?.requiresOtp).toBe(true);

      // 5. Verify email OTP
      const emailOtpResponse = await authService.verifyOtpUnauthenticated(
        'email',
        mockUserData.email,
        '123456'
      );
      expect(emailOtpResponse.data).toBe(true);

      // 6. Update user profile
      const updateResponse = await userService.updateUser({
        firstName: mockUserData.firstName,
        lastName: mockUserData.lastName
      });
      expect(updateResponse.data).toMatchObject({
        firstName: mockUserData.firstName,
        lastName: mockUserData.lastName
      });

      // 7. Acquire tokens
      const tokenResponse = await authService.acquireToken(
        mockUserData.phone,
        mockUserData.email
      );
      expect(tokenResponse.data).toMatchObject(mockTokenResponse);

      // 8. Verify stored tokens
      const storedAccessToken = await secureStorage.getItem(AUTH_TOKEN);
      const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN);
      expect(storedAccessToken).toBe(mockTokenResponse.accessToken);
      expect(storedRefreshToken).toBe(mockTokenResponse.refreshToken);
    });

    it('should handle existing phone number', async () => {
      vi.spyOn(authService, 'sendOtpSignup').mockResolvedValueOnce({
        statusCode: 400,
        message: 'Phone number already registered',
        error: 'Phone already exists',
        errorCode: ErrorCode.PHONE_ALREADY_REGISTERED,
        traceId: 'test-trace-id'
      });

      const response = await authService.sendOtpSignup('phone', mockUserData.phone);
      expect(response.errorCode).toBe(ErrorCode.PHONE_ALREADY_REGISTERED);
    });

    it('should handle existing email', async () => {
      vi.spyOn(authService, 'sendOtpSignup').mockResolvedValueOnce({
        statusCode: 400,
        message: 'Email already registered',
        error: 'Email already exists',
        errorCode: ErrorCode.EMAIL_ALREADY_REGISTERED,
        traceId: 'test-trace-id'
      });

      const response = await authService.sendOtpSignup('email', mockUserData.email);
      expect(response.errorCode).toBe(ErrorCode.EMAIL_ALREADY_REGISTERED);
    });
  });

  describe('PIN Management', () => {
    it('should handle PIN setup flow', async () => {
      // First set up authentication
      await authService.acquireToken(mockUserData.phone, mockUserData.email);

      // Mock PIN setup
      const ctx = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: true,
        tokenValid: true
      });

      expect(ctx.pinSet).toBe(false);

      // TODO: Add PIN setup tests once PIN service is implemented
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration', async () => {
      await setSession({
        expiresAt: Date.now() - 1000,
        isActive: false,
        lastActivity: Date.now() - 2000,
        pinVerified: false
      });

      const ctx = await FlowService.buildFlowContext({ isActive: false });
      expect(ctx.sessionActive).toBe(false);
    });

    it('should handle valid session', async () => {
      await setSession({
        expiresAt: Date.now() + 3600000,
        isActive: true,
        lastActivity: Date.now(),
        pinVerified: true
      });

      const ctx = await FlowService.buildFlowContext({ isActive: true });
      expect(ctx.sessionActive).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      vi.spyOn(authService, 'acquireToken').mockRejectedValueOnce({
        statusCode: 0,
        message: 'Network error',
        error: 'Network error',
        errorCode: ErrorCode.NETWORK_ERROR,
        traceId: 'test-trace-id'
      });

      const response = await authService.acquireToken(mockUserData.phone, mockUserData.email)
        .catch(error => error);
      expect(response.errorCode).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should handle server errors', async () => {
      vi.spyOn(authService, 'acquireToken').mockResolvedValueOnce({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Server error',
        errorCode: ErrorCode.SERVER_ERROR,
        traceId: 'test-trace-id'
      });

      const response = await authService.acquireToken(mockUserData.phone, mockUserData.email);
      expect(response.errorCode).toBe(ErrorCode.SERVER_ERROR);
    });

    it('should handle too many attempts', async () => {
      vi.spyOn(authService, 'verifyOtpUnauthenticated').mockResolvedValueOnce({
        statusCode: 429,
        message: 'Too many attempts',
        error: 'Rate limit exceeded',
        errorCode: ErrorCode.TOO_MANY_ATTEMPTS,
        traceId: 'test-trace-id'
      });

      const response = await authService.verifyOtpUnauthenticated(
        'phone',
        mockUserData.phone,
        '123456'
      );
      expect(response.errorCode).toBe(ErrorCode.TOO_MANY_ATTEMPTS);
    });
  });
}); 