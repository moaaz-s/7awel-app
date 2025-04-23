"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ButtonPrimary } from "@/components/ui/button-primary"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"

// Onboarding slide content
const slides = [
  {
    id: 1,
    titleKey: "onboarding.sendMoney",
    descriptionKey: "onboarding.sendMoneyDesc",
    imageUrl: "/mobile-money-transfer.png",
    imageAlt: "Send money illustration",
  },
  {
    id: 2,
    titleKey: "onboarding.receivePayments",
    descriptionKey: "onboarding.receivePaymentsDesc",
    imageUrl: "/mobile-payment-received.png",
    imageAlt: "Receive money illustration",
  },
  {
    id: 3,
    titleKey: "onboarding.trackTransactions",
    descriptionKey: "onboarding.trackTransactionsDesc",
    imageUrl: "/mobile-finance-view.png",
    imageAlt: "Transaction tracking illustration",
  },
  {
    id: 4,
    titleKey: "onboarding.cashOut",
    descriptionKey: "onboarding.cashOutDesc",
    imageUrl: "/atm-withdrawal-flat.png",
    imageAlt: "Cash out illustration",
  },
]

export default function OnboardingPage() {
  const { t, isRTL } = useLanguage()
  const { completeOnboarding, isLoading } = useAuth()
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isClient, setIsClient] = useState(false)

  // Handle hydration mismatch with animations
  useEffect(() => {
    setIsClient(true)
  }, [])

  const nextSlide = () => {
    setDirection(1)
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    setDirection(-1)
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
  }

  const handleSkip = async () => {
    await completeOnboarding();
    router.push('/'); // Navigate to root/auth page after skipping
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    router.push('/sign-up'); // Navigate to sign-up page after finishing
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? (isRTL ? -500 : 500) : isRTL ? 500 : -500,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? (isRTL ? 500 : -500) : isRTL ? -500 : 500,
      opacity: 0,
    }),
  }

  if (!isClient) {
    return null // Prevent flash of unstyled content
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between p-4">
        {currentSlide > 0 ? (
          <Button variant="ghost" size="icon" onClick={prevSlide} aria-label={t('common.previous')}>
            <ChevronLeft className="h-5 w-5" style={{ transform: isRTL ? "scaleX(-1)" : "none" }} />
          </Button>
        ) : (
          <div className="w-9 h-9"></div> // Placeholder for alignment
        )}
        <button
           onClick={handleSkip}
           disabled={isLoading}
           className="text-sm font-medium text-violet-600 hover:text-violet-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("common.skip")}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col items-center"
            >
              <div className="mb-8 h-64 w-64 relative">
                <img
                  src={slides[currentSlide].imageUrl || "/placeholder.svg"}
                  alt={slides[currentSlide].imageAlt}
                  className="w-full h-full object-contain"
                />
              </div>

              <h1 className="text-2xl font-bold mb-2">{t(slides[currentSlide].titleKey)}</h1>
              <p className="text-muted-foreground">{t(slides[currentSlide].descriptionKey)}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2 pt-4">
            {slides.map((_, index) => {
              const isActive = index === currentSlide
              return (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={
                    isActive
                      ? "h-2.5 w-5 rounded-full transition-all bg-violet-600"
                      : "h-2.5 w-2.5 rounded-full transition-all bg-gray-200"
                  }
                  aria-label={`Go to slide ${index + 1}`}
                />
              )
            })}
          </div>
        </div>
      </main>

      <footer className="p-6">
        {currentSlide < slides.length - 1 ? (
          <ButtonPrimary onClick={nextSlide} fullWidth size="lg">
            {t('common.next')}
          </ButtonPrimary>
        ) : (
          <ButtonPrimary onClick={handleGetStarted} disabled={isLoading} fullWidth size="lg">
            {isLoading ? t('common.loading') : t('common.getStarted')}
          </ButtonPrimary>
        )}
      </footer>
    </div>
  )
}
