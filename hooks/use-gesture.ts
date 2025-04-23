"use client"

import type React from "react"

import { useEffect, useRef, useCallback } from "react"
import { useGesture } from "@/context/GestureContext"

interface SwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  preventDefaultTouchMove?: boolean
}

interface LongPressOptions {
  onLongPress: () => void
  threshold?: number
}

interface DoubleTapOptions {
  onDoubleTap: () => void
  threshold?: number
}

// Hook for swipe gestures
export function useSwipe(options: SwipeOptions) {
  const { isSwipeEnabled, swipeThreshold, isCapacitor } = useGesture()
  const threshold = options.threshold || swipeThreshold

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isSwipeEnabled) return

      const touch = e.touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      }
    },
    [isSwipeEnabled],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (options.preventDefaultTouchMove) {
        e.preventDefault()
      }
    },
    [options.preventDefaultTouchMove],
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!isSwipeEnabled || !touchStartRef.current) return

      const touch = e.changedTouches[0]
      const endX = touch.clientX
      const endY = touch.clientY

      const diffX = endX - touchStartRef.current.x
      const diffY = endY - touchStartRef.current.y

      // Determine swipe direction
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (Math.abs(diffX) > threshold) {
          if (diffX > 0 && options.onSwipeRight) {
            options.onSwipeRight()
          } else if (diffX < 0 && options.onSwipeLeft) {
            options.onSwipeLeft()
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(diffY) > threshold) {
          if (diffY > 0 && options.onSwipeDown) {
            options.onSwipeDown()
          } else if (diffY < 0 && options.onSwipeUp) {
            options.onSwipeUp()
          }
        }
      }

      touchStartRef.current = null
    },
    [isSwipeEnabled, threshold, options],
  )

  useEffect(() => {
    if (isCapacitor) {
      // In Capacitor, we would use the Capacitor Gesture plugin
      // This is a placeholder for future implementation
      return () => {}
    } else {
      // Web implementation
      document.addEventListener("touchstart", handleTouchStart, { passive: true })
      document.addEventListener("touchmove", handleTouchMove, { passive: !options.preventDefaultTouchMove })
      document.addEventListener("touchend", handleTouchEnd, { passive: true })

      return () => {
        document.removeEventListener("touchstart", handleTouchStart)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [isCapacitor, handleTouchStart, handleTouchMove, handleTouchEnd, options.preventDefaultTouchMove])
}

// Hook for long press
export function useLongPress(ref: React.RefObject<HTMLElement>, options: LongPressOptions) {
  const { longPressThreshold, isCapacitor } = useGesture()
  const threshold = options.threshold || longPressThreshold

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)

  const handleTouchStart = useCallback(() => {
    isLongPressRef.current = false

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      options.onLongPress()
    }, threshold)
  }, [options, threshold])

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (isCapacitor) {
      // In Capacitor, we would use the Capacitor Gesture plugin
      // This is a placeholder for future implementation
      return () => {}
    } else {
      // Web implementation
      element.addEventListener("touchstart", handleTouchStart, { passive: true })
      element.addEventListener("touchend", handleTouchEnd, { passive: true })

      return () => {
        element.removeEventListener("touchstart", handleTouchStart)
        element.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [ref, isCapacitor, handleTouchStart, handleTouchEnd])
}

// Hook for double tap
export function useDoubleTap(ref: React.RefObject<HTMLElement>, options: DoubleTapOptions) {
  const { doubleTapThreshold, isCapacitor } = useGesture()
  const threshold = options.threshold || doubleTapThreshold

  const lastTapRef = useRef<number>(0)

  const handleTap = useCallback(() => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current

    if (timeSinceLastTap < threshold && timeSinceLastTap > 0) {
      options.onDoubleTap()
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }, [options, threshold])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (isCapacitor) {
      // In Capacitor, we would use the Capacitor Gesture plugin
      // This is a placeholder for future implementation
      return () => {}
    } else {
      // Web implementation
      element.addEventListener("touchend", handleTap, { passive: true })

      return () => {
        element.removeEventListener("touchend", handleTap)
      }
    }
  }, [ref, isCapacitor, handleTap])
}
