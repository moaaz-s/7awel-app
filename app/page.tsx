"use client"

import { ButtonPrimary } from "@/components/ui/button-primary"
import { LanguageProvider } from "@/context/LanguageContext"
import { ClientLanguageWrapper } from "@/components/client-language-wrapper"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function SplashScreen() {
  return (
    <LanguageProvider>
      <ClientLanguageWrapper>
        {({ t }) => (
          <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-br from-violet-50 to-blue-100 p-6">
            <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center gap-8 text-center">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{t("appName")}</h1>
                <p className="text-muted-foreground">{t("appTagline")}</p>
              </div>
              <div className="w-full space-y-4">
                <ButtonPrimary href="/onboarding" fullWidth size="xl">
                  {t("common.getStarted")}
                </ButtonPrimary>
                <div className="text-center">
                  <ButtonPrimary href="/sign-in" variant="link">
                    {t("auth.signIn")}
                  </ButtonPrimary>
                </div>
                <div className="flex justify-center mt-4">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        )}
      </ClientLanguageWrapper>
    </LanguageProvider>
  )
}
