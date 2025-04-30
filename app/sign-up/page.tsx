"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { PhoneInput } from "@/components/phone-input"
import { OtpVerification } from "@/components/otp-verification"
import { UserProfileForm } from "@/components/user-profile-form"
import { AuthLayout } from "@/components/layouts/AuthLayout"

type SignUpStep = 'PHONE' | 'OTP' | 'PROFILE'

export default function SignUp() {
  const router = useRouter()
  const { t } = useLanguage()
  const { signup, verifyOtp, isLoading } = useAuth()
  
  const [step, setStep] = useState<SignUpStep>('PHONE')
  const [phoneNumber, setPhoneNumber] = useState("")
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)
  
  // Handle form submissions based on step
  const handlePhoneSubmit = async (phoneNumber: string) => {
    setPhoneNumberError(null)
    setPhoneNumber(phoneNumber)
    
    try {
      // In a real app, this would call an API to send OTP
      const response = await signup(phoneNumber)
      
      if (response.success) {
        setStep('OTP')
      } else {
        setPhoneNumberError(response.error || t("errors.unknownError"))
      }
    } catch (error) {
      console.error("Error during phone submission:", error)
      setPhoneNumberError(t("errors.networkError"))
    }
  }
  
  const handleOtpVerify = async (otp: string) => {
    setOtpError(null)
    
    try {
      // In a real app, this would call an API to verify OTP
      const response = await verifyOtp(phoneNumber, otp)
      
      if (response.success) {
        setStep('PROFILE')
      } else {
        setOtpError(response.error || t("errors.invalidOtp"))
      }
    } catch (error) {
      console.error("Error during OTP verification:", error)
      setOtpError(t("errors.NETWORK_ERROR"))
    }
  }
  
  const handleOtpResend = async () => {
    setPhoneNumberError(null)
    
    try {
      // In a real app, this would resend OTP
      await signup(phoneNumber)
    } catch (error) {
      console.error("Error resending OTP:", error)
    }
  }
  
  const handleProfileSubmit = async (formData: { firstName: string; lastName: string; email: string }) => {
    // In a real app, this would save profile info
    try {
      // Simulate API call
      console.log("Saving profile:", formData);
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Navigate to wallet or dashboard
      router.push("/wallet")
    } catch (error) {
      console.error("Error submitting profile:", error)
    }
  }
  
  // Render content based on current step
  const renderStepContent = () => {
    switch (step) {
      case 'PHONE':
        return (
          <PhoneInput 
            onSubmit={handlePhoneSubmit}
            isLoading={isLoading}
            error={phoneNumberError}
          />
        )
        
      case 'OTP':
        return (
          <OtpVerification
            onVerify={handleOtpVerify}
            onResend={handleOtpResend}
            isLoading={isLoading}
            error={otpError}
          />
        )
        
      case 'PROFILE':
        return (
          <UserProfileForm
            onSubmit={handleProfileSubmit}
            isLoading={isLoading}
          />
        )
        
      default:
        return null
    }
  }
  
  // Get title and subtitle based on current step
  const getStepInfo = () => {
    switch (step) {
      case 'PHONE':
        return {
          title: t("auth.enterPhone"),
          subtitle: t("auth.phoneExplain")
        }
        
      case 'OTP':
        return {
          title: t("auth.verifyNumber"),
          subtitle: ""
        }
        
      case 'PROFILE':
        return {
          title: t("profile.title"),
          subtitle: t("profile.subtitle")
        }
        
      default:
        return { title: "", subtitle: "" }
    }
  }
  
  const { title, subtitle } = getStepInfo()
  
  // Prepare footer content based on step
  const renderFooter = () => {
    if (step === 'PHONE') {
      return (
        <div className="text-center text-sm">
          {t("auth.alreadyHaveAccount")} 
          <Link href="/sign-in" className="text-primary font-medium hover:underline ml-1">
            {t("auth.signIn")}
          </Link>
        </div>
      )
    }
    
    return null
  }
  
  return (
    <AuthLayout 
      title={title}
      subtitle={subtitle}
      backHref={step === 'PHONE' ? "/" : undefined}
      backAction={step !== 'PHONE' ? () => setStep(prev => prev === 'OTP' ? 'PHONE' : 'OTP') : undefined}
      footerContent={renderFooter()}
    >
      {renderStepContent()}
    </AuthLayout>
  )
}
