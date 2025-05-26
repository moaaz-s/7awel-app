"use client"

import { useSendTransaction } from "@/context/transactions/SendTransactionContext"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { ContentCard } from "@/components/ui/cards/content-card"
import { ContentCardRowItem } from "@/components/ui/cards/content-card-row-item"
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useLanguage } from "@/context/LanguageContext"
import { spacing } from "@/components/ui-config"

interface SendMoneyDetails {
  amount: string
  recipient: string
  date: string
  reference: string
  note?: string
}

export default function TransactionSuccessPage() {
  const { details } = useSendTransaction()
  const { t } = useLanguage()

  // Create share text based on transaction details
  const shareText = details
    ? t("transaction.sentShareText", { amount: details.amount, recipient: details.recipient })
    : ""

  return (
    <SuccessLayout
      title={t("sendSuccess.title")}
      // description={t("sendSuccess.description")}
      primaryActionText={t("common.backHome")}
      primaryActionHref="/home"
      shareTitle={t("transaction.transactionDetails")}
      shareText={shareText}
      shareButtonLabel={t("transaction.shareReceipt")}
      icon={
        <DotLottieReact
          src="/animations/tx success.lottie"
          autoplay={true}
          loop={true}
          className="h-48 w-48 mx-auto"
        />
      }
    >
      <ContentCard elevated={true}>
        <div className={spacing.stack_sm}>
          <ContentCardRowItem label={t("sendSuccess.amount")}>
            ${details?.amount}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("sendSuccess.to")}>
            {details?.recipient}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("sendSuccess.date")}>
            {details?.date}
          </ContentCardRowItem>
          
          <ContentCardRowItem label={t("sendSuccess.transactionId")}>
            <span className="text-ellipsis">{details?.reference}</span>
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
