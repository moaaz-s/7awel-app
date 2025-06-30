"use client"

import { useData } from "@/context/DataContext-v2";
import { QRCodeDisplay } from "@/components/qr-code-display"
import { CopyButton } from "@/components/copy-button"
import { PageContainer } from "@/components/layouts/page-container"
import { spacing, typography } from "@/components/ui-config"
import { ShareButton } from "@/components/share-button"
import { useRequestMoneyFlow } from "@/hooks/use-transaction-flow"
import { AmountInput } from "@/components/amount-input"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button";

export default function RequestPage() {
  const { t } = useLanguage()
  const { user } = useData()
  const { amount, requestGenerated, qrData, handleAmountSubmit } = useRequestMoneyFlow()

  // Generate a payment request link
  const paymentRequestLink = qrData
    ? `https://payflow.app/pay/${(user?.firstName + "." + user?.lastName).toLowerCase()}?amount=${amount}`
    : ""

  return (
    <PageContainer title={""} backHref="/receive">
      <div className="flex flex-col flex-1 items-center justify-between min-h-full max-w-full">
        {!requestGenerated ? (
          <>
            <div className="text-center">
              <h2 className={typography.h1}>{t("request.enterAmount")}</h2>
              <p className={`${typography.small} ${typography.muted}`}>{t("request.howMuch")}</p>
            </div>

            <AmountInput onSubmit={handleAmountSubmit} />
          </>
        ) : (
          <>
            <>
              <div className={`text-center ${spacing.stack_sm}`}>
                <h2 className={typography.h1}>{t("request.paymentRequest")}</h2>
                <p className={`${typography.small} ${typography.muted}`}>
                  {t("request.shareRequest")} ${amount}
                </p>
              </div>

              <div className={`w-full max-w-md text-center ${spacing.stack_sm}`} dir="rtl">
                {qrData && <QRCodeDisplay value={qrData.qrString} size={256} className="mx-auto" />}

                <div className="flex items-center justify-center gap-2 rounded-md">
                  <code className="text-xs truncate text-ellipsis">{paymentRequestLink}</code>
                  <CopyButton value={paymentRequestLink} className="flex-shrink-0" />
                </div>
              </div>

              <div className="w-full pt-4 space-y-1">
                <ShareButton
                  variant="white"
                  title={t("transaction.requestShareTitle")}
                  text={t("transaction.requestShareText", { amount: amount })}
                  url={paymentRequestLink}
                  fullWidth
                >
                  {t("request.shareButton")}
                </ShareButton>

                <Button variant="link" fullWidth shadow="none" href="/home">
                  {t("common.backHome")}
                </Button>
              </div>
            </>
          </>
        )}
      </div>
    </PageContainer>
  )
}
