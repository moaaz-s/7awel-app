"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PhoneInput } from "@/components/phone-input"
import { OtpVerification } from "@/components/otp-verification"
import { PinEntry } from "@/components/pin-entry"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { AuthLayout } from "@/components/layouts/AuthLayout"

const steps = ["phone", "otp", "pin"]

export default function SignInPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { signin, verifyOtp, validatePin, isLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)

  const handleSignin = async (phoneNumber: string) => {
    setPhoneNumberError(null);
    setPhoneNumber(phoneNumber);
    // Before moving from phone to OTP, call signin to *initiate* the process
    const result = await signin(phoneNumber);
    if (!result.success) {
      // Display the translated error message from the error code
      console.error("Signin initiation failed:", result.error);
      setPhoneNumberError(result.error || t(`errors.${result.errorCode || "UNKNOWN_ERROR"}`));
      return; // Don't proceed if signin initiation fails
    }
    setCurrentStep(steps.indexOf('otp'));
  }

  const handleOtpEntry = async (otp: string) => {
    setOtpError(null); // Clear previous errors
    const result = await verifyOtp(phoneNumber, otp);
    if (!result.success) {
      // Display the translated error message
      console.error("OTP Verification failed:", result.error);
      setOtpError(result.error || t(`errors.${result.errorCode || "UNKNOWN_ERROR"}`)); 
      return;
    }
    // Success! AuthContext should now be in 'requires_pin' state.
    // AppInitializer will handle redirect OR we transition local step.
    setCurrentStep(steps.indexOf('pin'));
  };

  const handlePinComplete = async (pin: string) => {
    const ok = await validatePin(pin)
    if (ok) {
      router.push("/home")
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getTitle = () => {
    if (currentStep === 0) return t("auth.signIn")
    if (currentStep === 1) return t("auth.verifyNumber")
    return t("auth.signIn")
  }

  const getSubtitle = () => {
    if (currentStep === 0) return t("auth.signInSubtitle")
    if (currentStep === 1) return t("auth.verifyNumberSubtitle")
    return t("auth.signInSubtitle")  
  }

  const footerContent =
    currentStep === 0 ? (
      <p>
        {t("auth.dontHaveAccount")}{" "}
        <Link href="/sign-up" className="text-blue-600 underline-offset-4 hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>
    ) : undefined

  return (
    <AuthLayout
      title={getTitle()}
      subtitle={getSubtitle()}
      backHref={currentStep === 0 ? "/" : undefined}
      backAction={currentStep > 0 ? goToPreviousStep : undefined}
      footerContent={footerContent}
    >
      {currentStep === 0 && (
        <PhoneInput onSubmit={handleSignin} />
      )}
      {currentStep === 1 && (
        <OtpVerification
          onVerify={handleOtpEntry}
          onResend={() => handleSignin(phoneNumber)}
          error={otpError}
          isLoading={isLoading}
        />
      )}
      {currentStep === 2 && <PinEntry onComplete={handlePinComplete} />}
    </AuthLayout>
  )
}
