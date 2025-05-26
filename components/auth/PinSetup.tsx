import React, { useState, useCallback } from 'react';
import { PinPad } from '../pin-pad';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { spacing } from '../ui-config';

interface PinSetupProps {
  onSubmit: (pin: string) => void;
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
    setSecondPin(pin);
    if (firstPin === pin) {
      setLocalError(null);
      onSubmit(pin); // Pins match, submit!
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
      <h1 className="text-2xl font-bold mb-2 text-center">{currentTitle}</h1>
      {/* <p className="text-muted-foreground mb-8 text-center">{getSubtitle()}</p> */}

      {stage === 'entry' && (
        <PinPad 
          alwaysValid={true}
          key="pin-entry-1" // Key helps reset internal state
          onValidPin={handleFirstPinSubmit} // Use onValidPin
          isLoading={isLoading} 
          error={currentError} // Display error if any
          showBiometric={false} // Don't show biometric during setup
          showForgotPin={false} // Don't show forgot PIN during setup
        />
      )}

      {stage === 'confirmation' && (
        <div className={`flex flex-col items-center ${spacing.stack_sm}`}>
          <PinPad 
            alwaysValid={true}
            key="pin-entry-2" // Different key for confirmation stage
            onValidPin={handleSecondPinSubmit} // Use onValidPin
            isLoading={isLoading} 
            error={currentError} // Display error if any
            showBiometric={false}
            showForgotPin={false}
            // Consider adding a prop to PinPad clear its value if needed on error
          />

          {/* Back Button for confirmation stage */}
          <Button 
            variant="link"
            onClick={() => {
              setStage('entry');
              setFirstPin('');
              setLocalError(null);
            }} 
            disabled={isLoading}
            fullWidth
            withoutShadow
          >
            {t('pinPad.setupModifyPinBtn')}
          </Button>
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
