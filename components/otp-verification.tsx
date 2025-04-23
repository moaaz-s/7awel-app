"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PhoneNumber } from "@/components/ui/phone-number"
import { useLanguage } from "@/context/LanguageContext"

interface OtpVerificationProps {
  onVerified: () => void
  phoneNumber: string
}

export function OtpVerification({ onVerified, phoneNumber }: OtpVerificationProps) {
  const { t, isRTL } = useLanguage()
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [timeLeft, setTimeLeft] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime > 0 ? prevTime - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(0)
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Move to next input if current one is filled
    if (value) {
      const nextIndex = isRTL ? index - 1 : index + 1
      if (isRTL ? nextIndex >= 0 : nextIndex < 6) {
        inputRefs.current[nextIndex]?.focus()
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current is empty
    if (e.key === "Backspace" && !otp[index]) {
      const prevIndex = isRTL ? index + 1 : index - 1
      if (isRTL ? prevIndex < 6 : prevIndex >= 0) {
        inputRefs.current[prevIndex]?.focus()
      }
    }
    // Optional: Arrow key navigation
    if (e.key === "ArrowLeft") {
      const nextIndex = isRTL ? index + 1 : index - 1
      if (isRTL ? nextIndex < 6 : nextIndex >= 0) {
        inputRefs.current[nextIndex]?.focus()
      }
    }
    if (e.key === "ArrowRight") {
      const nextIndex = isRTL ? index - 1 : index + 1
      if (isRTL ? nextIndex >= 0 : nextIndex < 6) {
        inputRefs.current[nextIndex]?.focus()
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.every((digit) => digit)) {
      onVerified()
    }
  }

  const handleResend = () => {
    // Reset OTP fields
    setOtp(["", "", "", "", "", ""])
    // Reset timer
    setTimeLeft(60)
    // Focus first input
    inputRefs.current[isRTL ? 5 : 0]?.focus()
  }

  // Use a single render function for the inputs that handles RTL order
  const renderInputs = () => {
    const inputs = otp.map((digit, index) => (
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

    return  inputs
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
          disabled={!otp.every((digit) => digit)}
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
