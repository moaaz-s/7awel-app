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
  channelLabel?: string
  expiryTs?: number
  title?: string
  subtitle?: string
}

export function OtpVerification({ 
  onVerify, 
  onResend, 
  isLoading = false,
  error = null,
  resendInterval = 60,
  channelLabel,
  expiryTs,
  title,
  subtitle
}: OtpVerificationProps) {
  const { t } = useLanguage()
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""))
  const [activeIndex, setActiveIndex] = useState(0)
  const [countdown, setCountdown] = useState(resendInterval)
  const [canResend, setCanResend] = useState(false)
  const [expiryCountdown, setExpiryCountdown] = useState<number | null>(
    expiryTs ? Math.max(0, Math.floor((expiryTs - Date.now()) / 1000)) : null
  )
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
  
  // Handle OTP expiry countdown
  useEffect(() => {
    if (!expiryTs) return;
    if (expiryCountdown === null) return;
    if (expiryCountdown <= 0) {
      // Expired – clear inputs and disable further typing
      setOtp(Array(6).fill(""));
      return;
    }

    const timer = setTimeout(() => {
      setExpiryCountdown(prev => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [expiryCountdown, expiryTs])
  
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
      {/* Title and subtitle if provided */}
      {(title || subtitle) && (
        <div className="text-center mb-6 space-y-1">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      
      <div className="space-y-2">
        {/* OTP input grid */}
        <div className="flex justify-between items-center gap-1" dir="ltr">
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
                  disabled={expiryCountdown !== null && expiryCountdown <= 0}
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
          {channelLabel && (
            <p className="text-sm text-muted-foreground text-center">
              {expiryCountdown !== null && expiryCountdown > 0
                ? t('auth.otpCodeSent', { 
                    channel: channelLabel,
                    time: `${Math.floor(expiryCountdown / 60)
                      .toString()
                      .padStart(2, '0')}:${(expiryCountdown % 60)
                      .toString()
                      .padStart(2, '0')}`
                  })
                : t('auth.otpCodeExpired', { channel: channelLabel })
              }
            </p>
          )}
          
          {/* Show a standalone expiry countdown only if no channel label is provided */}
          {!channelLabel && expiryCountdown !== null && (
            <p className="text-xs text-muted-foreground text-center">
              {expiryCountdown > 0
                ? `${t('auth.codeExpiresIn')} ${Math.floor(expiryCountdown / 60)
                    .toString()
                    .padStart(2, '0')}:${(expiryCountdown % 60)
                    .toString()
                    .padStart(2, '0')}`
                : t('auth.codeExpired')}
            </p>
          )}
          
          {canResend? 
            (
              <Button
                type="button"
                variant="link"
                shadow={"none"}
                size={"sm"}
                disabled={!canResend || isLoading || !onResend}
                onClick={handleResend}
              >
                {t("common.resendCode")}
              </Button>
            )
            : (
              <Button 
                type="button" 
                variant="link" 
                size={"sm"} 
                disabled={true} 
                shadow={"none"}
                className="text-muted-foreground"
              >
                {t("common.resendCodeCountdown", { seconds: countdown + "" })}
              </Button>
            )
          }
        </div>
      </div>
    </div>
  )
}
