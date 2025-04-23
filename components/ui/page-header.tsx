"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon } from "@/components/icons/navigation-icons"
import { useLanguage } from "@/context/LanguageContext"

interface PageHeaderProps {
  title: string
  backHref?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, backHref, action, className = "" }: PageHeaderProps) {
  const { isRTL } = useLanguage()

  return (
    <header className={`bg-white p-4 flex items-center border-b ${className} ${isRTL ? "rtl-page-header" : ""}`}>
      {backHref && (
        <Button variant="ghost" size="icon" asChild className={isRTL ? "rtl-mr-2" : "mr-2"}>
          <Link href={backHref}>
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
        </Button>
      )}
      {action && <div className={isRTL ? "mr-auto" : "ml-auto"}>{action}</div>}
      
      <h1 className="text-lg font-medium">{title}</h1>
      
    </header>
  )
}
