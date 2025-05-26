"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { CloseIcon } from "@/components/icons"
import { Promotion } from "@/types"
import { useLanguage } from "@/context/LanguageContext"
import { ContentCard } from "@/components/ui/cards/content-card"

interface PromotionalSliderProps {
  promotions: Promotion[]
  className?: string
  onClose?: () => void
  showCloseButton?: boolean
}

export function PromotionalSlider({
  promotions, 
  className,
  onClose,
  showCloseButton = true,
}: PromotionalSliderProps) {
  const { isRTL } = useLanguage()
  const [activeIndex, setActiveIndex] = useState(0)
  const [closed, setClosed] = useState(false)

  // Auto-rotate the promotions
  useEffect(() => {
    if (promotions.length <= 1) return

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % promotions.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [promotions.length])

  if (!promotions.length || closed) return null

  const handleClose = () => {
    setClosed(true)
    onClose?.();
  }

  return (
    <div className="flex flex-col items-center">
      <ContentCard
        className={cn("relative h-[100px]", className)}
        padding="none"
        elevated
      >
        {/* Close button */}
        {showCloseButton && (
          <button 
            onClick={handleClose}
            className={cn(
              "absolute top-2 z-10 p-1 bg-gray-100 rounded-full",
              isRTL ? "left-2" : "right-2"
            )}
            aria-label="Close promotion"
          >
            <CloseIcon className="h-3 w-3 text-gray-500" />
          </button>
        )}

        <div className="relative h-full">
          {promotions.map((promo, index) => (
            <Link 
              key={promo.id}
              href={promo.linkUrl}
              className={cn(
                "block transition-opacity duration-300 h-full",
                index === activeIndex ? "opacity-100" : "opacity-0 absolute inset-0"
              )}
            >
              <div className="flex items-center h-full px-4 py-2">
                <div className="flex-1 overflow-hidden pr-2">
                  <h3 className="font-semibold text-sm truncate">{promo.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{promo.description}</p>
                </div>
                {promo.imageUrl && (
                  <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                    <Image 
                      src={promo.imageUrl} 
                      alt={promo.title} 
                      width={80} 
                      height={80}
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </ContentCard>
      
      {/* Dots indicator integrated directly in slider component */}
      {promotions.length > 1 && (
        <div className="flex justify-center gap-1 mt-1">
          {promotions.map((_, index) => (
            <button 
              key={index}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                index === activeIndex ? "bg-primary w-3" : "bg-primary/30"
              )}
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
