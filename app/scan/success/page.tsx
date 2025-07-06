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
  const { t, locale } = useLanguage()
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

  // TODO: remove this and create a real scan flow 
  // // Create display props from details once
  const getTransactionDisplayProps = () => {
    if (!details) return null;
    
    const mockTransaction = { 
      amount: parseFloat(details.amount ?? "0"), 
      assetSymbol: "USD", 
      type: "transfer" as const, 
      createdAt: details.createdAt ?? new Date().toISOString(),
      id: "mock", // Required fields for schema
      reference: details.reference || "mock-ref",
      status: "completed" as const,
      updatedAt: details.createdAt ?? new Date().toISOString(),
      syncedAt: Date.now(),
    };
    
    return getDisplayProps(mockTransaction, {
      locale,
      returnComponents: true,
      amountComponentClassName: "font-medium",
      iconComponentSize: 16,
    });
  };

  const displayProps = getTransactionDisplayProps();

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
      icon={displayProps ? (
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${displayProps.colour.bg}`}>
          {displayProps.icon}
        </span>
      ) : (
        <CheckCircleIcon className="h-16 w-16 text-green-500" />
      )}
    >
      <ContentCard elevated={true} padding="sm">
        <div className="stack">
          <ContentCardRowItem label={t("transaction.amount")}>
            {displayProps?.amountComponent || details?.amount}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.recipient")}>
            {details?.recipient}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.date")}>
            {displayProps?.dateStr || details?.createdAt}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.reference")}>
            {details?.reference}
          </ContentCardRowItem>
        </div>
      </ContentCard>
    </SuccessLayout>
  )
}
