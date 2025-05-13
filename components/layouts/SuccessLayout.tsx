"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShareButton } from "@/components/share-button"
import { useLanguage } from "@/context/LanguageContext"

interface SuccessLayoutProps {
  children: ReactNode
  title: string
  description?: string
  primaryActionText: string
  primaryActionHref: string
  shareTitle?: string
  shareText?: string
  shareUrl?: string
  shareButtonLabel?: string
  icon?: ReactNode
}

export function SuccessLayout({
  children,
  title,
  description,
  primaryActionText,
  primaryActionHref,
  shareTitle = "Payment Receipt",
  shareText = "Check out my transaction details",
  shareUrl,
  shareButtonLabel = "transaction.shareReceipt",
  icon,
}: SuccessLayoutProps) {
  const { t } = useLanguage()
  return (
    <div className="flex-1 flex min-h-screen flex-col items-center justify-between text-center w-full p-4">
      {icon && <div className="mx-auto">{icon}</div>}

      <div className="w-full">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>

        {children}
      </div>

      <div className="w-full">
        <ShareButton
          title={shareTitle}
          text={shareText}
          url={shareUrl}
          fullWidth
          variant="white"
        >
          {t(shareButtonLabel)}
        </ShareButton>

        <Button variant={"link"} href={primaryActionHref} fullWidth shadow={'none'}>
          {primaryActionText}
        </Button>
      </div>
    </div>
  )
}
