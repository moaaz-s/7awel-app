// hooks/use-device.ts
"use client"

import { useMemo, useState } from "react"
import { useMobile } from "@/hooks/use-mobile"
import { useSwipe } from "@/hooks/use-gesture"

export function useDevice() {
  const mobile = useMobile()

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  // Track last swipe direction using existing gesture hook
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "up" | "down" | null>(null)

  useSwipe({
    onSwipeLeft: () => setSwipeDirection("left"),
    onSwipeRight: () => setSwipeDirection("right"),
    onSwipeUp: () => setSwipeDirection("up"),
    onSwipeDown: () => setSwipeDirection("down"),
  })

  // Determine swipeDirection placeholder (could be filled by gesture context)
  // For now expose same values from useMobile.
  return {
    ...mobile,
    prefersReducedMotion,
    swipeDirection,
  }
}
