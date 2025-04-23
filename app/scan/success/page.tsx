"use client"

import { useEffect, useState } from "react"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { CardContainer } from "@/components/ui/card-container"
import { spacing, typography } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { CheckCircleIcon } from "@/components/icons/ui-icons"

interface ScanPaymentDetails {
  amount: string
  recipient: string
  date: string
  reference: string
}

export default function ScanSuccessPage() {
  const { t } = useLanguage()
  const [details, setDetails] = useState<ScanPaymentDetails | null>(null)

  useEffect(() => {
    // Retrieve scan payment details from sessionStorage
    const storedDetails = sessionStorage.getItem("scanPaymentDetails")
    if (storedDetails) {
      setDetails(JSON.parse(storedDetails))
      // Clear the data after retrieving
      sessionStorage.removeItem("scanPaymentDetails")
    }
  }, [])

  return (
    <SuccessLayout
      title={t("Payment Successful!")}
      description={t("Your payment has been processed successfully.")}
      primaryActionText={t("Back to Home")}
      primaryActionHref="/home"
      secondaryActionText={t("Share Receipt")}
      secondaryActionOnClick={() => {}}
      icon={<CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />}
    >
      <CardContainer>
        <div className={spacing.stack}>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.amount")}</span>
            <span className="font-medium">${details?.amount || "25.00"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("Paid to")}</span>
            <span className="font-medium">{details?.recipient || "Coffee Shop"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.date")}</span>
            <span className="font-medium">{details?.date || "April 11, 2025"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("transaction.reference")}</span>
            <span className="font-medium text-xs">{details?.reference || "TXN123456789"}</span>
          </div>
        </div>
      </CardContainer>
    </SuccessLayout>
  )
}
