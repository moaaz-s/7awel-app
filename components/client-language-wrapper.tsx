"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { ReactNode } from "react"

interface ClientLanguageWrapperProps {
  children: (props: { t: (key: string, params?: Record<string, string>) => string; isRTL: boolean }) => ReactNode
}

export function ClientLanguageWrapper({ children }: ClientLanguageWrapperProps) {
  const { t, isRTL } = useLanguage()

  return <>{children({ t, isRTL })}</>
}
