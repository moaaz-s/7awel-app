"use client"

import { useEffect, useState } from "react"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { CardContainer } from "@/components/ui/card-container"
import { spacing, typography } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { CheckCircleIcon } from "@/components/icons"
import { transactionService } from "@/services/transaction-service"

interface RequestDetails {
  amount: string
  recipient: string
  date: string
  reference: string
}

export default function RequestSuccessPage() {
  const { t } = useLanguage()
  const [details, setDetails] = useState<RequestDetails | null>(null)

  useEffect(() => {
    // Retrieve request details from session storage
    const storedDetails = transactionService.retrieveTransactionDetails<RequestDetails>("requestDetails")
    if (storedDetails) {
      setDetails(storedDetails)
    }
  }, [])

  // Create share text based on transaction details
  const shareText = details
    ? `I've requested $${details.amount} via PayFlow. Please send payment using reference: ${details.reference}`
    : "I've requested money via PayFlow"

  return (
    <SuccessLayout
      title={t("Request Sent!")}
      description={t("Your payment request has been sent successfully.")}
      primaryActionText={t("Back to Home")}
      primaryActionHref="/home"
      shareTitle="Payment Request"
      shareText={shareText}
      icon={<CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />}
    >
      <CardContainer>
        <div className={spacing.stack}>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.amount")}</span>
            <span className="font-medium">${details?.amount || "50.00"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("Recipient")}</span>
            <span className="font-medium">{details?.recipient || "Sarah Johnson"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.date")}</span>
            <span className="font-medium">{details?.date || "April 11, 2025"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.reference")}</span>
            <span className="font-medium text-xs">{details?.reference || "REQ123456789"}</span>
          </div>
        </div>
      </CardContainer>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700 mt-4">
        <p className="text-sm">
          {t(
            "The recipient will be notified about your request. You'll receive a notification when they complete the payment.",
          )}
        </p>
      </div>
    </SuccessLayout>
  )
}
