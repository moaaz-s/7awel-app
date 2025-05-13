"use client"

import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '@/context/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  AUTH_STEP_PHONE_ENTRY, 
  AUTH_STEP_PHONE_OTP_PENDING, 
  AUTH_STEP_EMAIL_ENTRY_PENDING, 
  AUTH_STEP_EMAIL_OTP_PENDING, 
  AUTH_STEP_PIN_SETUP_PENDING, 
  AUTH_STEP_AUTHENTICATED, 
  AUTH_STEP_PIN_ENTRY_PENDING, 
  AUTH_STEP_INITIATE, 
  AUTH_STEP_LOCKED,
  AUTH_STEP_TOKEN_ACQUISITION
} from '@/constants/auth-steps';
import { AuthFlowType } from '@/constants/auth-flows';
import { OtpChannel } from '@/services/api-service';
import { 
  CheckCircle, 
  Lock, 
  AlertTriangle, 
  Mail,
  Loader2 
} from 'lucide-react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Use loadPlatform to get the right platform implementation
import { loadPlatform } from '@/platform';


// Import step components
import { PhoneInput } from '../phone-input'; 
import { OtpVerification } from '../otp-verification';
import { EmailInput } from '../email-input'; 
import { ActionPopup } from '../shared/ActionPopup';
import PinSetup from './PinSetup';
import { PinEntry } from '../pin-entry';

interface AuthFlowManagerProps {
  flowType: AuthFlowType;
  onComplete?: () => void;
}

// Helper function to format time remaining in MM:SS format
function formatTimeRemaining(timeMs: number): string {
  if (timeMs <= 0) return '00:00';
  
  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function AuthFlowManager({ flowType, onComplete }: AuthFlowManagerProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const { 
      currentStep, 
      stepData, 
      error, 
      isLoading, 
      advanceFlow, 
      initiateFlow, 
      resendPhoneOtp, 
      resendEmailOtp,
      forgotPin,
      getAuthToken,
      activeFlow
    } = useAuth(); 

    // Initialize the flow based on flowType - using a more robust approach with useRef
    const flowInitialized = useRef<{[key: string]: boolean}>({});
    
    useEffect(() => {
      if (!flowInitialized.current[flowType]) {
        console.log(`[AuthFlowManager] First time initializing flow: ${flowType}`);
        flowInitialized.current[flowType] = true;
        setTimeout(() => {
          (async () => {
            try {
              const token = await getAuthToken();
              const initialData = token ? { tokenValid: true } : undefined;
              initiateFlow(flowType, initialData);
            } catch (err) {
              console.error('[AuthFlowManager] Error checking token during init:', err);
              initiateFlow(flowType);
            }
          })();
        }, 0);
      }
    }, [flowType, initiateFlow, getAuthToken]);

    // Separate effect for debugging that won't contribute to render cycles
    useEffect(() => {
      if (currentStep) {
        console.log("[AuthFlowManager] Current Step:", currentStep, "Data:", stepData, "Error:", error);
      }
    }, [currentStep, stepData, error]);

    // Guard auto-advance in token acquisition step so it runs only once per entry
    const hasAutoAdvancedRef = useRef(false);

    useEffect(() => {
      if (currentStep === AUTH_STEP_TOKEN_ACQUISITION && !error && !hasAutoAdvancedRef.current) {
        hasAutoAdvancedRef.current = true;
        advanceFlow({});
      }
      if (currentStep !== AUTH_STEP_TOKEN_ACQUISITION) {
        hasAutoAdvancedRef.current = false;
      }
    }, [currentStep, error]);

    // Move onComplete out of render: trigger after authenticated via effect
    useEffect(() => {
      if (currentStep === AUTH_STEP_AUTHENTICATED && !error && onComplete) {
        onComplete();
      }
    }, [currentStep, error, onComplete]);

    // Get the proper title and subtitle based on the flow and current step
    const getFlowTitle = () => {
      // Override based on specific steps
      switch (currentStep) {
        case AUTH_STEP_PHONE_ENTRY:
          return t("auth.phoneEntryTitle");
        case AUTH_STEP_PHONE_OTP_PENDING:
          return t("auth.phoneOtpVerificationTitle");
        case AUTH_STEP_PIN_SETUP_PENDING:
          return "";
        case AUTH_STEP_PIN_ENTRY_PENDING:
          return "";
        case AUTH_STEP_EMAIL_ENTRY_PENDING:
          return t("auth.emailEntryTitle");
        case AUTH_STEP_EMAIL_OTP_PENDING:
          return t("auth.emailOtpVerificationTitle");
        case AUTH_STEP_AUTHENTICATED:
          return "";
        default:
          // Fall back to flow-based title
          if (flowType === AuthFlowType.SIGNIN) {
            return t("auth.signInTitle");
          } else if (flowType === AuthFlowType.SIGNUP) {
            return t("auth.signUpTitle");
          } else if (flowType === AuthFlowType.FORGOT_PIN) {
            return t("auth.resetPinTitle");
          }
          return t("auth.signInTitle");
      }
    };
    
    const getFlowSubtitle = () => {
      // Override based on specific steps
      switch (currentStep) {
        case AUTH_STEP_PHONE_ENTRY:
          return t("auth.phoneEntrySubtitle");
        case AUTH_STEP_PHONE_OTP_PENDING:
          return t("auth.phoneOtpVerificationSubtitle");
        case AUTH_STEP_PIN_SETUP_PENDING:
          return "";
        case AUTH_STEP_PIN_ENTRY_PENDING:
          return "";
        case AUTH_STEP_EMAIL_ENTRY_PENDING:
          return t("auth.emailEntrySubtitle");
        case AUTH_STEP_EMAIL_OTP_PENDING:
          return t("auth.emailOtpVerificationSubtitle");
        case AUTH_STEP_AUTHENTICATED:
          return "";
        default:
          // Fall back to flow-based subtitle
          if (flowType === AuthFlowType.SIGNIN) {
            return t("auth.signInSubtitle");
          } else if (flowType === AuthFlowType.SIGNUP) {
            return t("auth.signUpSubtitle");
          } else if (flowType === AuthFlowType.FORGOT_PIN) {
            return t("auth.resetPinSubtitle");
          }
          return t("auth.signInSubtitle");
      }
    };
    
    // Generate footer content based on flow type
    const getFooterContent = () => {
      if ([AUTH_STEP_AUTHENTICATED, AUTH_STEP_LOCKED, AUTH_STEP_PIN_ENTRY_PENDING].includes(currentStep || "")) {
        return null;
      } else if (flowType === AuthFlowType.SIGNIN) {
        return (
          <div className="text-center text-sm">
            {t("auth.dontHaveAccount")}{" "}
            <Link href="/sign-up" className="text-primary font-medium hover:underline ml-1">
              {t("auth.signUp")}
            </Link>
          </div>
        );
      } else if (flowType === AuthFlowType.SIGNUP) {
        return (
          <div className="text-center text-sm">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link href="/sign-in" className="text-primary font-medium hover:underline ml-1">
              {t("auth.signIn")}
            </Link>
          </div>
        );
      }
      
      return null;
    };

    // Handle initial loading or unknown state
    if (currentStep === null && !isLoading) {
        return (
          <div className="flex flex-col items-center justify-center p-6 h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">{t('auth.initializing')}</p>
          </div>
        );
    }
    
    if (isLoading && !currentStep) {
        return (
          <AuthLayout
            title={getFlowTitle()}
            subtitle={getFlowSubtitle()}
            footerContent={getFooterContent()}
          >
            <div className="flex flex-col items-center justify-center p-6 h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">{t('auth.loading')}</p>
            </div>
          </AuthLayout>
        );
    }

    // Determine if back button should be shown and where it should navigate
    const isFirstStep = currentStep === AUTH_STEP_PHONE_ENTRY || 
                         currentStep === AUTH_STEP_EMAIL_ENTRY_PENDING ||
                         currentStep === AUTH_STEP_INITIATE;
                         
    const canGoBack = !isFirstStep && (
      (currentStep === AUTH_STEP_PHONE_OTP_PENDING) || 
      (currentStep === AUTH_STEP_EMAIL_OTP_PENDING && stepData.email)
    );
    
    // Function to handle back button press
    const handleBack = () => {
      if (isFirstStep) {
        // First step - go back to home page
        router.push('/');
      } else if (currentStep === AUTH_STEP_PHONE_OTP_PENDING) {
        initiateFlow(flowType); // Restart flow to go back to phone entry
      } else if (currentStep === AUTH_STEP_EMAIL_OTP_PENDING) {
        initiateFlow(flowType); // Restart flow to go back to email entry
      }
    };

    // Render only the active step content without headers or titles
    // since these are now handled by the parent AuthLayout
    const renderStepContent = () => {
      switch (currentStep) {
        case AUTH_STEP_PHONE_ENTRY:
          return (
            <PhoneInput
              defaultPhoneNumber={stepData.phone}
              onSubmit={(phone, channel) => advanceFlow({ phone, channel })}
              error={error || undefined}
              isLoading={isLoading}
            />
          );
        case AUTH_STEP_PHONE_OTP_PENDING:
          return (
            <OtpVerification
              onVerify={(otp) => advanceFlow({ otp })}
              onResend={resendPhoneOtp}
              error={error || undefined}
              isLoading={isLoading}
              channelLabel={stepData.channel === OtpChannel.WHATSAPP ? 
                t('auth.whatsapp') : t('auth.telegram')}
              expiryTs={stepData.otpExpires}
            />
          );
        case AUTH_STEP_EMAIL_ENTRY_PENDING:
          return (
            <EmailInput
              onSubmit={(email) => advanceFlow({ email })}
              errorMessage={error || undefined}
              isLoading={isLoading}
            />
          );
        case AUTH_STEP_EMAIL_OTP_PENDING:
          return (
            <OtpVerification
                channelLabel={stepData.email || ''} // User's email
                onVerify={(otp) => advanceFlow({ emailCode: otp })}
                onResend={async () => {
                  if (stepData.email && resendEmailOtp) {
                    try {
                      await resendEmailOtp(stepData.email);
                    } catch (err) {
                      // Error is typically handled and displayed by useAuth/AuthContext
                      console.error("[AuthFlowManager] Failed to resend email OTP:", err);
                    }
                  }
                }}
                expiryTs={stepData.emailOtpExpires} // OTP expiry time
                isLoading={isLoading}
                error={error} // Pass down error for display
              />
          );
        case AUTH_STEP_PIN_SETUP_PENDING:
          return (
            <PinSetup
              onSubmit={(pin: string) => advanceFlow({ pin })}
              isLoading={isLoading}
              // error={error || undefined}
            />
          );
        case AUTH_STEP_PIN_ENTRY_PENDING:
          return (
            <PinEntry
              onComplete={(pin) => advanceFlow({ pin })}
              onForgotPin={forgotPin}
              isLoading={isLoading}
              // error={error || undefined} // removed because we don't need to surface errors from the auth context, we only need to show errors internal to the PIN entry component
            />
          );

        case AUTH_STEP_TOKEN_ACQUISITION:
          return (
            <div className="flex flex-col flex-1 items-center justify-center p-6">
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <>
                  {error && <p className="text-red-500 mb-4">{error}</p>}
                  <Button onClick={() => advanceFlow({})}>
                    {t('auth.retry')}
                  </Button>
                </>
              )}
            </div>
          );
        case AUTH_STEP_AUTHENTICATED:
          return (
            <div className="flex flex-col flex-1 items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        case AUTH_STEP_LOCKED:
          return (
            <ActionPopup
              open={true}
              title={t('auth.locked.title')}
              description={t('auth.locked.subtitle')}
              icon={<Lock className="w-16 h-16 text-red-500" />}
              primaryActionText={t('auth.locked.tryAgain')}
              onPrimaryAction={() => initiateFlow(AuthFlowType.SIGNIN)}
              secondaryActionText={t('auth.goToOnboarding')}
              onSecondaryAction={() => router.push('/')}
            />
          );
        default:
          return (
            <ActionPopup
              open={true}
              title={t('auth.errorStepTitle')}
              description={t('auth.errorStepSubtitle')}
              icon={<AlertTriangle className="w-16 h-16 text-amber-500" />}
              primaryActionText={t('auth.errorStepRestart')}
              onPrimaryAction={() => initiateFlow(flowType)}
            />
          );
      }
    };

    return (
      <AuthLayout
        title={getFlowTitle()}
        subtitle={getFlowSubtitle()}
        footerContent={getFooterContent()}
        backHref={isFirstStep ? '/' : undefined}
        backAction={!isFirstStep && canGoBack ? handleBack : undefined}
      >
        {renderStepContent()}
      </AuthLayout>
    );
}
