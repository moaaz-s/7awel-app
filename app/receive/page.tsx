"use client"

import { useState } from "react"
import { loadPlatform } from "@/platform"
import { useData } from "@/context/DataContext";
import type { QRData } from "@/types"; // Import QRData type
import { CopyButton } from "@/components/copy-button"
import { QRCodeDisplay } from "@/components/qr-code-display"
import { PageContainer } from "@/components/ui/page-container"
import { ButtonPrimary } from "@/components/ui/button-primary"
import { ShareButton } from "@/components/share-button"
import { spacing, typography } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"

// Simple SVG icons
const ShareIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
)

export default function ReceivePage() {
  const { user } = useData() // Get user from DataContext
  const { t } = useLanguage()
  // Replicate QR data generation logic
  const [qrData] = useState(() => {
    if (!user) return { qrString: "", data: null }; // Handle user being null initially
    const qrPayload: QRData = {
      userId: user.id,
      // No amount/reference for default receive QR
      timestamp: Date.now(),
    };
    const qrString = JSON.stringify(qrPayload);
    return { qrString, data: qrPayload };
  })

  // Generate a PayFlow ID from first/last name
  const payflowId = user ? `${user.firstName}.${user.lastName}`.toLowerCase() + "@payflow" : "user@payflow"

  // Generate a payment link
  const paymentLink = `https://payflow.app/pay/${payflowId}`

  return (
    <PageContainer title={t("transaction.receive")} backHref="/home">
      <div className="w-full max-w-md mx-auto space-y-6 text-center">
        <h2 className={typography.h2}>{t("qr.yourQrCode")}</h2>
        <p className={`${typography.small} ${typography.muted}`}>{t("qr.shareQr")}</p>

        <QRCodeDisplay value={qrData.qrString} size={256} className="mx-auto" />

        <div className={spacing.stack}>
          <p className={`${typography.small} font-medium`}>{t("qr.payflowId")}</p>
          <div className="flex items-center justify-center gap-2">
            <code className="bg-gray-100 px-3 py-1 rounded-md text-sm">{payflowId}</code>
            <CopyButton value={payflowId} />
          </div>
        </div>

        <div className={`pt-4 ${spacing.stack}`}>
          <ShareButton
            fullWidth
            url={paymentLink}
            title={t("qr.sharePaymentLink")}
            text={t("qr.defaultShareText", { link: paymentLink })}
          >
            {t("qr.sharePaymentLink")}
          </ShareButton>
          <ButtonPrimary variant="outline" fullWidth href="/request">
            {t("qr.requestAmount")}
          </ButtonPrimary>
        </div>
      </div>
    </PageContainer>
  )
}
