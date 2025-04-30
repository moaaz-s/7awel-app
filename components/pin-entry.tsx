"use client"

import { useState, useEffect } from "react"
import { useBiometrics } from "@/hooks/use-biometrics"
import { Button } from "@/components/ui/button"
import { KeypadButton } from "@/components/ui/keypad-button"
import { useLanguage } from "@/context/LanguageContext"
import { FingerprintIcon, BackspaceIcon, ArrowRightIcon } from "@/components/icons"

interface PinEntryProps {
  onComplete: (pin: string) => void
  showBiometric?: boolean
  showForgotPin?: boolean
  isLoading?: boolean
  error?: string | null
  onForgotPin?: () => void
  pinLength?: number
}

export function PinEntry({
  onComplete,
  showBiometric = true,
  showForgotPin = true,
  isLoading = false,
  error = null,
  onForgotPin,
  pinLength = 4,
}: PinEntryProps) {
  const { t, isRTL } = useLanguage()
  const { available: bioAvailable, authenticate } = useBiometrics()
  const [pin, setPin] = useState<string[]>([])
  const [isPinComplete, setIsPinComplete] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const showBiometricButton = showBiometric && bioAvailable && pin.length === 0
  
  // Handle key press animation
  const handleKeyPress = (key: string) => {
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 150); // Reset after animation time
  };
  
  const handleDigitClick = (digit: string) => {
    if (pin.length < pinLength) {
      handleKeyPress(digit);
      const newPin = [...pin, digit]
      setPin(newPin)
      
      // Check if pin is complete
      if (newPin.length === pinLength) {
        setIsPinComplete(true)
      }
    }
  }

  const handleDelete = () => {
    if (pin.length > 0) {
      handleKeyPress('delete');
      setPin(pin.slice(0, -1))
      setIsPinComplete(false)
    }
  }

  const handleSubmit = () => {
    if (pin.length === pinLength && !isLoading) {
      handleKeyPress('submit');
      onComplete(pin.join(''))
    }
  }

  const handleBiometricAuth = async () => {
    if (showBiometric && bioAvailable && !isLoading) {
      handleKeyPress('bio');
      const ok = await authenticate("Authenticate to unlock")
      if (ok) {
        onComplete("bio")
      }
    }
  }

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If loading, do nothing
      if (isLoading) return
      
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
        handleSubmit()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pin, isPinComplete, isLoading])

  // Render PIN dots in the correct order for RTL
  const renderPinDots = () => {
    const dots = Array.from({ length: pinLength }).map((_, i) => {
      const filled = i < pin.length
      return (
        <div 
          key={i} 
          className={`h-3 w-3 rounded-full transition-all duration-300 ${filled 
            ? "bg-primary scale-110" 
            : "border border-input"}`}
          aria-hidden="true"
        />
      )
    })
    return isRTL ? [...dots].reverse() : dots
  }

  return (
    // dir=ltr is intentional since the numbers are in english regardless of the language
    <div className="w-full" dir="ltr">
      {/* PIN display */}
      <div className="flex justify-center gap-3 mb-16" aria-live="polite" aria-atomic="true">
        {renderPinDots()}
        <span className="sr-only">
          {pin.length > 0 
            ? t("pinEntry.digitsEntered", { count: pin.length.toString(), total: pinLength.toString() }) 
            : t("pinEntry.enterDigits", { count: pinLength.toString() })}
        </span>
      </div>

      {error && <p className="text-center text-sm text-destructive mb-4" aria-live="assertive">{error}</p>}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-y-8 gap-x-12 mb-8" role="group" aria-label="PIN keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <div className="flex items-center justify-center" key={num}>
            <KeypadButton
              type="button"
              onClick={() => handleDigitClick(num.toString())}
              active={activeKey === num.toString()}
              aria-label={`Number ${num}`}
              haptic="light"
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
              icon={<BackspaceIcon absoluteStrokeWidth={false} strokeWidth={2} size={18} />}
            />
          ) : showBiometricButton ? (
            <KeypadButton
              type="button"
              onClick={handleBiometricAuth}
              active={activeKey === 'bio'}
              aria-label="Use biometric authentication"
              haptic="medium"
              icon={<FingerprintIcon absoluteStrokeWidth={false} strokeWidth={2} size={18} />}
            />
          ) : (
            <div className="w-12 h-12"></div> // Empty placeholder
          )}
        </div>
        
        <div className="flex items-center justify-center">
          <KeypadButton
            type="button"
            onClick={() => handleDigitClick("0")}
            active={activeKey === '0'}
            aria-label="Number 0"
            haptic="light"
            icon={<span>0</span>}
          />
        </div>
        
        {/* Submit button (only shows when pin is complete) */}
        <div className="flex items-center justify-center">
          {isPinComplete ? (
            <KeypadButton
              type="button"
              onClick={handleSubmit}
              action={true}
              active={activeKey === 'submit'}
              aria-label="Submit PIN"
              haptic="success"
              className="animate-fadeIn"
              icon={<ArrowRightIcon absoluteStrokeWidth={false} strokeWidth={2} size={18} />}
            />
          ) : (
            <div className="w-12 h-12"></div> // Empty placeholder
          )}
        </div>
      </div>

      {/* Forgot PIN link */}
      {showForgotPin && (
        <div className="text-center mt-6">
          <Button
            variant="link"
            className="text-primary focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onForgotPin}
            disabled={!onForgotPin || isLoading}
            aria-label="Forgot PIN"
          >
            {t("auth.forgotPin")}
          </Button>
        </div>
      )}
    </div>
  )
}
