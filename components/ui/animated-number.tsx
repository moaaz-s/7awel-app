"use client"

import { useState, useEffect } from "react"
import { motion, useSpring, useMotionValue, useTransform } from "framer-motion"

interface AnimatedNumberProps {
  value: number
  duration?: number
  formatValue?: (value: number) => string
  className?: string
}

export function AnimatedNumber({
  value,
  duration = 0.5,
  formatValue = (val) => val.toFixed(2),
  className = "",
}: AnimatedNumberProps) {
  const [prevValue, setPrevValue] = useState(value)
  const springValue = useSpring(prevValue, { duration })
  const displayValue = useMotionValue(prevValue)
  const rounded = useTransform(displayValue, (val) => formatValue(val))

  useEffect(() => {
    displayValue.set(value)
    springValue.set(value)
    setPrevValue(value)
  }, [value, displayValue, springValue])

  return <motion.span className={className}>{rounded}</motion.span>
}
