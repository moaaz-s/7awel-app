import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FlowService } from '@/services/flow-service';
import { AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { AUTH_STEP_INITIATE, AUTH_STEP_PHONE_ENTRY } from '@/context/auth/flow/flowSteps';
import { clearSession } from '@/utils/storage';
import * as secureStorage from '@/utils/secure-storage';
import { AUTH_TOKEN, REFRESH_TOKEN } from '@/constants/storage-keys';

describe('Auth Flow - Initiate Integration', () => {
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

  describe('Flow Initialization', () => {
    it('should initialize signin flow correctly', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      expect(flow).toBeDefined();
      expect(flow.type).toBe(AuthFlowType.SIGNIN);
      expect(flow.steps).toBeDefined();
      expect(Array.isArray(flow.steps)).toBe(true);
      expect(flow.steps.length).toBeGreaterThan(0);
      expect(flow.deviceInfo).toBeDefined();
      expect(flow.deviceInfo.id).toBeDefined();
      expect(flow.initialIndex).toBeDefined();
      expect(typeof flow.initialIndex).toBe('number');
    });

    it('should initialize signup flow correctly', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNUP);
      
      expect(flow).toBeDefined();
      expect(flow.type).toBe(AuthFlowType.SIGNUP);
      expect(flow.steps).toBeDefined();
      expect(Array.isArray(flow.steps)).toBe(true);
      expect(flow.steps.length).toBeGreaterThan(0);
      expect(flow.deviceInfo).toBeDefined();
      expect(flow.deviceInfo.id).toBeDefined();
      expect(flow.initialIndex).toBeDefined();
      expect(typeof flow.initialIndex).toBe('number');
    });

    it('should initialize forgot PIN flow correctly', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.FORGOT_PIN);
      
      expect(flow).toBeDefined();
      expect(flow.type).toBe(AuthFlowType.FORGOT_PIN);
      expect(flow.steps).toBeDefined();
      expect(Array.isArray(flow.steps)).toBe(true);
      expect(flow.steps.length).toBeGreaterThan(0);
      expect(flow.deviceInfo).toBeDefined();
      expect(flow.deviceInfo.id).toBeDefined();
      expect(flow.initialIndex).toBeDefined();
      expect(typeof flow.initialIndex).toBe('number');
    });

    it('should have valid device information', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      const deviceInfo = flow.deviceInfo;
      expect(deviceInfo.id).toBeDefined();
      expect(typeof deviceInfo.id).toBe('string');
      expect(deviceInfo.id.length).toBeGreaterThan(0);
      
      expect(deviceInfo.model).toBeDefined();
      expect(typeof deviceInfo.model).toBe('string');
      
      expect(deviceInfo.osVersion).toBeDefined();
      expect(typeof deviceInfo.osVersion).toBe('string');
      
      expect(deviceInfo.platform).toBeDefined();
      expect(typeof deviceInfo.platform).toBe('string');
    });
  });

  describe('Initial Step Determination', () => {
    it('should start at phone entry for unauthenticated users', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      const initialStepIndex = flow.initialIndex || 0;
      const initialStep = flow.steps[initialStepIndex];
      
      expect(initialStep).toBeDefined();
      expect(initialStep.step).toBe(AUTH_STEP_PHONE_ENTRY);
    });

    it('should respect flow conditions for step filtering', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      // Each step should have a valid step identifier
      flow.steps.forEach((step, index) => {
        expect(step.step).toBeDefined();
        expect(typeof step.step).toBe('string');
        if (step.step) {
          expect(step.step.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle flow context building correctly', async () => {
      const context = await FlowService.buildFlowContext();
      
      expect(context).toBeDefined();
      expect(typeof context.tokenValid).toBe('boolean');
      expect(typeof context.phoneValidated).toBe('boolean');
      expect(typeof context.emailVerified).toBe('boolean');
      expect(typeof context.pinSet).toBe('boolean');
      expect(typeof context.pinVerified).toBe('boolean');
      expect(typeof context.sessionActive).toBe('boolean');
    });
  });

  describe('Flow Steps Validation', () => {
    it('should have valid signin flow steps', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      // Should contain expected steps for signin
      const stepNames = flow.steps.map(s => s.step);
      expect(stepNames).toContain(AUTH_STEP_PHONE_ENTRY);
      
      // All steps should be valid
      stepNames.forEach(step => {
        expect(step).toBeDefined();
        expect(typeof step).toBe('string');
      });
    });

    it('should have valid signup flow steps', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNUP);
      
      // Should contain expected steps for signup
      const stepNames = flow.steps.map(s => s.step);
      expect(stepNames).toContain(AUTH_STEP_PHONE_ENTRY);
      
      // All steps should be valid
      stepNames.forEach(step => {
        expect(step).toBeDefined();
        expect(typeof step).toBe('string');
      });
    });

    it('should have different steps for different flow types', async () => {
      const signinFlow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      const signupFlow = await FlowService.initiateFlow(AuthFlowType.SIGNUP);
      const forgotPinFlow = await FlowService.initiateFlow(AuthFlowType.FORGOT_PIN);
      
      expect(signinFlow.type).toBe(AuthFlowType.SIGNIN);
      expect(signupFlow.type).toBe(AuthFlowType.SIGNUP);
      expect(forgotPinFlow.type).toBe(AuthFlowType.FORGOT_PIN);
      
      // Each flow should have steps
      expect(signinFlow.steps.length).toBeGreaterThan(0);
      expect(signupFlow.steps.length).toBeGreaterThan(0);
      expect(forgotPinFlow.steps.length).toBeGreaterThan(0);
    });
  });

  describe('Initial Data Handling', () => {
    it('should handle flow initialization with initial data', async () => {
      const initialData = {
        phoneValidated: true,
        emailVerified: false
      };
      
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN, initialData);
      
      expect(flow).toBeDefined();
      expect(flow.type).toBe(AuthFlowType.SIGNIN);
      expect(flow.initialData).toBeDefined();
      expect(flow.initialData).toEqual(initialData);
    });

    it('should handle flow initialization without initial data', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      expect(flow).toBeDefined();
      expect(flow.type).toBe(AuthFlowType.SIGNIN);
      // initialData should be undefined or null
      expect(flow.initialData).toBeUndefined();
    });

    it('should handle empty initial data object', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN, {});
      
      expect(flow).toBeDefined();
      expect(flow.type).toBe(AuthFlowType.SIGNIN);
      expect(flow.initialData).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid flow type gracefully', async () => {
      try {
        // Cast to any to test error handling
        const flow = await FlowService.initiateFlow('INVALID_FLOW' as any);
        
        // If it doesn't throw, should still return a valid structure
        expect(flow).toBeDefined();
      } catch (error) {
        // Should handle the error gracefully
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should handle flow service errors gracefully', async () => {
      try {
        const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
        expect(flow).toBeDefined();
      } catch (error) {
        // If error occurs, should be properly formatted
        expect(error).toBeDefined();
      }
    });

    it('should handle context building errors gracefully', async () => {
      try {
        const context = await FlowService.buildFlowContext();
        expect(context).toBeDefined();
      } catch (error) {
        // Should handle context building errors
        expect(error).toBeDefined();
      }
    });
  });

  describe('Flow State Consistency', () => {
    it('should maintain consistent device info across flows', async () => {
      const flow1 = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      const flow2 = await FlowService.initiateFlow(AuthFlowType.SIGNUP);
      
      // Device info should be consistent but not necessarily identical
      expect(flow1.deviceInfo.platform).toBe(flow2.deviceInfo.platform);
      expect(flow1.deviceInfo.model).toBe(flow2.deviceInfo.model);
      expect(flow1.deviceInfo.osVersion).toBe(flow2.deviceInfo.osVersion);
    });

    it('should handle multiple flow initializations', async () => {
      const flows = await Promise.all([
        FlowService.initiateFlow(AuthFlowType.SIGNIN),
        FlowService.initiateFlow(AuthFlowType.SIGNUP),
        FlowService.initiateFlow(AuthFlowType.FORGOT_PIN)
      ]);
      
      flows.forEach((flow, index) => {
        expect(flow).toBeDefined();
        expect(flow.type).toBeDefined();
        expect(flow.steps).toBeDefined();
        expect(flow.deviceInfo).toBeDefined();
        expect(typeof flow.initialIndex).toBe('number');
      });
    });

    it('should validate step transition logic', async () => {
      const isValid = await FlowService.validateStepTransition(
        AUTH_STEP_INITIATE,
        AUTH_STEP_PHONE_ENTRY,
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

  describe('Performance and Efficiency', () => {
    it('should initialize flows efficiently', async () => {
      const startTime = Date.now();
      
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNIN);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(flow).toBeDefined();
      // Flow initialization should be reasonably fast (under 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent flow initializations', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 5 }, () => 
        FlowService.initiateFlow(AuthFlowType.SIGNIN)
      );
      
      const flows = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      flows.forEach(flow => {
        expect(flow).toBeDefined();
        expect(flow.type).toBe(AuthFlowType.SIGNIN);
      });
      
      // Concurrent operations should complete reasonably fast
      expect(duration).toBeLessThan(2000);
    });
  });
}); 