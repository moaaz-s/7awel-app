"use client"

import { useState } from "react"
import { useBiometrics } from "@/hooks/use-biometrics"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { FingerprintIcon } from "@/components/icons"

interface PinEntryProps {
  onComplete: (pin: string) => void
  showBiometric?: boolean
  showForgotPin?: boolean
  onForgotPin?: () => void
}

export function PinEntry({
  onComplete,
  showBiometric = true,
  showForgotPin = true,
  onForgotPin,
}: PinEntryProps) {
  const { t, isRTL } = useLanguage()
  const { available: bioAvailable, authenticate } = useBiometrics()
  const [pin, setPin] = useState<string[]>([])
  const [error, setError] = useState("")

  const sharedBtnClasses = "flex h-16 w-full min-w-16 items-center justify-center rounded-full border font-medium hover:bg-gray-50"
  
  const handleDigitClick = (digit: string) => {
    if (pin.length < 4) {
      const newPin = [...pin, digit]
      setPin(newPin)

      // Simulate PIN verification when 4 digits are entered
      if (newPin.length === 4) {
        // For demo purposes, any 4-digit PIN works
        setTimeout(() => {
          onComplete(newPin.join(''))
        }, 500)
      }
    }
  }

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1))
      setError("")
    }
  }

  // Render PIN dots in the correct order for RTL
  const renderPinDots = () => {
    const dots = Array.from({ length: 4 }).map((_, i) => {
      const filled = i < pin.length
      return <div key={i} className={`h-4 w-4 rounded-full ${filled ? "bg-violet-600" : "border border-gray-300"}`} />
    })
    return isRTL ? [...dots].reverse() : dots
  }

  return (
    // dir=ltr is intentionql since the numbers are in english regardless of the language
    <div className="space-y-6 w-full" dir="ltr">
      {/* 
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-medium">{t("auth.enterPin")}</h2>
      </div> 
      */}

      {/* PIN display */}
      <div className="flex justify-center gap-3">{renderPinDots()}</div>

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigitClick(num.toString())}
            className={`${sharedBtnClasses} text-xl`}
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          className={`${sharedBtnClasses} text-sm opacity-0`}
          disabled
        >
          {/* Empty button for layout */}
        </button>
        <button
          type="button"
          onClick={() => handleDigitClick("0")}
          className={`${sharedBtnClasses} text-xl`}
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={`${sharedBtnClasses} text-sm`}
        >
          {t("common.delete")}
        </button>
      </div>

      {/* Biometric option */}
      {showBiometric && bioAvailable && (
        <div className="text-center">
          <Button
            variant="outline"
            className="gap-2"
            onClick={async () => {
              const ok = await authenticate("Authenticate to unlock")
              if (ok) {
                onComplete("bio")
              }
            }}
          >
            <FingerprintIcon className="h-5 w-5" />
            <span>{t("auth.useFingerprint")}</span>
          </Button>
        </div>
      )}

      {/* Forgot PIN link */}
      {showForgotPin && (
        <div className="text-center">
          <Button
            variant="link"
            className="text-violet-600"
            onClick={onForgotPin} // Add onClick handler
            disabled={!onForgotPin} // Disable if no handler provided
          >
            {t("auth.forgotPin")}
          </Button>
        </div>
      )}
    </div>
  )
}
