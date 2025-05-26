"use client"

import type { ReactNode } from "react"
import { PageHeader } from "@/components/layouts/page-header"
import { Button } from "@/components/ui/button"

interface RecapLayoutProps {
  children: ReactNode
  title: string
  backHref?: string
  onBackClick?: () => void
  confirmText: string
  onConfirm: () => void
  isLoading?: boolean
  error?: string | null
}

export function RecapLayout({
  children,
  title,
  backHref,
  onBackClick,
  confirmText,
  onConfirm,
  isLoading = false,
  error = null,
}: RecapLayoutProps) {
  return (
    <div className="flex-1 flex min-h-screen flex-col p-4">
      <PageHeader title={title} backHref={backHref} backAction={onBackClick} />

      <div className="flex-1">
        <div className="space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
          {children}
        </div>
      </div>

      <Button
        onClick={onConfirm}
        variant="gradient"
        disabled={isLoading}
        isLoading={isLoading}
        size="lg"
        fullWidth>
        {confirmText}
      </Button>
    </div>
  )
}
