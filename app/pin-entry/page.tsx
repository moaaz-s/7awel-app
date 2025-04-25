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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-blue-100 p-6">
      <div className="w-full max-w-xs space-y-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('pinEntry.title')}</h1> 
          <p className="text-muted-foreground">{t('pinEntry.description')}</p>
        </div>

        <div className="flex justify-center">
          <PinEntry onComplete={handleComplete} key={entryKey} />
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        {isLoading && (
          <p className="text-center text-muted-foreground">{t('common.loading')}...</p>
        )}
      </div>
    </div>
  );
}
