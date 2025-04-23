"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useAnimate } from "framer-motion"

interface AnimationOptions {
  duration?: number
  ease?: string
  delay?: number
}

export function useAnimation(ref: React.RefObject<HTMLElement>) {
  const [scope, animate] = useAnimate()
  const [isAnimating, setIsAnimating] = useState(false)

  const fadeIn = useCallback(
    (options: AnimationOptions = {}) => {
      if (!ref.current) return

      setIsAnimating(true)

      animate(
        ref.current,
        { opacity: [0, 1] },
        { duration: options.duration || 0.3, ease: options.ease || "easeInOut", delay: options.delay || 0 },
      ).then(() => setIsAnimating(false))
    },
    [ref, animate],
  )

  const fadeOut = useCallback(
    (options: AnimationOptions = {}) => {
      if (!ref.current) return

      setIsAnimating(true)

      animate(
        ref.current,
        { opacity: [1, 0] },
        { duration: options.duration || 0.3, ease: options.ease || "easeInOut", delay: options.delay || 0 },
      ).then(() => setIsAnimating(false))
    },
    [ref, animate],
  )

  const slideIn = useCallback(
    (direction: "left" | "right" | "up" | "down", options: AnimationOptions = {}) => {
      if (!ref.current) return

      setIsAnimating(true)

      const animations = {
        left: { x: ["-100%", "0%"] },
        right: { x: ["100%", "0%"] },
        up: { y: ["-100%", "0%"] },
        down: { y: ["100%", "0%"] },
      }

      animate(ref.current, animations[direction], {
        duration: options.duration || 0.3,
        ease: options.ease || "easeOut",
        delay: options.delay || 0,
      }).then(() => setIsAnimating(false))
    },
    [ref, animate],
  )

  const slideOut = useCallback(
    (direction: "left" | "right" | "up" | "down", options: AnimationOptions = {}) => {
      if (!ref.current) return

      setIsAnimating(true)

      const animations = {
        left: { x: ["0%", "-100%"] },
        right: { x: ["0%", "100%"] },
        up: { y: ["0%", "-100%"] },
        down: { y: ["0%", "100%"] },
      }

      animate(ref.current, animations[direction], {
        duration: options.duration || 0.3,
        ease: options.ease || "easeIn",
        delay: options.delay || 0,
      }).then(() => setIsAnimating(false))
    },
    [ref, animate],
  )

  const pulse = useCallback(
    (options: AnimationOptions = {}) => {
      if (!ref.current) return

      setIsAnimating(true)

      animate(
        ref.current,
        { scale: [1, 1.05, 1] },
        { duration: options.duration || 0.5, ease: options.ease || "easeInOut", delay: options.delay || 0 },
      ).then(() => setIsAnimating(false))
    },
    [ref, animate],
  )

  return {
    scope,
    isAnimating,
    fadeIn,
    fadeOut,
    slideIn,
    slideOut,
    pulse,
  }
}
