"use client"

import { useEffect, useState } from "react"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { ContentCard } from "@/components/ui/content-card"
import { ContentCardRowItem } from "@/components/ui/content-card-row-item"
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
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
      icon={
        <DotLottieReact
          src="/animations/tx success.lottie"
          autoplay={true}
          loop={false}
          className="h-48 w-48 mx-auto"
        />
      }
    >
      <ContentCard elevated={true}>
        <div className="p-4 space-y-4">
          <ContentCardRowItem label={t("sendSuccess.amount")}>
            ${details?.amount || "50.00"}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("sendSuccess.to")}>
            {details?.recipient || "Sarah Johnson"}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("sendSuccess.date")}>
            {details?.date || "April 11, 2025"}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("sendSuccess.transactionId")}>
            <span className="text-xs">{details?.reference || "TXN123456789"}</span>
          </ContentCardRowItem>
          
          {details?.note && (
            <ContentCardRowItem label={t("sendSuccess.note")}>
              {details.note}
            </ContentCardRowItem>
          )}
        </div>
      </ContentCard>
    </SuccessLayout>
  )
}
