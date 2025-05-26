"use client"

import { useEffect, useState } from "react"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { spacing } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { CheckCircleIcon } from "@/components/icons/ui-icons"
import { ContentCard } from "@/components/ui/cards/content-card"
import { ContentCardRowItem } from "@/components/ui/cards/content-card-row-item"

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
      title={t("sendSuccess.title")}
      description={t("sendSuccess.description")}
      primaryActionText={t("common.backHome")}
      primaryActionHref="/home"
      shareTitle={t("transaction.transactionDetails")}
      shareText={t("transaction.shareReceipt")}
      shareUrl={"/something/something"}
      shareButtonLabel={t("transaction.shareReceipt")}
      icon={<CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />}
    >
      <ContentCard elevated={true} padding="sm">
        <div className={spacing.stack}>
          <ContentCardRowItem label={t("transaction.amount")}>
            ${details?.amount}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.recipient")}>
            {details?.recipient}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.date")}>
            {details?.date}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.reference")}>
            {details?.reference}
          </ContentCardRowItem>
        </div>
      </ContentCard>
    </SuccessLayout>
  )
}
