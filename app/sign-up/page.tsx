"use client"

import { useState } from "react"
import Link from "next/link"
import { PhoneInput } from "@/components/phone-input"
import { OtpVerification } from "@/components/otp-verification"
import { UserProfileForm } from "@/components/user-profile-form"
import { PinEntry } from "@/components/pin-entry"
import { useLanguage } from "@/context/LanguageContext"
import { AuthLayout } from "@/components/layouts/AuthLayout"
import { useAuth } from "@/context/AuthContext"

const steps = ["phone", "otp", "profile", "pin"]

export default function SignUpPage() {
  const { t } = useLanguage()
  const { setPin } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Registration complete, redirect to home
      window.location.href = "/home"
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getTitle = () => {
    if (currentStep === 0) return t("auth.enterPhone")
    if (currentStep === 1) return t("auth.verifyNumber")
    if (currentStep === 2) return t("profile.personalInfo")
    return t("auth.createPin")
  }

  const footerContent =
    currentStep === 0 ? (
      <p>
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/sign-in" className="text-blue-600 underline-offset-4 hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    ) : undefined

  const handlePinSetupComplete = async (pin: string) => {
    setIsLoading(true);
    try {
      await setPin(pin); // Save the PIN using AuthContext
      goToNextStep(); // Proceed to next step (likely completion/redirect)
    } catch (error) {
      console.error("Failed to set PIN during sign up:", error);
      // TODO: Show an error message to the user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={getTitle()}
      backAction={currentStep > 0 ? goToPreviousStep : undefined}
      footerContent={footerContent}
    >
      {currentStep === 0 && (
        <PhoneInput phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} onContinue={goToNextStep} />
      )}
      {currentStep === 1 && <OtpVerification onVerified={goToNextStep} phoneNumber={phoneNumber} />}
      {currentStep === 2 && <UserProfileForm onSubmit={goToNextStep} />}
      {currentStep === 3 && (
        <PinEntry
          onComplete={handlePinSetupComplete} // Use the new handler
          showBiometric={false} // Hide biometric option
          showForgotPin={false} // Hide forgot pin option
          // Consider adding loading state display if needed
        />
      )}
    </AuthLayout>
  )
}
