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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {icon && <div className="mx-auto">{icon}</div>}

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>

        {children}

        <div className="mt-6 space-y-3">
          <ShareButton
            title={shareTitle}
            text={shareText}
            url={shareUrl}
            fullWidth
            variant="outline"
            className="w-full"
          >
            {t(shareButtonLabel)}
          </ShareButton>

          <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-blue-600">
            <Link href={primaryActionHref}>{primaryActionText}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
