"use client"

import Link from "next/link"
import Image from "next/image"
import { CashOutIcon, HistoryIcon } from "@/components/icons" 
import { useLanguage } from "@/context/LanguageContext"

export function BottomNavigation() {
  const { t } = useLanguage()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        <Link href="/" className="group flex flex-col items-center justify-center text-center">
          <Image
            src="/brand/7awel - lettermark.svg"
            alt="Home"
            width={24}
            height={24}
            className="h-6 w-6 text-primary"
          />
          <span className="mt-1 text-xs font-medium text-primary">{t("home.home")}</span>
        </Link>
        <Link href="/transactions" className="group flex flex-col items-center justify-center text-center">
          <div className="h-6 w-6 text-muted-foreground">
            <HistoryIcon className="h-6 w-6" />
          </div>
          <span className="mt-1 text-xs text-muted-foreground">{t("transaction.transactions")}</span>
        </Link>
        <Link href="/cash-out" className="group flex flex-col items-center justify-center text-center">
          <div className="h-6 w-6 text-muted-foreground">
            <CashOutIcon className="h-6 w-6" />
          </div>
          <span className="mt-1 text-xs text-muted-foreground">{t("cashOut.title")}</span>
        </Link>
      </div>
    </nav>
  )
}
