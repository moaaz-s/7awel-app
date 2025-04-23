"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WelcomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: "Send Money Instantly",
      description: "Transfer funds to anyone, anywhere with just a few taps.",
      image: "/mobile-money-transfer.png",
    },
    {
      title: "Cash Out Anywhere",
      description: "Withdraw your money at thousands of locations worldwide.",
      image: "/atm-withdrawal.png",
    },
    {
      title: "Secure Payments",
      description: "Pay securely with QR codes and protect your money with PIN and biometrics.",
      image: "/secure-mobile-payment.png",
    },
  ]

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between p-4">
        {currentSlide > 0 ? (
          <Button variant="ghost" size="icon" onClick={prevSlide}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-9"></div>
        )}
        <Link href="/sign-up" className="text-sm text-violet-600">
          Skip
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <img
            src={slides[currentSlide].image || "/placeholder.svg"}
            alt={slides[currentSlide].title}
            className="mx-auto h-48 w-48 object-contain"
          />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{slides[currentSlide].title}</h1>
            <p className="text-muted-foreground">{slides[currentSlide].description}</p>
          </div>

          <div className="flex justify-center gap-2 pt-4">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${index === currentSlide ? "bg-violet-600" : "bg-gray-200"}`}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="p-6">
        {currentSlide < slides.length - 1 ? (
          <Button onClick={nextSlide} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 py-6">
            Next
          </Button>
        ) : (
          <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-blue-600 py-6">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        )}
      </footer>
    </div>
  )
}
