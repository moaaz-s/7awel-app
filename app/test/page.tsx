"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"

export default function TestPage() {
  const { language, setLanguage, t, isRTL } = useLanguage()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Basic Test Page</h1>

      <div className="space-y-4">
        <div>
          <p>Current language: {language}</p>
          <p>Direction: {isRTL ? "RTL" : "LTR"}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setLanguage("en")}>English</Button>
          <Button onClick={() => setLanguage("ar")}>Arabic</Button>
        </div>

        <div className="p-4 border rounded">
          <p>Translated text: {t("common.continue")}</p>
        </div>
      </div>
    </div>
  )
}
