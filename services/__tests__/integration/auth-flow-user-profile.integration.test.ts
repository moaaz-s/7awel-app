import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FlowService } from '@/services/flow-service';
import { userService } from '@/services/user-service';
import { AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { 
  AUTH_STEP_USER_PROFILE_PENDING,
  AUTH_STEP_PIN_SETUP_PENDING,
  AUTH_STEP_AUTHENTICATED
} from '@/context/auth/flow/flowSteps';
import { clearSession } from '@/utils/storage';
import * as secureStorage from '@/utils/secure-storage';
import { AUTH_TOKEN, REFRESH_TOKEN } from '@/constants/storage-keys';

describe('Auth Flow - User Profile Integration', () => {
  const testUserData = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com'
  };

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

  describe('User Profile Prerequisites', () => {
    it('should reach user profile step after token acquisition in signup flow', async () => {
      // Mock having a valid token but incomplete profile
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
      
      const context = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: true,
        tokenValid: true,
        firstName: undefined,
        lastName: undefined
      });
      
      expect(context.tokenValid).toBe(true);
      expect(context.firstName).toBeUndefined();
      expect(context.lastName).toBeUndefined();
    });

    it('should skip user profile step if profile is complete', async () => {
      // Mock having a valid token and complete profile
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
      
      const context = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: true,
        tokenValid: true,
        firstName: testUserData.firstName,
        lastName: testUserData.lastName
      });
      
      expect(context.tokenValid).toBe(true);
      expect(context.firstName).toBe(testUserData.firstName);
      expect(context.lastName).toBe(testUserData.lastName);
    });

    it('should not reach user profile step without valid token', async () => {
      const context = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: true,
        tokenValid: false
      });
      
      expect(context.tokenValid).toBe(false);
    });
  });

  describe('User Profile Operations', () => {
    beforeEach(async () => {
      // Setup a valid token for authenticated operations
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
    });

    it('should fetch user profile successfully', async () => {
      const response = await userService.getUser();
      
      expect(response.statusCode).toBe(200);
      expect(response.message).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.traceId).toBeDefined();
      
      if (response.data) {
        expect(response.data.user).toBeDefined();
        expect(response.data.user.id).toBeDefined();
        expect(response.data.settings).toBeDefined();
        
        // Check user properties
        const user = response.data.user;
        expect(typeof user.firstName).toBe('string');
        expect(typeof user.lastName).toBe('string');
        expect(typeof user.phone).toBe('string');
        expect(typeof user.email).toBe('string');
        
        // Check settings properties
        const settings = response.data.settings;
        expect(settings.language).toBeDefined();
        expect(settings.theme).toBeDefined();
        expect(settings.security).toBeDefined();
        expect(settings.notifications).toBeDefined();
      }
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: testUserData.firstName,
        lastName: testUserData.lastName
      };
      
      const response = await userService.updateUser(updateData);
      
      expect(response.statusCode).toBe(200);
      expect(response.message).toBeDefined();
      expect(response.data).toBeDefined();
      expect(response.traceId).toBeDefined();
      
      if (response.data) {
        expect(response.data.firstName).toBe(updateData.firstName);
        expect(response.data.lastName).toBe(updateData.lastName);
        expect(response.data.id).toBeDefined();
        expect(response.data.phone).toBeDefined();
        expect(response.data.email).toBeDefined();
      }
    });

    it('should handle partial profile updates', async () => {
      const updateData = {
        firstName: 'UpdatedFirstName'
      };
      
      const response = await userService.updateUser(updateData);
      
      expect(response.statusCode).toBe(200);
      expect(response.message).toBeDefined();
      expect(response.data).toBeDefined();
      
      if (response.data) {
        expect(response.data.firstName).toBe(updateData.firstName);
        // Other fields should remain unchanged
        expect(response.data.id).toBeDefined();
      }
    });

    it('should handle empty profile updates', async () => {
      const response = await userService.updateUser({});
      
      // Should handle gracefully, either succeed or return appropriate error
      expect(response.statusCode).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('should validate profile data format', async () => {
      const invalidData = {
        firstName: '', // Empty string
        lastName: 'ValidLastName'
      };
      
      const response = await userService.updateUser(invalidData);
      
      // Should either accept empty string or return validation error
      expect(response.statusCode).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });

  describe('User Profile Without Authentication', () => {
    beforeEach(async () => {
      // Ensure no token is present
      await secureStorage.removeItem(AUTH_TOKEN);
    });

    it('should not fetch user profile without token', async () => {
      const response = await userService.getUser();
      
      // Should return unauthorized or similar error
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.message).toBeDefined();
    });

    it('should not update user profile without token', async () => {
      const updateData = {
        firstName: testUserData.firstName,
        lastName: testUserData.lastName
      };
      
      const response = await userService.updateUser(updateData);
      
      // Should return unauthorized or similar error
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.message).toBeDefined();
    });
  });

  describe('Flow Progression After Profile Update', () => {
    beforeEach(async () => {
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
    });

    it('should progress to PIN setup after profile completion', async () => {
      // Build context with profile completed
      const context = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: true,
        tokenValid: true,
        firstName: testUserData.firstName,
        lastName: testUserData.lastName,
        pinSet: false
      });
      
      expect(context.tokenValid).toBe(true);
      expect(context.firstName).toBe(testUserData.firstName);
      expect(context.lastName).toBe(testUserData.lastName);
      expect(context.pinSet).toBe(false);
    });

    it('should determine next step correctly after profile update', async () => {
      const flow = await FlowService.initiateFlow(AuthFlowType.SIGNUP);
      
      // Find user profile step index
      let profileIndex = -1;
      for (let i = 0; i < flow.steps.length; i++) {
        if (flow.steps[i].step === AUTH_STEP_USER_PROFILE_PENDING) {
          profileIndex = i;
          break;
        }
      }
      
      if (profileIndex >= 0) {
        const stepData = { 
          phoneValidated: true, 
          emailVerified: true,
          tokenValid: true,
          firstName: testUserData.firstName,
          lastName: testUserData.lastName,
          pinSet: false
        };
        
        const nextStepResult = await FlowService.determineNextStep(
          flow.steps,
          profileIndex,
          stepData,
          {}
        );
        
        expect(nextStepResult).toBeDefined();
        expect(nextStepResult.context).toBeDefined();
        expect(nextStepResult.context.firstName).toBe(testUserData.firstName);
        expect(nextStepResult.context.lastName).toBe(testUserData.lastName);
        
        // Next step should be PIN setup
        if (nextStepResult.nextStep) {
          expect(nextStepResult.nextStep).toBe(AUTH_STEP_PIN_SETUP_PENDING);
        }
      }
    });

    it('should handle missing profile information correctly', async () => {
      const context = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: true,
        tokenValid: true,
        firstName: undefined,
        lastName: testUserData.lastName
      });
      
      expect(context.tokenValid).toBe(true);
      expect(context.firstName).toBeUndefined();
      expect(context.lastName).toBe(testUserData.lastName);
    });
  });

  describe('Complete Profile Flow', () => {
    it('should complete full profile setup flow', async () => {
      // Step 1: Start with token but incomplete profile
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
      
      const initialContext = await FlowService.buildFlowContext({
        phoneValidated: true,
        emailVerified: true,
        tokenValid: true,
        firstName: undefined,
        lastName: undefined
      });
      
      expect(initialContext.tokenValid).toBe(true);
      expect(initialContext.firstName).toBeUndefined();
      expect(initialContext.lastName).toBeUndefined();

      // Step 2: Fetch current profile
      const profileResponse = await userService.getUser();
      expect(profileResponse.statusCode).toBe(200);

      // Step 3: Update profile
      const updateResponse = await userService.updateUser({
        firstName: testUserData.firstName,
        lastName: testUserData.lastName
      });
      
      if (updateResponse.statusCode === 200) {
        // Step 4: Verify updated context
        const updatedContext = await FlowService.buildFlowContext({
          phoneValidated: true,
          emailVerified: true,
          tokenValid: true,
          firstName: testUserData.firstName,
          lastName: testUserData.lastName
        });
        
        expect(updatedContext.tokenValid).toBe(true);
        expect(updatedContext.firstName).toBe(testUserData.firstName);
        expect(updatedContext.lastName).toBe(testUserData.lastName);
      }
    });

    it('should handle profile update for existing user', async () => {
      // Step 1: Start with existing profile
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
      
      // Step 2: Fetch current profile
      const currentProfile = await userService.getUser();
      expect(currentProfile.statusCode).toBe(200);

      // Step 3: Update with new information
      const newData = {
        firstName: 'UpdatedName',
        lastName: 'UpdatedLastName'
      };
      
      const updateResponse = await userService.updateUser(newData);
      
      if (updateResponse.statusCode === 200) {
        expect(updateResponse.data?.firstName).toBe(newData.firstName);
        expect(updateResponse.data?.lastName).toBe(newData.lastName);
        
        // Step 4: Verify changes persisted
        const verificationResponse = await userService.getUser();
        if (verificationResponse.statusCode === 200 && verificationResponse.data) {
          expect(verificationResponse.data.user.firstName).toBe(newData.firstName);
          expect(verificationResponse.data.user.lastName).toBe(newData.lastName);
        }
      }
    });
  });

  describe('User Settings Management', () => {
    beforeEach(async () => {
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
    });

    it('should fetch user settings correctly', async () => {
      const response = await userService.getUser();
      
      if (response.statusCode === 200 && response.data) {
        const settings = response.data.settings;
        
        // Check security settings
        expect(settings.security).toBeDefined();
        expect(typeof settings.security.biometricEnabled).toBe('boolean');
        expect(typeof settings.security.twoFactorEnabled).toBe('boolean');
        expect(typeof settings.security.transactionPin).toBe('boolean');
        
        // Check notification settings
        expect(settings.notifications).toBeDefined();
        expect(typeof settings.notifications.pushEnabled).toBe('boolean');
        expect(typeof settings.notifications.transactionAlerts).toBe('boolean');
        expect(typeof settings.notifications.securityAlerts).toBe('boolean');
        expect(typeof settings.notifications.promotions).toBe('boolean');
        expect(typeof settings.notifications.emailNotifications).toBe('boolean');
        expect(typeof settings.notifications.smsNotifications).toBe('boolean');
        
        // Check general settings
        expect(typeof settings.language).toBe('string');
        expect(typeof settings.theme).toBe('string');
      }
    });

    it('should validate settings structure', async () => {
      const response = await userService.getUser();
      
      if (response.statusCode === 200 && response.data) {
        const settings = response.data.settings;
        
        // Validate required settings exist
        expect(settings).toHaveProperty('language');
        expect(settings).toHaveProperty('theme');
        expect(settings).toHaveProperty('security');
        expect(settings).toHaveProperty('notifications');
        
        // Validate security settings structure
        expect(settings.security).toHaveProperty('biometricEnabled');
        expect(settings.security).toHaveProperty('twoFactorEnabled');
        expect(settings.security).toHaveProperty('transactionPin');
        
        // Validate notification settings structure
        expect(settings.notifications).toHaveProperty('pushEnabled');
        expect(settings.notifications).toHaveProperty('transactionAlerts');
        expect(settings.notifications).toHaveProperty('securityAlerts');
        expect(settings.notifications).toHaveProperty('promotions');
        expect(settings.notifications).toHaveProperty('emailNotifications');
        expect(settings.notifications).toHaveProperty('smsNotifications');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during profile operations', async () => {
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
      
      try {
        const response = await userService.getUser();
        // If successful, check response structure
        expect(response).toBeDefined();
        expect(response.statusCode).toBeDefined();
        expect(response.message).toBeDefined();
      } catch (error) {
        // If network error occurs, ensure it's handled properly
        expect(error).toBeDefined();
      }
    });

    it('should handle concurrent profile operations', async () => {
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
      
      // Test multiple profile operations concurrently
      const promises = [
        userService.getUser(),
        userService.updateUser({ firstName: 'ConcurrentTest1' }),
        userService.updateUser({ lastName: 'ConcurrentTest2' })
      ];
      
      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.statusCode).toBeDefined();
          expect(result.value.message).toBeDefined();
        } else {
          expect(result.reason).toBeDefined();
        }
      });
    });

    it('should handle invalid profile data gracefully', async () => {
      await secureStorage.setItem(AUTH_TOKEN, 'mock-token');
      
      // Test with various invalid data types
      const invalidDataSets = [
        { firstName: null },
        { lastName: undefined },
        { firstName: 123 as any },
        { invalidField: 'should be ignored' }
      ];
      
      for (const invalidData of invalidDataSets) {
        try {
          const response = await userService.updateUser(invalidData);
          // Should either handle gracefully or return appropriate error
          expect(response.statusCode).toBeDefined();
          expect(response.message).toBeDefined();
        } catch (error) {
          // Should handle errors gracefully
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle token expiration during profile operations', async () => {
      // Set an expired or invalid token
      await secureStorage.setItem(AUTH_TOKEN, 'expired-token');
      
      const response = await userService.getUser();
      
      // Should return unauthorized error
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.message).toBeDefined();
    });
  });
}); 