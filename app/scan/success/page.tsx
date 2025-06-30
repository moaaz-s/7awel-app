"use client"

import { useEffect, useState } from "react"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { spacing } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { CheckCircleIcon } from "@/components/icons/ui-icons"
import { getDisplayProps } from "@/utils/transaction-view-ui"
import { ContentCard } from "@/components/ui/cards/content-card"
import { ContentCardRowItem } from "@/components/ui/cards/content-card-row-item"

interface ScanPaymentDetails {
  amount: string
  recipient: string
  createdAt: string
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
      icon={(() => {
           const tx = { amount: parseFloat(details?.amount ?? "0"), assetSymbol: "USD", type: "transfer", createdAt: details?.createdAt ?? new Date().toISOString() } as any;
           const { direction, icon, colour } = getDisplayProps(tx);
           return (
             <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${colour.bg}`}> 
               {icon}
             </span>
           );
        })()}
    >
      <ContentCard elevated={true} padding="sm">
        <div className="stack">
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
          
          <ContentCardRowItem label={t("transaction.date")}>
            {(() => { if(!details) return null; const tx = { createdAt: details.createdAt, amount:0, assetSymbol:"USD", type:"transfer" } as any; const { dateStr } = getDisplayProps(tx); return dateStr; })()}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.reference")}>
            {details?.reference}
          </ContentCardRowItem>
        </div>
      </ContentCard>
    </SuccessLayout>
  )
}
