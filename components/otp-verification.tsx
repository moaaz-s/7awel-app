"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { PhoneNumber } from "@/components/ui/phone-number"
import { useLanguage } from "@/context/LanguageContext"
import { useCodeInput } from "@/hooks/use-code-input"

interface OtpVerificationProps {
  onVerified: () => void
  phoneNumber: string
}

export function OtpVerification({ onVerified, phoneNumber }: OtpVerificationProps) {
  const { t, isRTL } = useLanguage()
  const [timeLeft, setTimeLeft] = useState(60)
  const { digits, setDigit, handleKeyDown, inputRefs, reset, isComplete, code } = useCodeInput({ length: 6, rtl: isRTL })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime: number) => (prevTime > 0 ? prevTime - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleChange = setDigit

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isComplete) {
      onVerified()
    }
  }

  const handleResend = () => {
    // Reset OTP fields
    reset()
    // Reset timer
    setTimeLeft(60)
    // Focus first input
    inputRefs.current[isRTL ? 5 : 0]?.focus()
  }

  // Use a single render function for the inputs that handles RTL order
  const renderInputs = () => {
    const inputs = digits.map((digit: string, index: number) => (
      <input
        key={index}
        ref={(el) => (inputRefs.current[index] = el)}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={1}
        value={digit}
        onChange={(e) => handleChange(index, e.target.value)}
        onKeyDown={(e) => handleKeyDown(index, e)}
        className="h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-medium shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        required
        dir="ltr"
        style={{ direction: "ltr" }}
        autoComplete="one-time-code"
      />
    ))

    return inputs
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          {t("auth.weWillSend")} <PhoneNumber value={phoneNumber} />
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2">{renderInputs()}</div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-violet-600 to-blue-600 py-6"
          disabled={!isComplete}
        >
          {t("common.continue")}
        </Button>
      </form>

      <div className="text-center">
        {timeLeft > 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.resendCode", { seconds: timeLeft.toString() })}</p>
        ) : (
          <Button variant="link" onClick={handleResend} className="text-violet-600">
            {t("common.resendCode", { seconds: "0" })}
          </Button>
        )}
      </div>
    </div>
  )
}
