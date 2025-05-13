"use client"

import { useState } from "react"
import { loadPlatform } from "@/platform"
import { useData } from "@/context/DataContext";
import type { QRData } from "@/types"; // Import QRData type
import { CopyButton } from "@/components/copy-button"
import { QRCodeDisplay } from "@/components/qr-code-display"
import { PageContainer } from "@/components/ui/page-container"
import { ShareButton } from "@/components/share-button"
import { spacing, typography } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button";

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
  const PersonalId = user ? `${user.firstName}.${user.lastName}`.toLowerCase() + "@7awel" : "user@7awel"

  // Generate a payment link
  const paymentLink = `https://7awel.money/pay/${PersonalId}`

  return (
    <PageContainer title={t("transaction.receive")} backHref="/home">
      <div className={`flex-1 flex flex-col justify-between w-full max-w-md mx-auto text-center`}>

        <div className={spacing.stack_sm}>
          <h2 className={typography.h2}>{t("qr.yourQrCode")}</h2>
          <p className={`${typography.small} ${typography.muted}`}>{t("qr.shareQr")}</p>
        </div>

        <div className={`${spacing.stack_sm} flex flex-col`}>
          <QRCodeDisplay value={qrData.qrString} size={256} className="mx-auto" />
          
          <div className="flex items-center justify-center gap-2">
            <code className="bg-gray-100 px-3 py-1 rounded-md text-sm">{PersonalId}</code>
            <CopyButton value={PersonalId} />
          </div>
        </div>

        <div className={`pt-4 ${spacing.stack_sm}`}>
          <ShareButton
            fullWidth
            variant="white"
            url={paymentLink}
            title={t("qr.sharePaymentLink")}
            text={t("qr.defaultShareText", { link: paymentLink })}
            shadow="none"
          >
            {t("qr.sharePaymentLink")}
          </ShareButton>
          <Button variant="outline" fullWidth href="/request" shadow="none">
            {t("qr.requestAmount")}
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
