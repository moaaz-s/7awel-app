"use client"

import type React from "react"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

interface AnimatedTransitionProps {
  children: React.ReactNode
  className?: string
  transitionKey: string
  direction?: "left" | "right" | "up" | "down"
  duration?: number
}

export function AnimatedTransition({
  children,
  className = "",
  transitionKey,
  direction = "right",
  duration = 0.3,
}: AnimatedTransitionProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div className={className}>{children}</div>
  }

  const directionVariants = {
    left: {
      enter: { x: "100%", opacity: 0 },
      center: { x: 0, opacity: 1 },
      exit: { x: "-100%", opacity: 0 },
    },
    right: {
      enter: { x: "-100%", opacity: 0 },
      center: { x: 0, opacity: 1 },
      exit: { x: "100%", opacity: 0 },
    },
    up: {
      enter: { y: "100%", opacity: 0 },
      center: { y: 0, opacity: 1 },
      exit: { y: "-100%", opacity: 0 },
    },
    down: {
      enter: { y: "-100%", opacity: 0 },
      center: { y: 0, opacity: 1 },
      exit: { y: "100%", opacity: 0 },
    },
  }

  const variants = directionVariants[direction]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        className={className}
        initial="enter"
        animate="center"
        exit="exit"
        variants={variants}
        transition={{ duration }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
