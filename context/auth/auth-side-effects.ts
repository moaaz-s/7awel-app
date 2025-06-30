/**
 * auth-side-effects.ts
 * 
 * Pure functions for authentication side effects (API calls).
 * Returns error codes instead of translated messages for better testability.
 */

import { info, error as logError } from '@/utils/logger';
import { userService } from '@/services/user-service';
import { authService } from '@/services/auth-service';
import { acquireTokens } from '@/utils/token-service';
import { ErrorCode } from '@/types/errors';
import { 
  AuthStep,
  AUTH_STEP_PHONE_ENTRY,
  AUTH_STEP_PHONE_OTP_PENDING,
  AUTH_STEP_EMAIL_ENTRY_PENDING,
  AUTH_STEP_EMAIL_OTP_PENDING,
  AUTH_STEP_USER_PROFILE_PENDING,
  AUTH_STEP_PIN_SETUP_PENDING,
  AUTH_STEP_PIN_ENTRY_PENDING,
  AUTH_STEP_TOKEN_ACQUISITION
} from './flow/flowSteps';
import { AuthFlowState, FlowPayload, OTP_CHANNEL } from './auth-types';
import { AuthFlowType } from './flow/flowsOrchestrator';

// Side effect result type
export type SideEffectResult = {
  success: boolean;
  errorCode?: ErrorCode;
  data?: Partial<AuthFlowState>;
};

/**
 * Execute side effects for each auth flow step
 * This is a pure function that only performs API calls and returns results
 */
export async function executeStepSideEffects(
  step: AuthStep,
  flowState: AuthFlowState,
  payload: FlowPayload
): Promise<SideEffectResult> {
  info(`[SideEffects] Executing side effects for step: ${step}`);
  
  try {
    switch (step) {

      case AUTH_STEP_PHONE_ENTRY: {
        const { countryCode, phoneNumber, channel } = payload;
        if (!countryCode || !phoneNumber) {
          return { 
            success: false, 
            errorCode: ErrorCode.VALIDATION_ERROR 
          };
        }
        
        const normalizedChannel = channel || OTP_CHANNEL.WHATSAPP;
        const formattedPhone = `${countryCode}${phoneNumber}`;
        
        const endpoint = flowState.activeFlow?.type === AuthFlowType.SIGNUP?
          authService.sendOtpSignup
          : authService.sendOtpSignin;

        info('[SideEffects] Sending OTP to phone:', formattedPhone);
        const response = await endpoint('phone', formattedPhone, normalizedChannel);
        
        if (response.error || !response.data) {
          logError('[SideEffects] Phone OTP send failed:', response);
          return { 
            success: false, 
            errorCode: ErrorCode.OTP_SEND_FAILED 
          };
        }
        
        const expires = response.data?.expires;
        return { 
          success: true, 
          data: expires ? { phoneOtpExpires: expires } : undefined 
        };
      }
      
      case AUTH_STEP_PHONE_OTP_PENDING: {
        const { otp } = payload;
        if (!otp || !flowState.phone) {
          return { 
            success: false, 
            errorCode: ErrorCode.VALIDATION_ERROR 
          };
        }
        
        info('[SideEffects] Verifying phone OTP');
        const response = await authService.verifyOtpUnauthenticated('phone', flowState.phone, otp);
        
        if (response?.statusCode !== 200) {
          logError('[SideEffects] Phone OTP verification failed:', response);
          return { 
            success: false, 
            errorCode: ErrorCode.OTP_VERIFY_FAILED 
          };
        }
        return { success: true };
      }
      
      case AUTH_STEP_EMAIL_ENTRY_PENDING: {
        const { email } = payload;
        if (!email) {
          return { 
            success: false, 
            errorCode: ErrorCode.VALIDATION_ERROR 
          };
        }
        
        info('[SideEffects] Sending OTP to email:', email);
        const endpoint = flowState.activeFlow?.type === AuthFlowType.SIGNUP?
          authService.sendOtpSignup
          : authService.sendOtpSignin;
        const response = await endpoint('email', email);
        
        if (response?.statusCode !== 200) {
          logError('[SideEffects] Email OTP send failed:', response);
          return { 
            success: false, 
            errorCode: ErrorCode.OTP_SEND_FAILED 
          };
        }
        
        const expires = response.data?.expires;
        return { 
          success: true, 
          data: expires ? { emailOtpExpires: expires } : undefined 
        };
      }
      
      case AUTH_STEP_EMAIL_OTP_PENDING: {
        const { emailCode } = payload;
        const email = flowState.email;
        
        if (!emailCode || !email) {
          return { 
            success: false, 
            errorCode: ErrorCode.VALIDATION_ERROR 
          };
        }
        
        info('[SideEffects] Verifying email OTP');
        const response = await authService.verifyOtpUnauthenticated('email', email, emailCode);
        
        if (response?.statusCode !== 200) {
          logError('[SideEffects] Email OTP verification failed:', response);
          return { 
            success: false, 
            errorCode: ErrorCode.OTP_VERIFY_FAILED 
          };
        }
        return { success: true };
      }
      
      case AUTH_STEP_USER_PROFILE_PENDING: {
        const { firstName, lastName, dob, gender, address } = payload;
        
        if (!firstName || !lastName || !address) {
          return { 
            success: false, 
            errorCode: ErrorCode.VALIDATION_ERROR 
          };
        }
        
        info('[SideEffects] Updating user profile');
        const profileData = {
          firstName,
          lastName,
          address,
          dob,
          gender: gender as "male" | "female" | "other" | undefined
        };
        
        const response = await userService.updateUser(profileData);
        
        if (!response || response.statusCode !== 200) {
          logError('[SideEffects] Profile update failed:', response);
          return { 
            success: false, 
            errorCode: ErrorCode.PROFILE_CREATE_FAILED 
          };
        }
        
        // Return complete user data if available
        return { 
          success: true, 
          data: response.data ? { user: response.data } : undefined 
        };
      }
      
      case AUTH_STEP_TOKEN_ACQUISITION: {
        const phone = flowState.phone || flowState.phoneNumber;
        const email = flowState.email;
        
        if (!phone) {
          return { 
            success: false, 
            errorCode: ErrorCode.VALIDATION_ERROR 
          };
        }
        
        info('[SideEffects] Acquiring tokens');
        const tokenAcquired = await acquireTokens(phone, email || '');
        
        if (!tokenAcquired) {
          logError('[SideEffects] Token acquisition failed',);
          return { 
            success: false, 
            errorCode: ErrorCode.TOKEN_ACQUISITION_FAILED 
          };
        }
        
        // Fetch user data after token acquisition
        try {
          const userResponse = await userService.getUser();
          if (userResponse && userResponse.statusCode === 200 && userResponse.data) {
            return { 
              success: true, 
              data: { 
                tokenAcquired: true,
                user: userResponse.data.user 
              } 
            };
          }
        } catch (error) {
          logError('[SideEffects] Failed to fetch user after token acquisition:', error);
        }
        
        return { 
          success: true, 
          data: { tokenAcquired: true } 
        };
      }
      
      // PIN-related steps don't have API side effects, handled by PIN manager
      case AUTH_STEP_PIN_SETUP_PENDING:
      case AUTH_STEP_PIN_ENTRY_PENDING:
        // These are handled by the PIN manager in AuthContext
        return { success: true };
      
      default:
        info(`[SideEffects] No side effects for step: ${step}`);
        return { success: true };
    }
  } catch (error: any) {
    logError(`[SideEffects] Error in step ${step}:`, error);
    return { 
      success: false, 
      errorCode: ErrorCode.UNKNOWN 
    };
  }
}
