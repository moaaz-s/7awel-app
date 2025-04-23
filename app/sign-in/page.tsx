"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PhoneInput } from "@/components/phone-input"
import { OtpVerification } from "@/components/otp-verification"
import { PinEntry } from "@/components/pin-entry"
import { useLanguage } from "@/context/LanguageContext"
import { AuthLayout } from "@/components/layouts/AuthLayout"

const steps = ["phone", "otp", "pin"]

export default function SignInPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState("")

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Sign in complete, redirect to home
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
      {currentStep === 2 && <PinEntry onComplete={goToNextStep} />}
    </AuthLayout>
  )
}
