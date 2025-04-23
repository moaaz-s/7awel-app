"use client"

import type { ReactNode } from "react"
import { PageHeader } from "@/components/ui/page-header"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  backHref?: string
  backAction?: () => void
  footerContent?: ReactNode
}

export function AuthLayout({ children, title, backHref, backAction, footerContent }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PageHeader
        title={title}
        backHref={backHref}
        action={
          backAction ? (
            <button onClick={backAction} className="text-sm text-violet-600">
              Back
            </button>
          ) : undefined
        }
      />

      <main className="flex-1 p-4">{children}</main>

      {footerContent && <footer className="p-4 text-center text-sm text-muted-foreground">{footerContent}</footer>}
    </div>
  )
}
