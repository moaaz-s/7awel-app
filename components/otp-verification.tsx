"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { Input } from "./ui/input"

interface OtpVerificationProps {
  onVerify: (otp: string) => void
  onResend?: () => void
  isLoading?: boolean
  error?: string | null
  resendInterval?: number
}

export function OtpVerification({ 
  onVerify, 
  onResend, 
  isLoading = false,
  error = null,
  resendInterval = 60 
}: OtpVerificationProps) {
  const { t } = useLanguage()
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""))
  const [activeIndex, setActiveIndex] = useState(0)
  const [countdown, setCountdown] = useState(resendInterval)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Handle countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])
  
  // Auto-focus the first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target
    
    // Only allow numeric input
    if (value && !/^\d+$/.test(value)) return
    
    // Update OTP array with the new value
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Take only the last character
    setOtp(newOtp)
    
    // If we entered a value and there's a next input, focus it
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
      setActiveIndex(index + 1)
    }
    
    // Check if all inputs are filled
    if (newOtp.every(v => v) && newOtp.join("").length === 6) {
      handleSubmit(newOtp.join(""))
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // If we press backspace and the current input is empty, focus the previous input
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setActiveIndex(index - 1)
    }
  }
  
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text/plain").trim()
    
    // If pasted data is all digits and right length, fill inputs
    if (/^\d+$/.test(pastedData) && pastedData.length <= 6) {
      const newOtp = [...otp]
      
      for (let i = 0; i < pastedData.length; i++) {
        if (i < 6) {
          newOtp[i] = pastedData[i]
        }
      }
      
      setOtp(newOtp)
      
      // Focus the next empty input or last input
      const nextEmptyIndex = newOtp.findIndex(v => !v)
      const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex
      inputRefs.current[focusIndex]?.focus()
      setActiveIndex(focusIndex)
      
      // If all filled, submit
      if (newOtp.every(v => v) && newOtp.join("").length === 6) {
        handleSubmit(newOtp.join(""))
      }
    }
  }
  
  const handleSubmit = (otpValue: string) => {
    if (otpValue.length === 6) {
      onVerify(otpValue)
    }
  }
  
  const handleResend = () => {
    if (canResend && onResend) {
      onResend()
      setCountdown(resendInterval)
      setCanResend(false)
    }
  }

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        {/* OTP input grid */}
        <div className="flex justify-between items-center gap-1">
          {otp.map((value, index) => {
            return (
              <React.Fragment key={index}>
                <Input
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={e => handleChange(e, index)}
                  onKeyDown={e => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  className="w-10 h-11 px-2 text-center text-xl"
                  autoComplete="off"
                  autoFocus={index === 0}
                />
                {index > 0 && index % 2 === 0 && otp.length > 5 && index === otp.length/2 - 1 && (
                  <span key={`separator-${index}`} className="text-xl mx-1">•</span>
                )}
              </React.Fragment>
            )
          })}
        </div>
        
        {/* Error message */}
        {error && (
          <p className="text-sm w-full text-center text-destructive">{error}</p>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Verify button */}
        {/* <Button
          type="button"
          className="w-full"
          disabled={otp.join("").length !== 6 || isLoading}
          onClick={() => handleSubmit(otp.join(""))}
        >
          {isLoading ? t("common.loading") : t("common.continue")}
        </Button> */}
        
        {/* Resend button */} 
        <div className="w-full space-y-4 text-center">
          {canResend? 
            (
              <Button
                type="button"
                variant="link"
                size={"sm"}
                disabled={!canResend || isLoading || !onResend}
                onClick={handleResend}
              >
                {t("common.resendCode")}
              </Button>
            )
            : <Button type="button" variant="link" size={"sm"} disabled={true} className="text-muted-foreground">
                {t("common.resendCodeCountdown", { seconds: countdown + "" })}
              </Button>
          }
        </div>
      </div>
    </div>
  )
}
