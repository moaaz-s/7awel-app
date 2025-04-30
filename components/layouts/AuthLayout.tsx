"use client"

import type { ReactNode } from "react"
import { PageHeader } from "@/components/ui/page-header"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  backHref?: string
  backAction?: () => void
  footerContent?: ReactNode
}

export function AuthLayout({ children, title, subtitle, backHref, backAction, footerContent }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white p-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backAction={backAction}
        action={undefined}
      />

      <main className="flex-1">{children}</main>

      {footerContent && <footer className="p-4 text-center text-sm text-muted-foreground">{footerContent}</footer>}
    </div>
  )
}
