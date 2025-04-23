"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RecapLayout } from "@/components/layouts/RecapLayout"
import { CardContainer } from "@/components/ui/card-container"
import { spacing, typography } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { useCashOutFlow } from "@/hooks/use-transaction-flow"

export default function CashOutConfirmationPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { state, error, isLoading, handleConfirm, calculateFee, calculateTotal } = useCashOutFlow()

  // Redirect if no method or amount in flow state
  useEffect(() => {
    if (!state.method || !state.amount) {
      router.push("/cash-out")
    }
  }, [state, router])

  if (!state.method || !state.amount) {
    return null // Will redirect in useEffect
  }

  return (
    <RecapLayout
      title={t("cashOut.confirmCashOut")}
      backHref="/cash-out"
      confirmText={t("cashOut.confirmButton")}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      error={error}
    >
      <CardContainer header={<h3 className="text-center text-lg font-medium">{t("cashOut.title")}</h3>}>
        <div className={spacing.stack}>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("cashOut.method")}</span>
            <span className="font-medium">{state.method.name}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("cashOut.amount")}</span>
            <span className="font-medium">${state.amount}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>
              {t("cashOut.fee")} ({state.method.fee})
            </span>
            <span className="font-medium">${calculateFee()}</span>
          </div>
          <div className="border-t pt-4 flex justify-between">
            <span className="font-medium">{t("cashOut.total")}</span>
            <span className="font-bold">${calculateTotal()}</span>
          </div>
        </div>
      </CardContainer>
    </RecapLayout>
  )
}
