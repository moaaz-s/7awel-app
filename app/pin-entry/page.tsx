"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { PinEntry } from '@/components/pin-entry';

export default function PinEntryScreen() {
  const { validatePin, isLoading } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = React.useState<string | null>(null);
  const [entryKey, setEntryKey] = React.useState(0);

  const handleComplete = async (pin: string) => {
    setError(null);
    const isValid = await validatePin(pin);
    if (!isValid) {
      setError(t('pinEntry.errorInvalid'));
      toast.error(t('pinEntry.errorInvalid'));
      // Reset the PinEntry by changing its key
      setEntryKey(prev => prev + 1);
    }
    // On valid PIN, validatePin will update auth state and AppInitializer will redirect automatically.
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-xs mx-auto pt-8">
        <h1 className="text-2xl font-bold text-center mb-12">{t('pinEntry.title')}</h1>

        <PinEntry 
          onComplete={handleComplete} 
          key={entryKey}
          error={error}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
