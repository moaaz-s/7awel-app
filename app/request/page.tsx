"use client"

import { useApp } from "@/context/AppContext"
import { QRCodeDisplay } from "@/components/qr-code-display"
import { CopyButton } from "@/components/copy-button"
import { PageContainer } from "@/components/ui/page-container"
import { CardContainer } from "@/components/ui/card-container"
import { ButtonPrimary } from "@/components/ui/button-primary"
import { spacing, typography } from "@/components/ui-config"
import { ShareButton } from "@/components/share-button"
import { useRequestMoneyFlow } from "@/hooks/use-transaction-flow"
import { AmountInput } from "@/components/amount-input"
import { useLanguage } from "@/context/LanguageContext"

export default function RequestPage() {
  const { t } = useLanguage()
  const { user } = useApp()
  const { amount, requestGenerated, qrData, handleAmountSubmit } = useRequestMoneyFlow()

  // Generate a payment request link
  const paymentRequestLink = qrData
    ? `https://payflow.app/pay/${user?.name.toLowerCase().replace(/\s+/g, ".")}?amount=${amount}`
    : ""

  return (
    <PageContainer title={t("request.title")} backHref="/receive">
      {!requestGenerated ? (
        <div className={spacing.section}>
          <div className="text-center">
            <h2 className={typography.h2}>{t("request.enterAmount")}</h2>
            <p className={`${typography.small} ${typography.muted}`}>{t("request.howMuch")}</p>
          </div>

          <AmountInput onSubmit={handleAmountSubmit} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className={spacing.stack}>
              <h2 className={typography.h2}>{t("request.paymentRequest")}</h2>
              <p className={`${typography.small} ${typography.muted}`}>
                {t("request.shareRequest")} ${amount}
              </p>
            </div>

            {qrData && <QRCodeDisplay value={qrData.qrString} size={256} className="mx-auto" />}

            <CardContainer className="bg-gray-50">
              <div className={spacing.stack}>
                <h3 className="font-medium">{t("request.requestLink")}</h3>
                <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-md">
                  <code className="text-xs truncate">{paymentRequestLink}</code>
                  <CopyButton value={paymentRequestLink} className="flex-shrink-0" />
                </div>
              </div>
            </CardContainer>

            <div className="pt-4 space-y-3">
              <ShareButton
                title={t("request.paymentRequest")}
                text={t("request.shareText", { amount: amount })}
                url={paymentRequestLink}
                fullWidth
              >
                {t("request.shareButton")}
              </ShareButton>

              <ButtonPrimary variant="outline" fullWidth href="/home">
                {t("request.backToHome")}
              </ButtonPrimary>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
