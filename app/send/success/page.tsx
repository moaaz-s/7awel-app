"use client"

import { useEffect, useState } from "react"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { CardContainer } from "@/components/ui/card-container"
import { spacing, typography } from "@/components/ui-config"
import { CheckCircleIcon } from "@/components/icons"
import { transactionService } from "@/services/transaction-service"
import { useLanguage } from "@/context/LanguageContext"

interface SendMoneyDetails {
  amount: string
  recipient: string
  date: string
  reference: string
  note?: string
}

export default function TransactionSuccessPage() {
  const [details, setDetails] = useState<SendMoneyDetails | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    // Retrieve transaction details from session storage
    const storedDetails = transactionService.retrieveTransactionDetails<SendMoneyDetails>("sendMoneyDetails")
    if (storedDetails) {
      setDetails(storedDetails)
    }
  }, [])

  // Create share text based on transaction details
  const shareText = details
    ? t("sendSuccess.shareText", { amount: details.amount, recipient: details.recipient })
    : t("sendSuccess.shareTextDefault")

  return (
    <SuccessLayout
      title={t("sendSuccess.title")}
      description={t("sendSuccess.description")}
      primaryActionText={t("common.backToHome")}
      primaryActionHref="/home"
      shareTitle={t("transaction.transactionDetails")}
      shareText={shareText}
      shareButtonLabel={t("transaction.shareReceipt")}
      icon={<CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />}
    >
      <CardContainer>
        <div className={spacing.stack}>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("sendSuccess.amount")}</span>
            <span className="font-medium">${details?.amount || "50.00"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("sendSuccess.to")}</span>
            <span className="font-medium">{details?.recipient || "Sarah Johnson"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("sendSuccess.date")}</span>
            <span className="font-medium">{details?.date || "April 11, 2025"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("sendSuccess.transactionId")}</span>
            <span className="font-medium text-xs">{details?.reference || "TXN123456789"}</span>
          </div>
          {details?.note && (
            <div className="flex justify-between">
              <span className={typography.muted}>{t("sendSuccess.note")}</span>
              <span>{details.note}</span>
            </div>
          )}
        </div>
      </CardContainer>
    </SuccessLayout>
  )
}
