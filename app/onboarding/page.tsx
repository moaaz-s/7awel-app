"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { ReelsContainer, type ReelSlide } from "@/components/ui/reels-container"
import Image from "next/image"

// Convert existing slides to the new format
const onboardingSlides: ReelSlide[] = [
  {
    id: 1,
    titleKey: "onboarding.sendMoney",
    subtitleKey: "onboarding.sendMoneyDesc",
    imageUrl: "/mobile-money-transfer.png",
    content: <></> // Empty fragment as fallback
  },
  {
    id: 2,
    titleKey: "onboarding.receivePayments",
    subtitleKey: "onboarding.receivePaymentsDesc",
    imageUrl: "/mobile-payment-received.png",
    content: <></> // Empty fragment as fallback
  },
  {
    id: 3,
    titleKey: "onboarding.trackTransactions",
    subtitleKey: "onboarding.trackTransactionsDesc",
    imageUrl: "/mobile-finance-view.png",
    content: <></> // Empty fragment as fallback
  },
  {
    id: 4,
    titleKey: "onboarding.cashOut",
    subtitleKey: "onboarding.cashOutDesc",
    imageUrl: "/atm-withdrawal-flat.png",
    content: <></> // Empty fragment as fallback
  },
]

export default function OnboardingPage() {
  const { t } = useLanguage()
  const { completeOnboarding, isLoading } = useAuth()
  const router = useRouter()

  const handleComplete = async () => {
    await completeOnboarding()
    router.push('/sign-up')
  }

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      <ReelsContainer 
        slides={onboardingSlides}
        showLoginButtons={false}
        buttonVariant="light"
        onComplete={handleComplete}
      />
    </div>
  )
}
