"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

export default function PinEntryScreen() {
  const { validatePin, isLoading } = useAuth();
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (pin.length !== 4) { // Example: Enforce PIN length
      setError(t('pinEntry.errorLength')); // Need to add this key
      return;
    }

    const isValid = await validatePin(pin);

    if (!isValid) {
      setError(t('pinEntry.errorInvalid')); // Need to add this key
      toast.error(t('pinEntry.errorInvalid'));
      setPin(''); // Clear input on invalid PIN
    }
    // On valid PIN, the AuthContext state changes and AppInitializer redirects
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-blue-100 p-6">
      <div className="w-full max-w-xs space-y-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t('pinEntry.title')}</h1> 
          <p className="text-muted-foreground">{t('pinEntry.description')}</p>
        </div>
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <Input
            type="password" // Use password type to obscure input
            placeholder={t('pinEntry.placeholder')}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} // Allow only digits, max 4
            maxLength={4}
            inputMode="numeric"
            className="text-center text-2xl tracking-[0.5em]"
            aria-label={t('pinEntry.title')}
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading || pin.length !== 4} variant="gradient">
            {isLoading ? t('common.loading') : t('pinEntry.submit')}
          </Button>
        </form>
         {/* TODO: Add 'Forgot PIN?' and 'Use Biometrics' options later */}
      </div>
    </div>
  );
}
