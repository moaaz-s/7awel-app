"use client"

import { useEffect, useState } from "react"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { spacing } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { CheckCircleIcon } from "@/components/icons/ui-icons"
import { getDisplayProps } from "@/utils/transaction-view-ui"
import { ContentCard } from "@/components/ui/cards/content-card"
import { ContentCardRowItem } from "@/components/ui/cards/content-card-row-item"
import { transactionService } from "@/services/transaction-service"

interface RequestDetails {
  /** ISO timestamp of when the request was created */
  createdAt: string
  amount: string
  recipient: string
  reference: string
}

export default function RequestSuccessPage() {
  const { t } = useLanguage()
  const [details, setDetails] = useState<RequestDetails | null>(null)

  useEffect(() => {
    // // Retrieve request details from session storage
    // const storedDetails = transactionService.retrieveTransactionDetails<RequestDetails>("requestDetails")
    // if (storedDetails) {
    //   setDetails(storedDetails)
    // }
  }, [])

  // Create share text based on transaction details
  const shareText = details
    ? `I've requested $${details.amount} via PayFlow. Please send payment using reference: ${details.reference}`
    : "I've requested money via PayFlow"

  return (
    <SuccessLayout
      title={t("Request.sent!")}
      description={t("request.sentDescription")}
      primaryActionText={t("common.backHome")}
      primaryActionHref="/home"
      shareTitle="Payment Request"
      shareText={shareText}
      icon={(() => {
           const tx = { amount: parseFloat(details?.amount ?? "0"), assetSymbol: "USD", type: "transfer", createdAt: details?.createdAt ?? new Date().toISOString() } as any;
           const { colour, icon } = getDisplayProps(tx);
           return (
             <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${colour.bg}`}>
               {icon}
             </span>
           );
        })()}
    >
      <ContentCard elevated={true} padding="sm">
        <div className={spacing.stack}>
          <ContentCardRowItem label={t("transaction.amount")}>
            {(() => {
              if(!details) return null;
              const tx = { amount: parseFloat(details.amount ?? "0"), assetSymbol: "USD", type: "transfer", createdAt: details.createdAt } as any;
              const { amountStr } = getDisplayProps(tx);
              return amountStr;
            })() }
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.recipient")}>
            {details?.recipient}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.createdAt")}>
            {(() => {
              if(!details) return null;
              const tx = { createdAt: details.createdAt, amount: 0, assetSymbol:"USD", type:"transfer" } as any;
              const { dateStr } = getDisplayProps(tx);
              return dateStr;
            })()}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.reference")}>
            {details?.reference}
          </ContentCardRowItem>
        </div>
      </ContentCard>

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
