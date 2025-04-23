"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface AnimatedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string
  className?: string
  itemClassName?: string
  animateOnMount?: boolean
  staggerDelay?: number
}

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className = "",
  itemClassName = "",
  animateOnMount = true,
  staggerDelay = 0.05,
}: AnimatedListProps<T>) {
  const [mounted, setMounted] = useState(false)
  const prevItemsRef = useRef<T[]>([])

  useEffect(() => {
    setMounted(true)
    prevItemsRef.current = items
  }, [items])

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  }

  return (
    <motion.div
      className={className}
      initial={animateOnMount ? "hidden" : "visible"}
      animate="visible"
      variants={listVariants}
    >
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            className={itemClassName}
            variants={itemVariants}
            initial={mounted ? "hidden" : "visible"}
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
