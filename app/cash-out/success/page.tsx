"use client"

import { useEffect, useState } from "react"
import { CopyButton } from "@/components/copy-button"
import { SuccessLayout } from "@/components/layouts/SuccessLayout"
import { CardContainer } from "@/components/ui/card-container"
import { spacing, typography } from "@/components/ui-config"
import { CheckCircleIcon } from "@/components/icons"
import { transactionService } from "@/services/transaction-service"
import { useLanguage } from "@/context/LanguageContext"

interface CashOutDetails {
  amount: string
  method: string
  fee: string
  date: string
  reference: string
}

export default function CashOutSuccessPage() {
  const [details, setDetails] = useState<CashOutDetails | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    // Retrieve cash out details from session storage
    // const storedDetails = transactionService.retrieveTransactionDetails<CashOutDetails>("cashOutDetails")
    // if (storedDetails) {
    //   setDetails(storedDetails)
    // }
  }, [])

  // Create share text based on transaction details
  const shareText = details
    ? t("cashOut.shareText", { amount: details.amount, method: details.method })
    : t("cashOut.shareTextDefault")

  return (
    <SuccessLayout
      title={t("cashOut.successTitle")}
      description={t("cashOut.successDesc")}
      primaryActionText={t("common.backHome")}
      primaryActionHref="/home"
      shareTitle={t("cashOut.shareTitle")}
      shareText={shareText}
      icon={<CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />}
    >
      <CardContainer>
        <div className={spacing.stack}>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("cashOut.amount")}</span>
            <span className="font-medium">${details?.amount || "0.00"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("cashOut.method")}</span>
            <span className="font-medium">{details?.method || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("cashOut.fee")}</span>
            <span className="font-medium">${details?.fee || "0.00"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("cashOut.date")}</span>
            <span className="font-medium">{details?.date || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className={typography.muted}>{t("cashOut.referenceCode")}</span>
            <span className="font-medium text-xs">{details?.reference || "WD123456789"}</span>
          </div>
        </div>
      </CardContainer>

      <CardContainer className="bg-gray-50 mt-4">
        <div className={spacing.stack}>
          <h3 className="font-medium">{t("cashOut.withdrawalInstructions")}</h3>
          <p className={`${typography.small} ${typography.muted}`}>
            {t("cashOut.withdrawalInstructionsDesc")}
          </p>
          <div className="flex items-center justify-between bg-white p-3 rounded-md">
            <div className="font-mono text-lg font-bold">{details?.reference || "WD123456789"}</div>
            <CopyButton value={details?.reference || "WD123456789"} />
          </div>
        </div>
      </CardContainer>
    </SuccessLayout>
  )
}
