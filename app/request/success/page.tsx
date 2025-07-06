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
  const { t, locale } = useLanguage()
  const [details, setDetails] = useState<RequestDetails | null>(null)

  useEffect(() => {
    // // Retrieve request details from session storage
    // const storedDetails = transactionService.retrieveTransactionDetails<RequestDetails>("requestDetails")
    // if (storedDetails) {
    //   setDetails(storedDetails)
    // }
  }, [])

  // TODO: Remove this and create a real request flow 
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
      icon={displayProps ? (
        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${displayProps.colour.bg}`}>
          {displayProps.icon}
        </span>
      ) : (
        <CheckCircleIcon className="h-16 w-16 text-green-500" />
      )}
    >
      <ContentCard elevated={true} padding="sm">
        <div className={spacing.stack}>
          <ContentCardRowItem label={t("transaction.amount")}>
            {displayProps?.amountComponent || details?.amount}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.recipient")}>
            {details?.recipient}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("transaction.createdAt")}>
            {displayProps?.dateStr || details?.createdAt}
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
