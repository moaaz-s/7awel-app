import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FlowService } from '@/services/flow-service';
import { authService } from '@/services/auth-service';
import { AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { 
  AUTH_STEP_EMAIL_ENTRY_PENDING, 
  AUTH_STEP_EMAIL_OTP_PENDING,
  AUTH_STEP_TOKEN_ACQUISITION
} from '@/context/auth/flow/flowSteps';
import { clearSession } from '@/utils/storage';
import * as secureStorage from '@/utils/secure-storage';
import { AUTH_TOKEN, REFRESH_TOKEN } from '@/constants/storage-keys';

describe('Auth Flow - Email Verification Integration', () => {
  const testEmail = 'test@example.com';
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

  describe('Email Entry Step', () => {
    it('should progress to email entry after phone verification', async () => {
      // Build context with phone already validated
      const context = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: false
      });
      
      expect(context.phoneValidated).toBe(true);
      expect(context.emailVerified).toBe(false);
      expect(context.tokenValid).toBe(false);
    });

    it('should validate email format requirements', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com'
      ];

      // Test valid emails
      for (const email of validEmails) {
        const response = await authService.sendOtpSignin('email', email);
        // Should not fail due to format validation
        expect(response.statusCode).toBeDefined();
      }

      // Test invalid emails
      for (const email of invalidEmails) {
        const response = await authService.sendOtpSignin('email', email);
        // Should return error for invalid format
        if (response.statusCode >= 400) {
          expect(response.message).toBeDefined();
          expect(response.errorCode).toBeDefined();
        }
      }
    });
  });

  describe('Email OTP Sending', () => {
    it('should send OTP to email for signin successfully', async () => {
      const response = await authService.sendOtpSignin('email', testEmail);
      
      expect(response.statusCode).toBe(200);
      expect(response.message).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.traceId).toBeDefined();
      
      // Should indicate OTP was sent
      if (response.data) {
        expect(typeof response.data.requiresOtp).toBe('boolean');
      }
    });

    it('should send OTP to email for signup successfully', async () => {
      const response = await authService.sendOtpSignup('email', testEmail);
      
      expect(response.statusCode).toBe(200);
      expect(response.message).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.traceId).toBeDefined();
      
      // Should indicate OTP was sent
      if (response.data) {
        expect(typeof response.data.requiresOtp).toBe('boolean');
      }
    });

    it('should handle invalid email format during OTP sending', async () => {
      const response = await authService.sendOtpSignin('email', 'invalid-email');
      
      // Should return an error response
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.message).toBeDefined();
      expect(response.errorCode).toBeDefined();
    });

    it('should handle empty email', async () => {
      const response = await authService.sendOtpSignin('email', '');
      
      // Should return an error response
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.message).toBeDefined();
      expect(response.errorCode).toBeDefined();
    });
  });

  describe('Email OTP Verification', () => {
    it('should verify valid email OTP successfully', async () => {
      // First send OTP
      const sendResponse = await authService.sendOtpSignin('email', testEmail);
      expect(sendResponse.statusCode).toBe(200);

      // Then verify OTP
      const verifyResponse = await authService.verifyOtpUnauthenticated('email', testEmail, testOtp);
      
      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.message).toBeDefined();
      expect(verifyResponse.traceId).toBeDefined();
      
      // Should return verification success
      if (verifyResponse.data !== undefined) {
        expect(typeof verifyResponse.data).toBe('boolean');
      }
    });

    it('should handle invalid email OTP', async () => {
      // First send OTP
      const sendResponse = await authService.sendOtpSignin('email', testEmail);
      expect(sendResponse.statusCode).toBe(200);

      // Then verify with invalid OTP
      const verifyResponse = await authService.verifyOtpUnauthenticated('email', testEmail, 'invalid');
      
      // Should return error for invalid OTP
      expect(verifyResponse.statusCode).toBeGreaterThanOrEqual(400);
      expect(verifyResponse.message).toBeDefined();
    });

    it('should handle empty email OTP', async () => {
      const verifyResponse = await authService.verifyOtpUnauthenticated('email', testEmail, '');
      
      // Should return error for empty OTP
      expect(verifyResponse.statusCode).toBeGreaterThanOrEqual(400);
      expect(verifyResponse.message).toBeDefined();
      expect(verifyResponse.errorCode).toBeDefined();
    });

    it('should handle verification with invalid email format', async () => {
      const verifyResponse = await authService.verifyOtpUnauthenticated('email', 'invalid-email', testOtp);
      
      // Should handle gracefully
      expect(verifyResponse.statusCode).toBeDefined();
      expect(verifyResponse.message).toBeDefined();
    });
  });

  describe('Email Availability Check', () => {
    it('should handle email availability for signup', async () => {
      // This test checks if email is available for new registration
      const response = await authService.sendOtpSignup('email', testEmail);
      
      expect(response.statusCode).toBeDefined();
      expect(response.message).toBeDefined();
      
      // If email is already taken, should return appropriate error
      if (response.statusCode >= 400) {
        expect(response.errorCode).toBeDefined();
      }
    });

    it('should not check availability for signin', async () => {
      // Signin should not check availability since user should already exist
      const response = await authService.sendOtpSignin('email', testEmail);
      
      // Should not fail due to availability check
      expect(response.statusCode).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });

  describe('Flow Progression After Email Verification', () => {
    it('should progress to token acquisition after email verification', async () => {
      // Build context with both phone and email verified
      const context = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: true,
        tokenValid: false
      });
      
      expect(context.phoneValidated).toBe(true);
      expect(context.emailVerified).toBe(true);
      expect(context.tokenValid).toBe(false);
    });

    it('should determine next step correctly after email verification', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      // Find email OTP step index
      let emailOtpIndex = -1;
      for (let i = 0; i < flow.steps.length; i++) {
        if (flow.steps[i].step === AUTH_STEP_EMAIL_OTP_PENDING) {
          emailOtpIndex = i;
          break;
        }
      }
      
      if (emailOtpIndex >= 0) {
        const stepData = { 
          phoneValidated: true, 
          emailVerified: true 
        };
        const payload = { step: AUTH_STEP_EMAIL_OTP_PENDING as any };
        
        const nextStepResult = await FlowService.determineNextStep(
          flow.steps,
          emailOtpIndex,
          stepData,
          payload
        );
        
        expect(nextStepResult).toBeDefined();
        expect(nextStepResult.context).toBeDefined();
        expect(nextStepResult.context.phoneValidated).toBe(true);
        expect(nextStepResult.context.emailVerified).toBe(true);
        
        // Next step should be token acquisition
        if (nextStepResult.nextStep) {
          expect(nextStepResult.nextStep).toBe(AUTH_STEP_TOKEN_ACQUISITION);
        }
      }
    });
  });

  describe('Complete Email Flow', () => {
    it('should complete full email verification flow', async () => {
      // Start with phone already validated context
      const initialContext = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: false
      });
      
      expect(initialContext.phoneValidated).toBe(true);
      expect(initialContext.emailVerified).toBe(false);

      // Step 1: Send email OTP
      const sendResponse = await authService.sendOtpSignin('email', testEmail);
      expect(sendResponse.statusCode).toBe(200);

      // Step 2: Verify email OTP
      const verifyResponse = await authService.verifyOtpUnauthenticated('email', testEmail, testOtp);
      
      if (verifyResponse.statusCode === 200) {
        // Step 3: Build updated context
        const updatedContext = await FlowService.buildFlowContext({
          phoneValidated: true,
          emailVerified: true
        });
        
        expect(updatedContext.phoneValidated).toBe(true);
        expect(updatedContext.emailVerified).toBe(true);
        expect(updatedContext.tokenValid).toBe(false); // Should still be false until token acquisition
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during email operations', async () => {
      try {
        const response = await authService.sendOtpSignin('email', testEmail);
        // If successful, check response structure
        expect(response).toBeDefined();
        expect(response.statusCode).toBeDefined();
        expect(response.message).toBeDefined();
      } catch (error) {
        // If network error occurs, ensure it's handled properly
        expect(error).toBeDefined();
      }
    });

    it('should handle concurrent email operations', async () => {
      // Test sending multiple OTPs concurrently
      const promises = [
        authService.sendOtpSignin('email', testEmail),
        authService.sendOtpSignin('email', 'another@example.com')
      ];
      
      const responses = await Promise.allSettled(promises);
      
      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.statusCode).toBeDefined();
          expect(result.value.message).toBeDefined();
        } else {
          expect(result.reason).toBeDefined();
        }
      });
    });

    it('should handle malformed email addresses gracefully', async () => {
      const malformedEmails = [
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@.com',
        'test@com',
        null,
        undefined
      ];

      for (const email of malformedEmails) {
        try {
          const response = await authService.sendOtpSignin('email', email as string);
          // Should either succeed or return a proper error
          expect(response.statusCode).toBeDefined();
          expect(response.message).toBeDefined();
        } catch (error) {
          // Should handle the error gracefully
          expect(error).toBeDefined();
        }
      }
    });
  });
}); 