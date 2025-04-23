"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RecapLayout } from "@/components/layouts/RecapLayout"
import { CardContainer } from "@/components/ui/card-container"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-field"
import { spacing, typography } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { useSendMoneyFlow } from "@/hooks/use-transaction-flow"

export default function SendConfirmationPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { state, error, isLoading, setNote, handleConfirm } = useSendMoneyFlow()

  // Redirect if no recipient or amount in flow state
  useEffect(() => {
    if (!state.recipient || !state.amount) {
      router.push("/send")
    }
  }, [state, router])

  if (!state.recipient || !state.amount) {
    return null // Will redirect in useEffect
  }

  return (
    <RecapLayout
      title={t("transaction.confirmPayment")}
      backHref="/send"
      confirmText={t("transaction.send", { amount: state.amount })}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      error={error}
    >
      <CardContainer header={<h3 className="text-center text-lg font-medium">{t("transaction.paymentDetails")}</h3>}>
        <div className={spacing.stack}>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.to")}</span>
            <span className="font-medium">{state.recipient.name}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.amount")}</span>
            <span className="font-medium">${state.amount}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.fee")}</span>
            <span className="font-medium">$0.00</span>
          </div>
          <div className="border-t pt-4 flex justify-between">
            <span className="font-medium">{t("transaction.total")}</span>
            <span className="font-bold">${state.amount}</span>
          </div>
        </div>
      </CardContainer>

      <FormField label={t("transaction.addNote")} htmlFor="note">
        <Input
          id="note"
          placeholder={t("transaction.whatFor")}
          value={state.note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>
    </RecapLayout>
  )
}
