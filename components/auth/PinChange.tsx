"use client"

import React, { useState } from 'react';
import { useAuth } from '@/context/auth/AuthContext';
import { PinPad } from '@/components/pin-pad';
import PinSetup from '@/components/auth/PinSetup';
import { useLanguage } from '@/context/LanguageContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

type PinChangeStep = 'VERIFYING_CURRENT' | 'SETTING_NEW';

interface PinChangeProps {
    onSuccess?: () => void; // Optional callback for success
    onCancel?: () => void;  // Optional callback for cancellation
}

export function PinChange({ onSuccess, onCancel }: PinChangeProps) {
    const { t } = useLanguage();
    const { isLoading: authLoading, error: authError } = useAuth();
    const [step, setStep] = useState<PinChangeStep>('VERIFYING_CURRENT');
    const [localError, setLocalError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSetting, setIsSetting] = useState(false);

    const handleCurrentPinComplete = async (currentPin: string) => {
        setStep('SETTING_NEW');
    };

    const handleNewPinSubmit = async () => {
        setLocalError(null);
        setIsSetting(true);
        try {
            if (!authError) { // Check if context has an error after setting
                onSuccess?.(); // Call success callback if provided
            } else {
                 setLocalError(authError); // Display context error
            }
        } catch (err) {
            console.error("Error setting new PIN:", err);
             setLocalError(authError || t('errors.PIN_UNEXPECTED_ISSUE'));
        } finally {
            setIsSetting(false);
        }
    };

    const effectiveIsLoading = authLoading || isVerifying || isSetting;
    const effectiveError = localError || authError;

    return (
        <div className="w-full max-w-sm mx-auto">
            {effectiveError && (
                 <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('common.error')}</AlertTitle>
                    <AlertDescription>{effectiveError}</AlertDescription>
                </Alert>
            )}

            {step === 'VERIFYING_CURRENT' && (
                <div>
                    <h3 className="text-lg font-medium mb-4 text-center">{t('pinPad.updateTitleCurrent')}</h3>
                    <PinPad
                        onValidPin={handleCurrentPinComplete}
                        isLoading={effectiveIsLoading}
                        showBiometric={false} // Biometrics not suitable for verification
                        // Error is displayed above, so no need to pass here explicitly
                    />
                </div>
            )}

            {step === 'SETTING_NEW' && (
                <div>
                    <h3 className="text-lg font-medium mb-4 text-center">{t('pinPad.setupTitleEntry')}</h3>
                     <PinSetup
                        onSubmit={handleNewPinSubmit}
                        isLoading={effectiveIsLoading}
                        // Error is displayed above
                        // onCancel could be implemented to go back to VERIFYING_CURRENT
                     />
                     <Button 
                        variant="outline"
                        onClick={() => setStep('VERIFYING_CURRENT')}
                        disabled={effectiveIsLoading}
                        className="mt-4 w-full"
                     >
                        {t('common.back')}
                     </Button>
                </div>
            )}
            
            {onCancel && (
                 <Button 
                    variant="ghost"
                    onClick={onCancel}
                    disabled={effectiveIsLoading}
                    className="mt-6 w-full text-muted-foreground"
                 >
                    {t('pinPad.cancelButton')}
                 </Button>
            )}
        </div>
    );
}
