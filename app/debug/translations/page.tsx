"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { PageContainer } from "@/components/layouts/page-container"
import { en } from "@/locales/en"
import { ar } from "@/locales/ar"

export default function TranslationDebugPage() {
  const { language, setLanguage, t } = useLanguage()

  // Function to flatten nested translation objects
  const flattenTranslations = (obj: any, prefix = ""): Record<string, string> => {
    return Object.keys(obj).reduce((acc: Record<string, string>, k) => {
      const pre = prefix.length ? `${prefix}.` : ""
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flattenTranslations(obj[k], `${pre}${k}`))
      } else {
        acc[`${pre}${k}`] = obj[k]
      }
      return acc
    }, {})
  }

  const enFlat = flattenTranslations(en)
  const arFlat = flattenTranslations(ar)

  // Find missing translations
  const missingInArabic = Object.keys(enFlat).filter((key) => {
    const keyParts = key.split(".")
    let current = ar as any
    for (const part of keyParts) {
      if (current[part] === undefined) return true
      current = current[part]
    }
    return false
  })

  return (
    <PageContainer title="Translation Debug" backHref="/home">
      <div className="space-y-6 p-4">
        <div className="flex gap-4">
          <Button onClick={() => setLanguage("en")} variant={language === "en" ? "default" : "outline"}>
            English
          </Button>
          <Button onClick={() => setLanguage("ar")} variant={language === "ar" ? "default" : "outline"}>
            العربية
          </Button>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-medium mb-4">Missing Translations in Arabic</h2>
          {missingInArabic.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {missingInArabic.map((key) => (
                <li key={key} className="text-red-500">
                  {key}: {enFlat[key]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-green-500">No missing translations!</p>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-medium mb-4">Sample Translations</h2>
          <div className="space-y-2">
            <div className="p-2 border rounded">
              <div className="text-sm text-muted-foreground">common.continue</div>
              <div>{t("common.continue")}</div>
            </div>
            <div className="p-2 border rounded">
              <div className="text-sm text-muted-foreground">transaction.send</div>
              <div>{t("transaction.send")}</div>
            </div>
            <div className="p-2 border rounded">
              <div className="text-sm text-muted-foreground">profile.language</div>
              <div>{t("profile.language")}</div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
