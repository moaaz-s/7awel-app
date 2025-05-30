// https://refero.design/apps/74
"use client"

import { useLanguage } from "@/context/LanguageContext"
import { ClientLanguageWrapper } from "@/components/client-language-wrapper"
import { ReelsContainer, type ReelSlide } from "@/components/ui/reels-container"
import Image from "next/image"
import { motion } from "framer-motion"

// Animated Crypto Coins component for visual appeal
function AnimatedCoins() {
  return (
    <div className="relative w-full h-full">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ 
            x: Math.random() * 300 - 150, 
            y: Math.random() * 300 - 150,
            rotate: Math.random() * 180 - 90,
            opacity: 0.5
          }}
          animate={{
            x: Math.random() * 300 - 150,
            y: Math.random() * 300 - 150,
            rotate: [null, Math.random() * 180 - 90],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: i * 0.5
          }}
          style={{
            width: 80 + Math.random() * 80,
            height: 80 + Math.random() * 80,
          }}
        >
          <Image
            src={`/coins/coin-${i % 3 + 1}.png`}
            alt="Crypto coin"
            width={120}
            height={120}
            className="w-full h-full object-contain opacity-70 drop-shadow-lg"
          />
        </motion.div>
      ))}
    </div>
  )
}

// Define the splash page slides for the reels
const splashSlides: ReelSlide[] = [
  {
    id: 1,
    titleKey: "splash.slide1.title",
    subtitleKey: "splash.slide1.subtitle",
    contentType: "image",
    imageUrl: "/onboarding/1.png",
    content: <></>
  },
  {
    id: 2,
    titleKey: "splash.slide2.title",
    subtitleKey: "splash.slide2.subtitle",
    contentType: "image",
    imageUrl: "/onboarding/2.png",
    content: <></>
  },
  {
    id: 3,
    titleKey: "splash.slide3.title",
    subtitleKey: "splash.slide3.subtitle",
    contentType: "image",
    imageUrl: "/onboarding/3.png",
    content: <></>
  },
  {
    id: 4,
    titleKey: "splash.slide4.title",
    subtitleKey: "splash.slide4.subtitle",
    contentType: "image",
    imageUrl: "/onboarding/4.png",
    content: <></>
  }
]

export default function SplashScreen() {
  const { t } = useLanguage()
  
  return (
    <ClientLanguageWrapper>
      {() => (
        <div className="relative min-h-screen overflow-hidden">
          {/* Dark background with gradient - Always visible */}
          <div className="absolute inset-0 bg-black">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-black to-secondary/20 z-0" />
          </div>
          
          <ReelsContainer 
            slides={splashSlides}
            showLoginButtons={true}
            buttonVariant="dark"
            className="relative z-10"
          />
        </div>
      )}
    </ClientLanguageWrapper>
  )
}
