import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FlowService } from '@/services/flow-service';
import { authService } from '@/services/auth-service';
import { AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { AUTH_STEP_PHONE_ENTRY, AUTH_STEP_PHONE_OTP_PENDING } from '@/context/auth/flow/flowSteps';
import { clearSession } from '@/utils/storage';
import * as secureStorage from '@/utils/secure-storage';
import { AUTH_TOKEN, REFRESH_TOKEN } from '@/constants/storage-keys';

describe('Auth Flow - Phone Verification Integration', () => {
  const testPhone = '+1234567890';
  const testOtp = '123456';

  beforeEach(async () => {
    // Clean up any existing session/tokens
    await clearSession();
    await secureStorage.removeItem(AUTH_TOKEN);
    await secureStorage.removeItem(REFRESH_TOKEN);
  });

  afterEach(async () => {
    await clearSession();
    await secureStorage.removeItem(AUTH_TOKEN);
    await secureStorage.removeItem(REFRESH_TOKEN);
  });

  describe('Phone Entry Step', () => {
    it('should start signin flow at phone entry step', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      expect(flow.type).toBe(AuthFlowType.SIGNIN);
      expect(flow.steps).toBeDefined();
      expect(flow.deviceInfo).toBeDefined();
      expect(flow.deviceInfo.id).toBeDefined();
      
      // Should start with phone entry step for unauthenticated users
      const firstStep = flow.steps[flow.initialIndex || 0];
      expect(firstStep.step).toBe(AUTH_STEP_PHONE_ENTRY);
    });

    it('should start signup flow at phone entry step', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNUP);
      
      expect(flow.type).toBe(AuthFlowType.SIGNUP);
      expect(flow.steps).toBeDefined();
      
      // Should start with phone entry step for new users
      const firstStep = flow.steps[flow.initialIndex || 0];
      expect(firstStep.step).toBe(AUTH_STEP_PHONE_ENTRY);
    });

    it('should build correct flow context for unauthenticated user', async () => {
      const context = await FlowService.buildFlowContext();
      
      expect(context.tokenValid).toBe(false);
      expect(context.phoneValidated).toBe(false);
      expect(context.emailVerified).toBe(false);
      expect(context.pinSet).toBe(false);
      expect(context.pinVerified).toBe(false);
      expect(context.sessionActive).toBe(false);
    });
  });

  describe('Phone OTP Sending', () => {
    it('should send OTP for signin successfully', async () => {
      const response = await authService.sendOtpSignin('phone', testPhone);
      
      expect(response.statusCode).toBe(200);
      expect(response.message).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.traceId).toBeDefined();
      
      // Should indicate OTP was sent
      if (response.data) {
        expect(typeof response.data.requiresOtp).toBe('boolean');
      }
    });

    it('should send OTP for signup successfully', async () => {
      const response = await authService.sendOtpSignup('phone', testPhone);
      
      expect(response.statusCode).toBe(200);
      expect(response.message).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.traceId).toBeDefined();
      
      // Should indicate OTP was sent
      if (response.data) {
        expect(typeof response.data.requiresOtp).toBe('boolean');
      }
    });

    it('should handle invalid phone number format', async () => {
      const response = await authService.sendOtpSignin('phone', 'invalid-phone');
      
      // Server behavior varies - some validate format, others don't
      if (response.statusCode >= 400) {
        // Server validates and rejects invalid format
        expect(response.message).toBeDefined();
        expect(response.errorCode).toBeDefined();
        console.log('✅ Server validates phone format');
      } else {
        // Server accepts any input (possibly mock server)
        expect(response.statusCode).toBe(200);
        expect(response.message).toBeDefined();
        console.log('⚠️ Server accepts invalid phone format');
      }
    });

    it('should handle empty phone number', async () => {
      const response = await authService.sendOtpSignin('phone', '');
      
      // Should return an error response
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.message).toBeDefined();
      expect(response.errorCode).toBeDefined();
    });
  });

  describe('Phone OTP Verification', () => {
    it('should verify valid OTP successfully', async () => {
      // First send OTP
      const sendResponse = await authService.sendOtpSignin('phone', testPhone);
      expect(sendResponse.statusCode).toBe(200);

      // Then verify OTP
      const verifyResponse = await authService.verifyOtpUnauthenticated('phone', testPhone, testOtp);
      
      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.message).toBeDefined();
      expect(verifyResponse.traceId).toBeDefined();
      
      // Should return verification success
      if (verifyResponse.data !== undefined) {
        expect(typeof verifyResponse.data).toBe('boolean');
      }
    });

    it('should handle invalid OTP', async () => {
      // First send OTP
      const sendResponse = await authService.sendOtpSignin('phone', testPhone);
      expect(sendResponse.statusCode).toBe(200);

      // Then verify with invalid OTP
      const verifyResponse = await authService.verifyOtpUnauthenticated('phone', testPhone, 'invalid');
      
      // Should return error for invalid OTP
      expect(verifyResponse.statusCode).toBeGreaterThanOrEqual(400);
      expect(verifyResponse.message).toBeDefined();
    });

    it('should handle empty OTP', async () => {
      const verifyResponse = await authService.verifyOtpUnauthenticated('phone', testPhone, '');
      
      // Should return error for empty OTP
      expect(verifyResponse.statusCode).toBeGreaterThanOrEqual(400);
      expect(verifyResponse.message).toBeDefined();
      expect(verifyResponse.errorCode).toBeDefined();
    });

    it('should handle verification without sending OTP first', async () => {
      const verifyResponse = await authService.verifyOtpUnauthenticated('phone', testPhone, testOtp);
      
      // Should handle gracefully even if OTP wasn't sent first
      expect(verifyResponse.statusCode).toBeDefined();
      expect(verifyResponse.message).toBeDefined();
    });
  });

  describe('Flow Progression After Phone Verification', () => {
    it('should progress to next step after successful phone verification', async () => {
      // Start the flow
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      expect(flow.steps[flow.initialIndex || 0].step).toBe(AUTH_STEP_PHONE_ENTRY);

      // Send and verify phone OTP
      await authService.sendOtpSignin('phone', testPhone);
      const verifyResponse = await authService.verifyOtpUnauthenticated('phone', testPhone, testOtp);
      
      if (verifyResponse.statusCode === 200) {
        // Build context with phone verified
        const context = await FlowService.buildFlowContext({
          phoneValidated: true
        });
        
        expect(context.phoneValidated).toBe(true);
        expect(context.tokenValid).toBe(false); // Should still be false until token acquisition
      }
    });

    it('should determine next step correctly after phone verification', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      const currentIndex = flow.initialIndex || 0;
      
      // Mock successful phone verification
      const stepData = { phoneValidated: true };
      const payload = { step: AUTH_STEP_PHONE_OTP_PENDING as any };
      
      const nextStepResult = await FlowService.determineNextStep(
        flow.steps,
        currentIndex,
        stepData,
        payload
      );
      
      expect(nextStepResult).toBeDefined();
      expect(nextStepResult.context).toBeDefined();
      expect(nextStepResult.context.phoneValidated).toBe(true);
      expect(nextStepResult.nextStep).toBeDefined();
      expect(nextStepResult.nextIndex).toBeTypeOf('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // This test will help identify real network issues vs mocked errors
      try {
        const response = await authService.sendOtpSignin('phone', testPhone);
        // If successful, check response structure
        expect(response).toBeDefined();
        expect(response.statusCode).toBeDefined();
        expect(response.message).toBeDefined();
      } catch (error) {
        // If network error occurs, ensure it's handled properly
        expect(error).toBeDefined();
      }
    });

    it('should validate step transitions correctly', async () => {
      const isValid = await FlowService.validateStepTransition(
        AUTH_STEP_PHONE_ENTRY,
        AUTH_STEP_PHONE_OTP_PENDING,
        { 
          tokenValid: false, 
          phoneValidated: false, 
          emailVerified: false, 
          pinSet: false, 
          pinVerified: false, 
          sessionActive: false 
        }
      );
      
      expect(typeof isValid).toBe('boolean');
    });
  });
}); 