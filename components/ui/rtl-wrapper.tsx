"use client"

import { useLanguage } from "@/context/LanguageContext"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface RTLWrapperProps {
  children: ReactNode
  className?: string
}

export function RTLWrapper({ children, className }: RTLWrapperProps) {
  const { isRTL } = useLanguage()

  return <div className={cn(isRTL ? "text-right" : "text-left", className)}>{children}</div>
}
