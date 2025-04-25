"use client"

import type { ReactNode } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"

interface RecapLayoutProps {
  children: ReactNode
  title: string
  backHref?: string
  confirmText: string
  onConfirm: () => void
  isLoading?: boolean
  error?: string | null
}

export function RecapLayout({
  children,
  title,
  backHref,
  confirmText,
  onConfirm,
  isLoading = false,
  error = null,
}: RecapLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PageHeader title={title} backHref={backHref} />

      <main className="flex-1 p-4">
        <div className="space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

          {children}

          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-violet-600 to-blue-600"
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </div>
      </main>
    </div>
  )
}
