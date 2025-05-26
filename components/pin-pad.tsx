"use client"

import { useState, useEffect } from "react"
import { useBiometrics } from "@/hooks/use-biometrics"
import { Button } from "@/components/ui/button"
import { KeypadButton } from "@/components/ui/keypad-button"
import { useLanguage } from "@/context/LanguageContext"
import { FingerprintIcon, BackspaceIcon, ArrowRightIcon } from "@/components/icons"
import { isLocked, getLockUntil, validatePin, clearLockout } from '@/utils/pin-service';
import { useData } from "@/context/DataContext"
import { Avatar } from "./ui/avatar"

interface PinPadProps {
  welcome_message?: string
  onValidPin: (pin: string) => void
  showBiometric?: boolean
  showForgotPin?: boolean
  isLoading?: boolean
  error?: string | null
  onForgotPin?: () => void
  pinLength?: number
  alwaysValid?: boolean // For PIN setup / we don't want to check for validity
}

export function PinPad({
  welcome_message,
  onValidPin,
  showBiometric = true,
  showForgotPin = true,
  isLoading = false,
  error = null,
  onForgotPin,
  pinLength = 4,
  // Useful for PIN setting.
  alwaysValid = false
}: PinPadProps) {
  const { t, isRTL } = useLanguage()
  const { available: bioAvailable, authenticate } = useBiometrics()
  const [pin, setPin] = useState<string[]>([])
  const [isPinComplete, setIsPinComplete] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [bioFailed, setBioFailed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [shake, setShake] = useState(false)
  const [locked, setLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const { user } = useData();

  // Format milliseconds to mm:ss
  function formatRemaining(ms: number) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const showBiometricButton = showBiometric && bioAvailable && pin.length === 0

  // Prevent interactions when locked
  useEffect(() => {
    if (locked) {
      setPin([])
      setIsPinComplete(false)
    }
  }, [locked])

  // On mount, check lock state once
  useEffect(() => {
    const checkLockState = async () => {
      const isLockedNow = await isLocked();
      const until = await getLockUntil();
      setLocked(isLockedNow);
      setLockUntil(until);
      setRemaining(until !== null ? until - Date.now() : null);
      if (!isLockedNow) {
        await clearLockout();
      }
    };
    checkLockState();
  }, []);

  // Update countdown every second when locked
  useEffect(() => {
    if (!locked || lockUntil === null) return;
    const intervalId = setInterval(() => {
      const diff = lockUntil - Date.now();
      if (diff <= 0) {
        clearInterval(intervalId);
        clearLockout().then(() => {
          setLocked(false);
          setLockUntil(null);
          setRemaining(null);
        });
      } else {
        setRemaining(diff);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [locked, lockUntil]);

  // Handle key press animation
  const handleKeyPress = (key: string) => {
    if (locked) return;
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 150); // Reset after animation time
  };

  const handleDigitClick = (digit: string) => {
    if (locked || pin.length >= pinLength) return;
    handleKeyPress(digit);
    const newPin = [...pin, digit]
    setPin(newPin)
    
    // Check if pin is complete
    if (newPin.length === pinLength) {
      setIsPinComplete(true)
      // auto-submit when full
      if (!locked && !isLoading) {
        handleKeyPress('submit');
        setSubmitted(true);
        handleSubmit(newPin.join(''));
      }
    }
  }

  const handleSubmit = async (inputPin: string) => {
    if (!locked && inputPin.length === pinLength && !isLoading) {
      handleKeyPress('submit');
      setSubmitted(true);
      if (alwaysValid) {
        onValidPin(inputPin);
      } else {
        const result = await validatePin(inputPin);
        if (result.valid) {
          onValidPin(inputPin);
        } else if (result.locked) {
          setLocked(true);
          const until = result.lockUntil ?? null;
          setLockUntil(until);
          setRemaining(until !== null ? until - Date.now() : null);
        } else {
          // Clear entered PIN after an invalid attempt
          setPin([]);
          setIsPinComplete(false);
          setShake(true);
          setTimeout(() => setShake(false), 400);
        }
      }
    }
  }

  const handleDelete = () => {
    if (locked) return;
    if (pin.length > 0) {
      handleKeyPress('delete');
      setPin(pin.slice(0, -1))
      setIsPinComplete(false)
    }
  }

  const handleBiometricAuth = async () => {
    if (!locked && showBiometric && bioAvailable && !isLoading) {
      handleKeyPress('bio');
      const ok = await authenticate("Authenticate to unlock")
      if (ok) {
        onValidPin("bio")
      } else {
        setBioFailed(true)
      }
    }
  }

  // Auto-run biometric prompt once on mount if allowed
  useEffect(() => {
    if (showBiometricButton && !bioFailed) {
      handleBiometricAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBiometricButton, bioFailed])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If loading or locked, do nothing
      if (isLoading || locked) return
      
      // Handle number keys
      if (/^[0-9]$/.test(e.key)) {
        handleDigitClick(e.key)
      }
      
      // Handle backspace/delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete()
      }
      
      // Handle Enter key for submission when PIN is complete
      if (e.key === 'Enter' && isPinComplete) {
        handleSubmit(pin.join(''))
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pin, isPinComplete, isLoading, locked])

  // Clear dots & shake on each invalid submit
  useEffect(() => {
    let timer: number;
    if (submitted && error) {
      setPin([]);
      setIsPinComplete(false);
      setShake(true);
      timer = window.setTimeout(() => setShake(false), 400);
      setSubmitted(false);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [submitted, error]);

  // Render PIN dots in the correct order for RTL
  const renderPinDots = () => {
    const dots = Array.from({ length: pinLength }).map((_, i) => {
      const filled = i < pin.length
      return (
        <div 
          key={i} 
          className={`h-4 w-4 rounded-full transition-all duration-300 ${filled 
            ? "bg-primary scale-110" 
            : "bg-input"}`}
          aria-hidden="true"
        />
      )
    })
    return dots
  }

  return (
    // dir=ltr is intentional since the numbers are in english regardless of the language
    <div className="flex-1 flex flex-col items-center justify-between w-full max-w-md mx-auto min-h-[50vh]" dir="ltr">
      {welcome_message && user && (
        <div className="flex flex-col items-center space-y-4 mt-8 p-8 w-full" dir={isRTL ? "rtl" : "ltr"}>
          <Avatar 
            size="lg" 
            border 
            initials={`${user.firstName?.charAt(0).toUpperCase() || ''}${user.lastName?.charAt(0).toUpperCase() || ''}`}
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {welcome_message}{", "}
              {`${user.firstName} ${user.lastName}`.trim().toUpperCase()}
            </h1>
          </div>
        </div>
      )}
      
      {locked && (
        <p className="text-center text-sm text-destructive mb-6" aria-live="assertive">
          {t('pinPad.lockedUntil', { time: formatRemaining(remaining ?? 0) })}
        </p>
      )}
      {!locked && error && <p className="text-center text-sm text-destructive mb-6" aria-live="assertive">{error}</p>}
      {!locked && (!showBiometricButton || bioFailed) && (
        <>
          <div className={`flex justify-center gap-5 py-12 ${shake ? 'animate-pin-bins-shake' : ''}`} aria-live="polite" aria-atomic="true">
            {renderPinDots()}
            <span className="sr-only">
              {pin.length > 0 
                ? t('pinPad.digitsEntered', { count: pin.length.toString(), total: pinLength.toString() }) 
                : t('pinPad.enterDigits', { count: pinLength.toString() })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-y-8 gap-x-8 mb-8" role="group" aria-label="PIN keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <div className="flex items-center justify-center" key={num}>
                <KeypadButton
                  type="button"
                  onClick={() => handleDigitClick(num.toString())}
                  active={activeKey === num.toString()}
                  aria-label={`Number ${num}`}
                  haptic="light"
                  className="text-2xl font-light"
                  icon={<span>{num}</span>}
                />
              </div>
            ))}
            
            {/* Back button or biometric (only shows one at a time) */}
            <div className="flex items-center justify-center">
              {pin.length > 0 ? (
                <KeypadButton
                  type="button"
                  onClick={handleDelete}
                  active={activeKey === 'delete'}
                  aria-label="Delete last digit"
                  haptic="medium"
                  icon={<BackspaceIcon absoluteStrokeWidth={false} strokeWidth={2} size={20} />}
                />
              ) : showBiometricButton ? (
                <KeypadButton
                  type="button"
                  onClick={handleBiometricAuth}
                  active={activeKey === 'bio'}
                  aria-label="Use biometric authentication"
                  haptic="medium"
                  icon={<FingerprintIcon absoluteStrokeWidth={false} strokeWidth={2} size={20} />}
                />
              ) : (
                <div className="w-16 h-16"></div> // Empty placeholder
              )}
            </div>
            
            <div className="flex items-center justify-center">
              <KeypadButton
                type="button"
                onClick={() => handleDigitClick("0")}
                active={activeKey === '0'}
                aria-label="Number 0"
                haptic="light"
                className="text-2xl font-light"
                icon={<span>0</span>}
              />
            </div>
            
            {/* Submit button (only shows when pin is complete) */}
            <div className="flex items-center justify-center">
              {isPinComplete ? (
                <KeypadButton
                  type="button"
                  onClick={() => handleSubmit(pin.join(''))}
                  disabled={!isPinComplete || isLoading}
                  aria-label="Submit PIN"
                  haptic="heavy"
                  action={true}
                  className="bg-primary hover:bg-primary/90"
                  icon={<ArrowRightIcon absoluteStrokeWidth={false} strokeWidth={2} size={20} className="text-white" />}
                />
              ) : (
                <div className="w-16 h-16"></div> // Empty placeholder
              )}
            </div>
          </div>

          {/* Forgot PIN Button - Show only if enabled and biometric didn't handle it */}
          {showForgotPin && onForgotPin && (
            <Button 
              variant="link"
              className="mt-6 text-sm mx-auto block text-primary font-medium"
              onClick={onForgotPin}
              disabled={isLoading}
              shadow={"none"}
            >
              {t('pinPad.forgotPinLink')}
            </Button>
          )}

        </>
      )}
    </div>
  )
}
