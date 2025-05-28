import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlowService } from '../flow-service';
import { getSession, setSession } from '@/utils/storage';
import { getItem as getSecureItem } from '@/utils/secure-storage';
import { isPinSet } from '@/utils/pin-service';
import { getDeviceInfo } from '@/utils/device-fingerprint';
import { AuthFlowType, getFlowTypeSteps, getNextValidIndex, FlowStep } from '@/context/auth/flow/flowsOrchestrator';
import { STEP_HANDLERS } from '@/context/auth/flow/flowStepHandlers';
import { AUTH_TOKEN } from '@/constants/storage-keys';
import { Session } from '@/context/auth/auth-types';
import { DeviceInfo } from '@/utils/device-fingerprint';
import { AUTH_STEP_PHONE_ENTRY, AUTH_STEP_EMAIL_ENTRY_PENDING, AuthStep } from '@/context/auth/flow/flowSteps';
import { FlowCtx } from '@/context/auth/flow/flowsOrchestrator';
import { isTokenExpired } from '@/utils/token-utils';

// Mock dependencies
vi.mock('@/utils/storage', () => ({
  getSession: vi.fn(),
  setSession: vi.fn()
}));

vi.mock('@/utils/secure-storage', () => ({
  getItem: vi.fn()
}));

vi.mock('@/utils/pin-service', () => ({
  isPinSet: vi.fn()
}));

vi.mock('@/utils/device-fingerprint', () => ({
  getDeviceInfo: vi.fn()
}));

vi.mock('@/utils/token-utils', () => ({
  isTokenExpired: vi.fn()
}));

vi.mock('@/context/auth/flow/flowsOrchestrator', () => ({
  AuthFlowType: {
    SIGNIN: 'SIGNIN',
    SIGNUP: 'SIGNUP'
  },
  getFlowTypeSteps: vi.fn(),
  getNextValidIndex: vi.fn()
}));

describe('FlowService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('buildFlowContext', () => {
    it('should build context with active session and valid token', async () => {
      // Mock dependencies
      const mockSession: Session = {
        expiresAt: Date.now() + 1000000,
        isActive: true,
        lastActivity: Date.now(),
        pinVerified: true
      };
      const mockToken = 'valid-token';
      
      vi.mocked(getSession).mockResolvedValue(mockSession);
      vi.mocked(getSecureItem).mockResolvedValue(mockToken);
      vi.mocked(isPinSet).mockResolvedValue(true);
      vi.mocked(isTokenExpired).mockReturnValue(false);

      const stepData = {
        phoneValidated: true,
        emailVerified: true,
        pinVerified: true,
        firstName: 'John',
        lastName: 'Doe'
      };

      const context = await FlowService.buildFlowContext(stepData);

      expect(context).toEqual({
        tokenValid: true,
        phoneValidated: true,
        emailVerified: true,
        pinSet: true,
        pinVerified: true,
        sessionActive: true,
        otpExpiry: undefined,
        emailOtpExpiry: undefined,
        firstName: 'John',
        lastName: 'Doe'
      });
    });

    it('should build context with inactive session and invalid token', async () => {
      // Mock dependencies for inactive/invalid state
      vi.mocked(getSession).mockResolvedValue(null);
      vi.mocked(getSecureItem).mockResolvedValue(null);
      vi.mocked(isPinSet).mockResolvedValue(false);

      const context = await FlowService.buildFlowContext();

      expect(context).toEqual({
        tokenValid: false,
        phoneValidated: false,
        emailVerified: false,
        pinSet: false,
        pinVerified: false,
        sessionActive: false,
        otpExpiry: undefined,
        emailOtpExpiry: undefined,
        firstName: undefined,
        lastName: undefined
      });
    });
  });

  describe('initiateFlow', () => {
    it('should successfully initiate a flow', async () => {
      const mockDeviceInfo: DeviceInfo = {
        id: 'test-device',
        model: 'Test Model',
        platform: 'web',
        osVersion: '1.0'
      };
      const mockSteps: FlowStep[] = [
        { 
          step: 'PHONE_ENTRY' as AuthStep, 
          condition: (ctx: FlowCtx) => !ctx.phoneValidated 
        },
        { 
          step: 'EMAIL_ENTRY' as AuthStep, 
          condition: (ctx: FlowCtx) => !ctx.emailVerified 
        }
      ];

      vi.mocked(getDeviceInfo).mockResolvedValue(mockDeviceInfo);
      vi.mocked(getFlowTypeSteps).mockReturnValue(mockSteps);
      vi.mocked(getNextValidIndex).mockReturnValue(0);

      const result = await FlowService.initiateFlow(AuthFlowType.SIGNIN);

      expect(result).toEqual({
        type: AuthFlowType.SIGNIN,
        initialIndex: 0,
        deviceInfo: mockDeviceInfo,
        steps: mockSteps,
        initialData: undefined
      });
    });

    it('should throw error when no valid steps are found', async () => {
      vi.mocked(getFlowTypeSteps).mockReturnValue([]);

      await expect(FlowService.initiateFlow(AuthFlowType.SIGNIN))
        .rejects
        .toThrow('No valid steps for flow: SIGNIN');
    });
  });

  describe('determineNextStep', () => {
    it('should determine next step successfully', async () => {
      const mockFlow: FlowStep[] = [
        { 
          step: AUTH_STEP_PHONE_ENTRY, 
          condition: (ctx: FlowCtx) => !ctx.phoneValidated 
        },
        { 
          step: AUTH_STEP_EMAIL_ENTRY_PENDING, 
          condition: (ctx: FlowCtx) => !ctx.emailVerified 
        }
      ];
      const mockStepData = { phoneValidated: true };
      const mockPayload = { phone: '1234567890' };

      vi.mocked(getNextValidIndex).mockReturnValue(1);

      const result = await FlowService.determineNextStep(
        mockFlow,
        0,
        mockStepData,
        mockPayload
      );

      expect(result).toEqual({
        nextStep: AUTH_STEP_EMAIL_ENTRY_PENDING,
        nextIndex: 1,
        context: expect.any(Object)
      });
    });

    it('should handle case when no next step is found', async () => {
      const mockFlow: FlowStep[] = [
        { 
          step: AUTH_STEP_PHONE_ENTRY, 
          condition: (ctx: FlowCtx) => !ctx.phoneValidated 
        }
      ];
      vi.mocked(getNextValidIndex).mockReturnValue(null);

      const result = await FlowService.determineNextStep(
        mockFlow,
        0,
        {},
        {}
      );

      expect(result).toEqual({
        nextStep: null,
        nextIndex: null,
        context: expect.any(Object)
      });
    });
  });

  describe('validateStepTransition', () => {
    it('should validate step transition', async () => {
      const mockContext: FlowCtx = {
        tokenValid: true,
        phoneValidated: false,
        emailVerified: false,
        pinSet: false,
        pinVerified: false,
        sessionActive: false
      };

      const result = await FlowService.validateStepTransition(
        'STEP_1',
        'STEP_2',
        mockContext
      );

      expect(result).toBe(true);
    });
  });
}); 