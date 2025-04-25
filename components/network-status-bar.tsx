"use client"

import { useNetwork } from "@/hooks/use-network"
import { useLanguage } from "@/context/LanguageContext"

export function NetworkStatusBar() {
  const online = useNetwork()
  const { t } = useLanguage()

  if (online) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-1 text-xs shadow-md animate-slide-down">
      {t("common.offline")}
    </div>
  )
}
