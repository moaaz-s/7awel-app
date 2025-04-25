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
  const { signin, validatePin } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState("")

  const goToNextStep = async () => {
    if (currentStep === 0) {
      // Before moving from phone to OTP, call signin to *initiate* the process
      const result = await signin(phoneNumber);
      if (!result.success) {
        // TODO: Show error message to user (e.g., using toast)
        console.error("Signin initiation failed:", result.error);
        return; // Don't proceed if signin initiation fails
      }
    } else if (currentStep === 1) {
      // After OTP verification, the state should be handled by AuthContext's verifyOtp
      // Navigation to PIN should happen based on AuthContext state change
      // This direct call might be redundant if verifyOtp sets 'requires_pin' state
      // For now, let's assume we still need to advance the step locally after OTP success
      console.log("OTP verified, moving to PIN step.");
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // This branch should no longer be used; final redirect happens after PIN validation
    }
  }

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
      backHref={currentStep === 0 ? "/" : undefined}
      backAction={currentStep > 0 ? goToPreviousStep : undefined}
      footerContent={footerContent}
    >
      {currentStep === 0 && (
        <PhoneInput phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} onContinue={goToNextStep} />
      )}
      {currentStep === 1 && <OtpVerification onVerified={goToNextStep} phoneNumber={phoneNumber} />}
      {currentStep === 2 && <PinEntry onComplete={handlePinComplete} />}
    </AuthLayout>
  )
}
