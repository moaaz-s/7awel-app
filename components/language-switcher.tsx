"use client"

import { useLanguage, type Language } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage()

  // Handle language change
  const handleLanguageChange = (newLanguage: Language) => {
    if (newLanguage !== language) {
      setLanguage(newLanguage)
      // Remove the page reload code - context re-rendering will handle this
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => handleLanguageChange(language === "en" ? "ar" : "en")} className={cn("min-w-24", className)}>
      {language === "ar" ? "English" : "العربية"}
    </Button>
  )
}
