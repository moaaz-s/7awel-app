import React, { useState, useCallback } from 'react';
import { PinPad } from '../pin-pad';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { spacing } from '../ui-config';
import { setPin } from '@/utils/pin-service';
import { info, error as logError } from '@/utils/logger';


interface PinSetupProps {
  onSubmit: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null; // Error from AuthContext after submission
  title?: string; // Optional override title
  subtitle?: string; // Optional override subtitle
}

const PinSetup: React.FC<PinSetupProps> = ({ 
  onSubmit, 
  onCancel,
  isLoading = false, 
  error: externalError, // Rename to avoid clash with localError
  title,
  subtitle
}) => {
  const [stage, setStage] = useState<'entry' | 'confirmation'>('entry');
  const [firstPin, setFirstPin] = useState<string>('');
  const [secondPin, setSecondPin] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleFirstPinSubmit = useCallback((pin: string) => {
    setFirstPin(pin);
    setStage('confirmation');
    setLocalError(null); // Clear any previous local error
  }, []);

  const handleSecondPinSubmit = useCallback((pin: string) => {
    info("[PinSetup] handleSecondPinSubmit");
    setSecondPin(pin);
    if (firstPin === pin) {
      setLocalError(null);
      setPin(pin).then(() => {
        onSubmit();
      }).catch((err) => {
        logError("[PinSetup] Error setting pin", err);
      }).finally(() => {
        setLocalError(t('errors.PIN_SETUP_FAILED'));
      });
    } else {
      setLocalError(t('pinPad.errorMismatch'));
      // Reset second pin input? PinPad might need a reset prop or clear method
      // For now, just show error. User needs to re-enter second pin.
      setSecondPin(''); // Clear the state for second pin
    }
  }, [firstPin, onSubmit]);

  const getSubtitle = () => {
    if (subtitle) return subtitle;
    return stage === 'entry'
      ? t('pinPad.setupSubtitleEntry', { pinLength: '4' })
      : t('pinPad.setupSubtitleConfirm');
  };

  const currentError = externalError || localError;
  const currentTitle = title ?? (stage === 'entry' ? t('pinPad.setupTitleEntry') : t('pinPad.setupTitleConfirm'));

  return (
    <div className="flex-1 flex flex-col items-center justify-between w-full max-w-xs mx-auto">
      <h1 className="text-2xl font-bold mt-8 mb-2 text-center">{currentTitle}</h1>
      {/* <p className="text-muted-foreground mb-8 text-center">{getSubtitle()}</p> */}

      {stage === 'entry' && (
        <PinPad 
          key="pin-entry-1" // Key helps reset internal state

          alwaysValid={true}
          onValidPin={handleFirstPinSubmit} // Use onValidPin
          showBiometric={false} // Don't show biometric during setup

          isLoading={isLoading} 
          error={currentError} // Display error if any
        />
      )}

      {stage === 'confirmation' && (
        <div className={`flex flex-col items-center ${spacing.stack_sm}`}>
          <PinPad 
            key="pin-entry-2" // Different key for confirmation stage

            alwaysValid={true}
            onValidPin={handleSecondPinSubmit} // Use onValidPin
            
            showBiometric={false}

            showAction={true}
            actionLabel={t('pinPad.setupModifyPinBtn')}
            onAction={() => {
              setStage('entry');
              setFirstPin('');
              setLocalError(null);
            }}

            isLoading={isLoading} 
            error={currentError} // Display error if any
            // Consider adding a prop to PinPad clear its value if needed on error
          />
        </div>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <Button 
          variant="outline"
          onClick={onCancel} 
          disabled={isLoading}
          className="mt-6 w-full"
        >
          {t('pinPad.cancelButton')}
        </Button>
      )}
    </div>
  );
};

export default PinSetup;
