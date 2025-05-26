"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useLanguage, type Language } from "@/context/LanguageContext"
import { PageContainer } from "@/components/layouts/page-container"

export default function LanguagePage() {
  const { language, setLanguage, t } = useLanguage()

  // Define supported languages
  const languages = [
    { code: "en" as Language, name: "English", region: "United States", nativeName: "English" },
    { code: "ar" as Language, name: "Arabic", region: "Arabic", nativeName: "العربية" },
  ]

  return (
    <PageContainer title={t("profile.language")} backHref="/profile">
      <div className="space-y-6">
        <div className="bg-white rounded-lg border overflow-hidden">
          <RadioGroup
            value={language}
            onValueChange={(value) => setLanguage(value as Language)}
            className="divide-y"
          >
            {languages.map((lang) => (
              <div key={lang.code} className="flex items-center space-x-2 p-4">
                <RadioGroupItem value={lang.code} id={lang.code} className="sr-only" />
                <Label htmlFor={lang.code} className="flex flex-1 items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-medium">{lang.nativeName}</span>
                    {/* <p className="text-sm text-muted-foreground">{lang.name}</p> */}
                  </div>
                  {language === lang.code && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 text-violet-600"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>
    </PageContainer>
  )
}
