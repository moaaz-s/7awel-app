"use client"

import { useState, useEffect, ReactNode, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"

export interface ReelSlide {
  id: number
  titleKey: string 
  subtitleKey: string 
  content: ReactNode
  contentType?: "image" | "component" 
  imageUrl?: string
  duration?: number // Duration in milliseconds for this slide (default will be 5000ms)
}

interface ReelsContainerProps {
  slides: ReelSlide[]
  showLoginButtons?: boolean
  buttonVariant?: "light" | "dark" 
  onComplete?: () => void
  className?: string
  autoPlay?: boolean // Whether to auto-advance slides
  defaultDuration?: number // Default duration for slides in milliseconds
}

export function ReelsContainer({
  slides,
  showLoginButtons = true,
  buttonVariant = "light",
  onComplete,
  className,
  autoPlay = true,
  defaultDuration = 5000
}: ReelsContainerProps) {
  const { t, isRTL } = useLanguage()
  const { isMobile, isCapacitor } = useMobile()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0) // Progress from 0 to 100
  
  // References for animation
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number>(0) // Time elapsed when paused
  
  // Touch references for swipe detection
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  
  // Calculate duration for current slide
  const currentDuration = slides[currentSlide]?.duration || defaultDuration
  
  // Animation function for progress bar
  const animateProgress = (timestamp: number) => {
    // Initialize start time on first animation frame
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp
    }
    
    if (!isPaused) {
      // Calculate elapsed time since animation started
      const elapsedSinceStart = timestamp - startTimeRef.current
      
      // Calculate progress as percentage (0-100)
      const newProgress = Math.min(100, (elapsedSinceStart / currentDuration) * 100)
      
      // Update progress state for UI
      setProgress(newProgress)
      
      // If completed, move to next slide immediately
      if (newProgress >= 100) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
        
        // Advance to next slide immediately without delay
        nextSlide()
        return
      }
    } else {
      // If paused, update the paused time
      pausedAtRef.current = timestamp - startTimeRef.current
    }
    
    // Request next frame
    animationRef.current = requestAnimationFrame(animateProgress)
  }
  
  // Start/reset animation when slide changes or animation settings change
  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    // Reset progress and timing references
    setProgress(0)
    startTimeRef.current = null
    pausedAtRef.current = 0
    
    // Start new animation if autoPlay is enabled and we're client-side
    if (autoPlay && isClient) {
      animationRef.current = requestAnimationFrame(animateProgress)
    }
    
    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentSlide, autoPlay, isClient])
  
  // Handle pausing/resuming
  useEffect(() => {
    if (isPaused) {
      // No action needed, we'll calculate pause duration on resume
    } else if (startTimeRef.current !== null) {
      // When resuming, adjust the start time to account for the pause duration
      const now = performance.now()
      startTimeRef.current = now - pausedAtRef.current
      
      // Restart animation if needed
      if (!animationRef.current && autoPlay && isClient) {
        animationRef.current = requestAnimationFrame(animateProgress)
      }
    }
  }, [isPaused, autoPlay, isClient])

  // Handle hydration mismatch with animations
  useEffect(() => {
    setIsClient(true)
  }, [])

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
  }

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1)
      setCurrentSlide(currentSlide + 1)
    } else if (onComplete) {
      onComplete()
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide(currentSlide - 1)
    }
  }
  
  // Handle pause/resume on user interaction
  const handleUserInteraction = (action: 'pause' | 'resume') => {
    setIsPaused(action === 'pause')
  }
  
  // Handle touch events for swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    // Pause the animation when touching
    handleUserInteraction('pause')
    
    // Store the starting touch position
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Resume the animation when touch ends
    handleUserInteraction('resume')
    
    // Skip swipe detection if we don't have starting position
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return
    }
    
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    
    // Calculate distance moved
    const deltaX = touchEndX - touchStartXRef.current
    const deltaY = touchEndY - touchStartYRef.current
    
    // Detect horizontal swipe (only if horizontal movement is greater than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swiped right - go to previous slide in LTR, next slide in RTL
        isRTL ? nextSlide() : prevSlide()
      } else {
        // Swiped left - go to next slide in LTR, previous slide in RTL
        isRTL ? prevSlide() : nextSlide()
      }
    }
    
    // Reset touch references
    touchStartXRef.current = null
    touchStartYRef.current = null
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default to avoid scrolling while swiping
    // Only prevent if horizontal movement is significant
    if (touchStartXRef.current !== null) {
      const touchMoveX = e.touches[0].clientX
      const deltaX = touchMoveX - touchStartXRef.current
      
      if (Math.abs(deltaX) > 10) {
        e.preventDefault()
      }
    }
  }

  // Define animation variants for fade transition
  const variants = {
    enter: {
      opacity: 0,
    },
    center: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  }

  if (!isClient) {
    return null
  }

  const currentReel = slides[currentSlide]

  return (
    <div 
      className={cn("relative flex flex-col min-h-screen", className)}
      onMouseDown={() => handleUserInteraction('pause')}
      onMouseUp={() => handleUserInteraction('resume')}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Progress bars - Stories-style */}
      <div className="absolute top-0 left-0 right-0 z-10 px-2 pt-2" style={{ direction: isRTL ? "rtl" : "ltr" }}>
        <div className="flex w-full gap-1">
          {/* In RTL mode, we need to reverse the order of the slides array for display */}
          {slides.map((_, index) => {
            const isCompleted = index < currentSlide
            const isActive = index === currentSlide
            
            return (
              <div 
                key={index}
                className="h-1 relative bg-gray-300/30 flex-1 overflow-hidden rounded-sm"
                onClick={() => goToSlide(index)}
              >
                <div 
                  className={cn(
                    "absolute top-0 left-0 h-full rounded-sm",
                    buttonVariant === "dark" ? "bg-white" : "bg-primary",
                    isCompleted && "opacity-90"
                  )}
                  style={{
                    transform: isRTL 
                      ? (isCompleted ? 'translateX(0)' : isActive ? `translateX(${100-progress}%)` : 'translateX(100%)')
                      : (isCompleted ? 'translateX(0)' : isActive ? `translateX(${progress-100}%)` : 'translateX(-100%)'),
                    width: '100%',
                    transition: isActive ? 'none' : 'transform 0.3s ease'
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Header with logo and title */}
      <header className="relative z-10 pt-12 pb-4 px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/7awel - lettermark.svg"
            alt="7awel"
            width={24}
            height={24}
            className="h-6 w-6"
          />
          <h2 className={cn(
            "text-sm font-medium",
            buttonVariant === "dark" ? "text-white" : "text-foreground"
          )}>
            {t("splash.welcome")}
          </h2>
        </div>
        
        <div className="mt-6">
          <h1 className={cn(
            "text-3xl font-bold tracking-tight",
            buttonVariant === "dark" ? "text-white" : "text-foreground"
          )}>
            {t(currentReel.titleKey)}
          </h1>
          <p className={cn(
            "mt-2 text-sm",
            buttonVariant === "dark" ? "text-white/80" : "text-muted-foreground"
          )}>
            {t(currentReel.subtitleKey)}
          </p>
        </div>
      </header>

      {/* Main content - reels */}
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center px-6"
          >
            {currentReel.contentType === "component" ? (
              currentReel.content
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {currentReel.imageUrl && (
                  <Image
                    src={currentReel.imageUrl}
                    alt={t(currentReel.titleKey)}
                    fill
                    className="object-contain"
                  />
                )}
                {!currentReel.imageUrl && currentReel.content}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Only show click areas on non-touch devices */}
        {!isMobile && (
          <>
            <div 
              className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-w-resize"
              onClick={isRTL ? nextSlide : prevSlide}
            />
            <div 
              className="absolute right-0 top-0 w-1/3 h-full z-10 cursor-e-resize"
              onClick={isRTL ? prevSlide : nextSlide}
            />
          </>
        )}
      </main>

      {/* Footer with buttons */}
      <footer className="relative z-10 p-6 space-y-4">
        {showLoginButtons ? (
          <div className="flex justify-center justify-between gap-3 mt-4">
            <Button fullWidth href="/sign-in" variant="white">
              {t("splash.login")}
            </Button>
            <Button fullWidth href="/sign-up" variant="black">
              {t("splash.signup")}
            </Button>
          </div>
        ) : (
          <Button 
            onClick={nextSlide}
            // For onboarding flow, use default button style
            variant={buttonVariant === "dark" ? "default" : "default"}
            className={cn(
              "w-full",
              buttonVariant === "dark" && "bg-white text-black hover:bg-white/90"
            )}
            size="lg"
          >
            {currentSlide < slides.length - 1 ? t("splash.continue") : t("common.getStarted")}
          </Button>
        )}
      </footer>
    </div>
  )
}
