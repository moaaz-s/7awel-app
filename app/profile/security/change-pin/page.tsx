"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProfileLayout } from '@/components/layouts/ProfileLayout';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { PinEntry } from '@/components/pin-entry';

export default function ChangePinScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { checkPin, setPin } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [tempNewPin, setTempNewPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCurrentPinComplete = async (pin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const isValid = await checkPin(pin);
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
    <ProfileLayout 
      title={getTitle()} 
      backHref={step === 0 ? "/profile/security" : undefined}
      backAction={step > 0 ? () => setStep(prev => (prev - 1) as 0 | 1 | 2) : undefined}
    >
      <div className="flex flex-col items-center justify-center mt-4">
        <p className="text-lg text-center mb-12">{getPrompt()}</p>

        <PinEntry
          onComplete={handleComplete}
          key={step}
          showBiometric={false}
          showForgotPin={false}
          error={error}
          isLoading={isLoading}
        />
      </div>
    </ProfileLayout>
  );
}
