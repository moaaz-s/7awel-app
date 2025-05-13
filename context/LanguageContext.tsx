"use client"

import React from "react"; // Needed for Vitest JSX transform
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { en } from "@/locales/en"
import { ar } from "@/locales/ar"
import { getItem as getSecureItem, setItem as setSecureItem } from '@/utils/secure-storage'

// Define languages and their properties
export type Language = "en" | "ar"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
  dir: "ltr" | "rtl"
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Initial language is Arabic
const DEFAULT_LANGUAGE: Language = "ar"

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Use a key to force re-renders when language changes
  const [forceUpdateKey, setForceUpdateKey] = useState(0)
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  // Set language and save to device storage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    setSecureItem("app-language", lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
    // Force a context re-render without page reload
    setForceUpdateKey(prev => prev + 1)
  }

  // Initialize language from secure storage or use default
  useEffect(() => {
    const initializeLanguage = async () => {
      const savedLanguage = await getSecureItem("app-language") as Language
      if (savedLanguage && (savedLanguage === "en" || savedLanguage === "ar")) {
        setLanguageState(savedLanguage)
        document.documentElement.lang = savedLanguage
        document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr"
      } else {
        setLanguageState(DEFAULT_LANGUAGE)
        document.documentElement.lang = DEFAULT_LANGUAGE
        document.documentElement.dir = DEFAULT_LANGUAGE === "ar" ? "rtl" : "ltr"
      }
    }
    initializeLanguage()
  }, [])

  // Translation function
  const t = (key: string, params?: Record<string, string>): string => {
    const translations = language === "ar" ? ar : en

    // Split the key path (e.g., "home.welcome")
    const keys = key.split(".")

    // Navigate through the translation object
    let value = keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined), translations as any)

    // Return key if translation not found
    if (value === undefined) {
      console.warn(`Translation key not found: ${key}`)
      return key
    }

    // Replace parameters if any
    if (params && typeof value === "string") {
      Object.keys(params).forEach((paramKey) => {
        value = value.replace(`{${paramKey}}`, params[paramKey])
      })
    }

    return value
  }

  // Provide direction
  const dir = language === "ar" ? "rtl" : "ltr"
  const isRTL = language === "ar"

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRTL }} key={forceUpdateKey}>
      {children}
    </LanguageContext.Provider>
  )
}

// Custom hook to use the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
