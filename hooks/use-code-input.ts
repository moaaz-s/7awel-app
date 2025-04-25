// hooks/use-code-input.ts
"use client"

import { useState, useRef } from "react"

export interface UseCodeInputOptions {
  length?: number
  rtl?: boolean
}

export function useCodeInput({ length = 6, rtl = false }: UseCodeInputOptions = {}) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const setDigit = (index: number, value: string) => {
    if (value.length > 1) value = value.charAt(0)
    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)

    // focus next / previous
    if (value) {
      const next = rtl ? index - 1 : index + 1
      if (!rtl ? next < length : next >= 0) inputRefs.current[next]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index]) {
      const prev = rtl ? index + 1 : index - 1
      if (!rtl ? prev >= 0 : prev < length) inputRefs.current[prev]?.focus()
    }
    if (e.key === "ArrowLeft") {
      const prev = rtl ? index + 1 : index - 1
      if (!rtl ? prev >= 0 : prev < length) inputRefs.current[prev]?.focus()
    }
    if (e.key === "ArrowRight") {
      const next = rtl ? index - 1 : index + 1
      if (!rtl ? next < length : next >= 0) inputRefs.current[next]?.focus()
    }
  }

  const reset = () => setDigits(Array(length).fill(""))
  const code = digits.join("")
  const isComplete = digits.every(Boolean)

  return { digits, setDigit, handleKeyDown, inputRefs, reset, code, isComplete }
}
