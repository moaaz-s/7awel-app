"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { BackIcon } from "@/components/icons"
import { useLanguage } from "@/context/LanguageContext"

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backAction?: () => void
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, backHref, backAction, action, className = "" }: PageHeaderProps) {
  const { isRTL } = useLanguage()

  return (
    <header className={`bg-white pb-8 ${className} ${isRTL ? "rtl-page-header" : ""}`}>
      <div className="flex items-center pb-4">
        {(backHref || backAction) && (
          <>
            {backHref ? (
              <Link href={backHref}>
                <BackIcon className="h-5 w-5" />
              </Link>
            ) : backAction && (
              <BackIcon className="h-5 w-5" onClick={backAction}/>
            )}
          </>
        )}

        {/* Right section (for action button) */}
        {action && (
          <div className="flex items-center">
            {action && <div>{action}</div>}
          </div>
        )}
      </div>
      <div className={cn("space-y-2", "")}>
        <h1 className={cn("text-2xl font-bold", "")}>{title}</h1>
        {subtitle && (
          <p className={cn("text-muted-foreground", "")}>
            {subtitle}
          </p>
        )}
      </div>
    </header>
  )
}
