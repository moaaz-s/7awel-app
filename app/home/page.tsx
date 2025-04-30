"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useData } from "@/context/DataContext"
import { TransactionCard } from "@/components/ui/transaction-card"
import { patterns, spacing } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { SendIcon, ReceiveIcon, ScanIcon } from "@/components/icons"
import { MainLayout } from "@/components/layouts/MainLayout"

function ActionButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Button
      variant="ghost"
      className="flex flex-col items-center justify-center gap-2 h-auto p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-[var(--radius)]"
      asChild
    >
      <Link href={href} className="flex flex-col items-center justify-center w-full">
        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/20 mb-1">
          <div className="text-primary">{icon}</div>
        </div>
        <span className="text-xs font-medium text-primary text-center w-full mt-0.5">{label}</span>
      </Link>
    </Button>
  )
}

export default function HomePage() {
  const { user, balance, transactions, formatCurrency, formatDate } = useData()
  const { t } = useLanguage()

  const displayName = user?.firstName ?? "User";

  const recentTransactions = transactions.slice(0, 4).map((tx) => ({
    ...tx,
    date: formatDate(tx.date),
  }))

  return (
    <MainLayout showBottomNav={true}>
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">{t("home.availableBalance")}</p>
        <h2 className="text-5xl font-bold text-foreground mb-8">{formatCurrency(balance?.available ?? 0)}</h2>

        <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-xs">
          <ActionButton href="/send" icon={<SendIcon className="h-6 w-6" />} label={t("home.send")} />
          <ActionButton href="/receive" icon={<ReceiveIcon className="h-6 w-6" />} label={t("home.receive")} />
          <ActionButton href="/scan" icon={<ScanIcon className="h-6 w-6" />} label={t("home.scan")} />
        </div>
      </div>

      <div className="mt-6 bg-card rounded-t-2xl p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">{t("home.recentTransactions")}</h3>
          <Link href="/transactions">
            <Button variant="link" className="text-primary text-sm">
              {t("common.seeAll")}
            </Button>
          </Link>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{t("home.noTransactions")}</p>
        )}
      </div>
    </MainLayout>
  )
}
