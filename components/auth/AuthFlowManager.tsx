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
  AUTH_STEP_USER_PROFILE_PENDING,
  AUTH_STEP_PIN_SETUP_PENDING, 
  AUTH_STEP_AUTHENTICATED, 
  AUTH_STEP_PIN_ENTRY_PENDING, 
  AUTH_STEP_INITIATE,
  AUTH_STEP_TOKEN_ACQUISITION,
  AUTH_STEP_WALLET_CREATION_PENDING
} from '@/context/auth/flow/flowSteps';
import { AuthFlowType } from '@/context/auth/flow/flowsOrchestrator';
import { 
  AlertTriangle, 
  Loader2 
} from 'lucide-react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

// Import step components
import { PhoneInput } from '../phone-input'; 
import { OtpVerification } from '../otp-verification';
import { EmailInput } from '../email-input'; 
import { ActionPopup } from '../shared/ActionPopup';
import PinSetup from './PinSetup';
import ProfileStep from './ProfileStep';
import { PinPad } from '../pin-pad';
import { info } from '@/utils/logger';
import { setPinForgotten } from '@/utils/pin-service';
import { OTP_CHANNEL } from '@/context/auth/auth-types';

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
      flowState, 
      error, 
      isLoading, 
      advanceFlow, 
      initiateFlow
    } = useAuth(); 

    const { toast } = useToast();

    // Initialize the flow based on flowType - using a more robust approach with useRef
    const flowInitialized = useRef<{[key: string]: boolean}>({});
    
    useEffect(() => {
      if (!flowInitialized.current[flowType]) {
        info(`[AuthFlowManager] First time initializing flow: ${flowType}`);
        flowInitialized.current[flowType] = true;
        // initiateFlowOrchestration will compute tokenValid via buildFlowState
        initiateFlow(flowType);
      }
    }, [flowType, initiateFlow]);

    // Separate effect for debugging that won't contribute to render cycles
    useEffect(() => {
      if (currentStep) {
        info("[AuthFlowManager] Current Step:", currentStep, "Data:", flowState, "Error:", error);
      }
    }, [currentStep, flowState, error]);

    // Guard auto-advance in token acquisition and wallet creation steps so they run only once per entry
    const hasAutoAdvancedRef = useRef(false);

    useEffect(() => {
      if ((currentStep === AUTH_STEP_TOKEN_ACQUISITION || currentStep === AUTH_STEP_WALLET_CREATION_PENDING) && !error && !hasAutoAdvancedRef.current) {
        hasAutoAdvancedRef.current = true;
        advanceFlow({});
      }
      if (currentStep !== AUTH_STEP_TOKEN_ACQUISITION && currentStep !== AUTH_STEP_WALLET_CREATION_PENDING) {
        hasAutoAdvancedRef.current = false;
      }
    }, [advanceFlow, currentStep, error]);

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
        case AUTH_STEP_EMAIL_ENTRY_PENDING:
          return t("auth.emailEntryTitle");
        case AUTH_STEP_EMAIL_OTP_PENDING:
          return t("auth.emailOtpVerificationTitle");
        case AUTH_STEP_USER_PROFILE_PENDING:
          return t("One last thing");
        case AUTH_STEP_PIN_SETUP_PENDING:
        case AUTH_STEP_PIN_ENTRY_PENDING:
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
        case AUTH_STEP_EMAIL_ENTRY_PENDING:
          return t("auth.emailEntrySubtitle");
        case AUTH_STEP_EMAIL_OTP_PENDING:
          return t("auth.emailOtpVerificationSubtitle");
        case AUTH_STEP_USER_PROFILE_PENDING:
          return t("Only few details left");
        case AUTH_STEP_PIN_SETUP_PENDING:
        case AUTH_STEP_PIN_ENTRY_PENDING:
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
      if ([
        AUTH_STEP_TOKEN_ACQUISITION,
        AUTH_STEP_WALLET_CREATION_PENDING,
        AUTH_STEP_AUTHENTICATED,
        AUTH_STEP_PIN_ENTRY_PENDING,
        AUTH_STEP_PIN_SETUP_PENDING,
        AUTH_STEP_USER_PROFILE_PENDING
      ].includes(currentStep || "")) {
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
    if (!currentStep || isLoading) {
        return (
          <div className="flex flex-col items-center justify-center p-6 h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
    }

    // Determine if back button should be shown and where it should navigate
    const isFirstStep = currentStep === AUTH_STEP_PHONE_ENTRY || 
                         currentStep === AUTH_STEP_EMAIL_ENTRY_PENDING ||
                         currentStep === AUTH_STEP_INITIATE;
                         
    const canGoBack = !isFirstStep && (
      (currentStep === AUTH_STEP_PHONE_OTP_PENDING) || 
      (currentStep === AUTH_STEP_EMAIL_OTP_PENDING && flowState.email)
    );
    
    // Function to handle back button press
    const handleBack = () => {
      if (isFirstStep) {
        // First step - go back to home page
        router.push('/');
      } else if (currentStep === AUTH_STEP_PHONE_OTP_PENDING) {
        // Show confirmation toast with action via ToastAction wrapper
        const { dismiss } = toast({
          variant: "destructive",
          title: t('auth.confirmBackOtpTitle: Back to Phone Entry'),
          description: t('auth.confirmBackOtpDescription: Are you sure you entered the wrong phone ${flowState.phoneNumber}? '),
          action: (
            <ToastAction asChild altText={t('common.confirm')}>
              <Button size="default" variant="destructive-gradient" destructive={true} fullWidth onClick={() => {
                initiateFlow(flowType, {
                  countryCode: flowState.countryCode,
                  phoneNumber: flowState.phoneNumber
                });
                dismiss();
              }}>
                {t('common.confirm')}
              </Button>
            </ToastAction>
          ),
        });

      } else if (currentStep === AUTH_STEP_EMAIL_OTP_PENDING) {
        // Restart flow with expired OTP to go back to email entry
        const { dismiss } = toast({
          variant: "destructive",
          title: t('auth.confirmBackOtpTitle: Back to Email Entry'),
          description: t('auth.confirmBackOtpDescription: Are you sure you entered the wrong email ${flowState.email}? '),
          action: (
            <ToastAction asChild altText={t('common.confirm')}>
              <Button size="default" variant="destructive-gradient" destructive={true} fullWidth onClick={() => {
                initiateFlow(flowType, {
                  countryCode: flowState.countryCode,
                  phoneNumber: flowState.phoneNumber,
                  phoneValidated: true,
                  phoneOtpExpires: Date.now() - 1,
                  email: flowState.email,
                  emailVerified: false,
                  emailOtpExpires: Date.now() - 1
                });
                dismiss();
              }}>
                {t('common.confirm')}
              </Button>
            </ToastAction>
          ),
        });
      }
    };

    // Render only the active step content without headers or titles
    // since these are now handled by the parent AuthLayout
    const renderStepContent = () => {
      switch (currentStep) {
        case AUTH_STEP_PHONE_ENTRY: {
          return (
            <PhoneInput
              defaultCountryCode={flowState.countryCode ?? '1'}
              defaultPhoneNumber={flowState.phoneNumber ?? ''}
              onSubmit={(countryCode, phoneNumber, channel) =>
                advanceFlow({ countryCode, phoneNumber, channel })
              }
              error={error || undefined}
              isLoading={isLoading}
            />
          );
        }
        case AUTH_STEP_PHONE_OTP_PENDING: {
          const fullPhoneNumber = `${flowState.countryCode || ''}${flowState.phoneNumber || ''}`;
          return (
            <OtpVerification
              onVerify={(otp) => advanceFlow({ otp })}
              onResend={() => initiateFlow(flowType, {
                ...flowState,
                phoneOtpExpires: Date.now() - 1
              })}
              error={error || undefined}
              isLoading={isLoading}
              channelLabel={flowState.channel === OTP_CHANNEL.WHATSAPP ? 
                `${t('auth.whatsapp')} ${fullPhoneNumber}` : `${t('auth.telegram')} ${fullPhoneNumber}`}
              expiryTs={flowState.phoneOtpExpires}
            />
          );
        }
        case AUTH_STEP_EMAIL_ENTRY_PENDING: {
          return (
            <EmailInput
              onSubmit={(email) => advanceFlow({ email })}
              errorMessage={error || undefined}
              isLoading={isLoading}
            />
          );
        }
        case AUTH_STEP_EMAIL_OTP_PENDING: {
          return (
            <OtpVerification
                channelLabel={flowState.email || ''} // User's email
                onVerify={(otp) => advanceFlow({ emailCode: otp })}
                onResend={() => initiateFlow(flowType, {
                  ...flowState,
                  emailOtpExpires: Date.now() - 1
                })}
                expiryTs={flowState.emailOtpExpires} // OTP expiry time
                isLoading={isLoading}
                error={error} // Pass down error for display
              />
          );
        }
        case AUTH_STEP_USER_PROFILE_PENDING: {
          return (
            <ProfileStep
              onSubmit={({ firstName, lastName, address }) =>
                advanceFlow({ firstName, lastName, address })
              }
              error={error || undefined}
              isLoading={isLoading}
            />
          );
        }
        case AUTH_STEP_PIN_SETUP_PENDING: {
          return (
            <PinSetup
              onSubmit={() => advanceFlow({})}
              isLoading={isLoading}
              // error={error || undefined}
            />
          );
        }
        case AUTH_STEP_PIN_ENTRY_PENDING: {
          return (
            <PinPad
              welcome_message={t("pinPad.loggedOutWelcomeMessage")}
              onValidPin={() => advanceFlow({})}

              showBiometric={true}

              onAction={setPinForgotten}
              showAction={true}
              actionLabel={t("pinPad.forgotPinLink")}

              isLoading={isLoading}
              error={error}
            />
          );
        }
        case AUTH_STEP_TOKEN_ACQUISITION: {
          return (
            <div className="flex flex-col flex-1 items-center justify-center p-6">
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <Button onClick={() => advanceFlow({})}>
                {t('auth.retry')}
              </Button>
            </div>
          );
        }
        case AUTH_STEP_WALLET_CREATION_PENDING: {
          return (
            <div className="flex flex-col flex-1 items-center justify-center p-6 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">{t('auth.creatingWallet')}</h3>
                <p className="text-sm text-muted-foreground">{t('auth.creatingWalletSubtitle')}</p>
              </div>
              {error && (
                <div className="text-center space-y-4">
                  <p className="text-red-500 text-sm">{error}</p>
                  <Button onClick={() => advanceFlow({})} variant="outline">
                    {t('auth.retry')}
                  </Button>
                </div>
              )}
            </div>
          );
        }
        case AUTH_STEP_AUTHENTICATED: {
          return (
            <div className="flex flex-col flex-1 items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }
        default:
          return (
            <ActionPopup
              open={true}
              title={t('auth.unexpectedStepTitle')}
              description={t('auth.unexpectedStepSubtitle')}
              icon={<AlertTriangle className="w-16 h-16 text-amber-500" />}
              primaryActionText={t('auth.unexpectedStepRestart')}
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
