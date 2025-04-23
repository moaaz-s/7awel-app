"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ProfileLayout } from '@/components/layouts/ProfileLayout';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { PinEntry } from '@/components/pin-entry';
import { Loader2 } from 'lucide-react';

export default function ChangePinScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { validatePin, setPin } = useAuth();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [tempNewPin, setTempNewPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCurrentPinComplete = async (pin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const isValid = await validatePin(pin);
      if (isValid) {
        setStep(1);
      } else {
        setError(t('changePin.errorIncorrectCurrent'));
        toast.error(t('changePin.errorIncorrectCurrent'));
      }
    } catch (err) {
      console.error("PIN validation error:", err);
      setError(t('changePin.errorGeneric'));
      toast.error(t('changePin.errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPinComplete = (pin: string) => {
    setTempNewPin(pin);
    setStep(2);
    setError(null);
  };

  const handleConfirmPinComplete = async (pin: string) => {
    if (pin !== tempNewPin) {
      setError(t('changePin.errorMismatch'));
      toast.error(t('changePin.errorMismatch'));
      setStep(1);
      setTempNewPin(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await setPin(pin);
      toast.success(t('changePin.success'));
      router.back();
    } catch (err) {
      console.error("Failed to set new PIN:", err);
      setError(t('changePin.errorGeneric'));
      toast.error(t('changePin.errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    return t('changePin.title');
  };

  const getPrompt = () => {
    if (step === 0) return t('changePin.enterCurrentPinPrompt');
    if (step === 1) return t('changePin.enterNewPinPrompt');
    return t('changePin.confirmNewPinPrompt');
  }

  const handleComplete = (pin: string) => {
    if (isLoading) return;
    if (step === 0) {
      handleCurrentPinComplete(pin);
    } else if (step === 1) {
      handleNewPinComplete(pin);
    } else {
      handleConfirmPinComplete(pin);
    }
  };

  return (
    <ProfileLayout title={getTitle()} backHref={step === 0 ? "/profile/security" : undefined}
    // Optional: Implement back action to go to previous step if desired
    // backAction={step > 0 ? () => setStep(prev => (prev - 1) as 0 | 1 | 2) : undefined}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground text-center">{getPrompt()}</p>

        <div className="flex items-center justify-center">
          {/* Use key to force re-render and clear internal state on step change */}
          <PinEntry
            onComplete={handleComplete}
            key={step}
            showBiometric={false}
            showForgotPin={false} // Hide Forgot PIN in Change PIN flow
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('common.loading')}...
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center mt-2">{error}</p>
        )}
      </div>
    </ProfileLayout>
  );
}
