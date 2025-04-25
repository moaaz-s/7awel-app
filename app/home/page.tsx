"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useData } from "@/context/DataContext"
import { TransactionCard } from "@/components/ui/transaction-card"
import { patterns, spacing } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { HomeIcon, CashOutIcon, PointsIcon, SendIcon, ReceiveIcon, ScanIcon, GlobeIcon } from "@/components/icons"

// Action button component
function ActionButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Button
      variant="ghost"
      className="flex flex-col items-center justify-center gap-2 h-auto py-2 text-white hover:bg-white/10 hover:text-white"
      asChild
    >
      <Link href={href} className="flex flex-col items-center justify-center w-full">
        <div className="h-16 w-16 flex items-center justify-center rounded-full bg-white/20">
          <div className="text-white">{icon}</div>
        </div>
        <span className="text-sm font-medium text-white text-center w-full mt-1">{label}</span>
      </Link>
    </Button>
  )
}

// Navigation button component
function NavButton({
  href,
  icon,
  label,
  active = false,
}: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Button
      variant="ghost"
      className={`flex flex-1 flex-col items-center justify-center gap-1 h-16 rounded-none ${
        active ? "text-violet-600" : "text-gray-500"
      } hover:bg-gray-50 w-1/3`}
      asChild
    >
      <Link href={href} className="flex flex-col items-center justify-center w-full py-3">
        {icon}
        <span className="text-xs mt-1">{label}</span>
      </Link>
    </Button>
  )
}

export default function HomePage() {
  // Use the app context
  const { user, balance, transactions, formatCurrency, formatDate } = useData()
  const { t } = useLanguage()

  // Determine display name with a simple fallback for the welcome message
  const displayName = user?.firstName ?? "User";

  // Get only the most recent 4 transactions
  const recentTransactions = transactions.slice(0, 4).map((tx) => ({
    ...tx,
    date: formatDate(tx.date),
  }))

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-violet-500 to-blue-500">
      <main className="flex-1 pb-16">
        {/* Header */}
        <header className={`${spacing.container} py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {/* Use pre-calculated displayName */}
            <h1 className="text-lg font-medium text-white">{t("home.welcome", { name: displayName })}</h1>
          </div>
          <Link href="/profile">
            <Avatar className={patterns.avatar.sm}>
              <AvatarFallback className="bg-white/20 text-white">{user?.avatar}</AvatarFallback>
            </Avatar>
          </Link>
        </header>

        {/* Balance Section - Large and Centered */}
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <p className="text-sm text-white/80 mb-2">{t("home.availableBalance")}</p>
          {/* Pass the numerical amount from balance, defaulting to 0 if null */}
          {/* Use 'available' property from WalletBalance type */} 
          <h2 className="text-5xl font-bold text-white mb-8">{formatCurrency(balance?.available ?? 0)}</h2>

          {/* Quick Actions - Horizontal Row with only 3 actions - BIGGER ICONS */}
          <div className="grid grid-cols-3 gap-8 mt-4 w-full max-w-xs">
            <ActionButton href="/send" icon={<SendIcon className="h-8 w-8" />} label={t("home.send")} />
            <ActionButton href="/receive" icon={<ReceiveIcon className="h-8 w-8" />} label={t("home.receive")} />
            <ActionButton href="/scan" icon={<ScanIcon className="h-8 w-8" />} label={t("home.scan")} />
          </div>
        </div>

        {/* Recent Transactions - White Card */}
        <div className="mt-6 bg-white rounded-t-3xl flex-1 pb-16">
          <div className={`py-5 ${spacing.container}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg">{t("home.recentTransactions")}</h3>
              <Link href="/transactions" className="text-sm text-violet-600 pr-1">
                {t("home.seeAll")}
              </Link>
            </div>
            <div className={spacing.stack}>
              {recentTransactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Updated with modern styling */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg">
        <div className="flex items-center justify-around">
          <NavButton href="/home" icon={<HomeIcon className="h-6 w-6" />} label={t("home.home")} active={true} />
          <NavButton href="/cash-out" icon={<CashOutIcon className="h-6 w-6" />} label={t("home.cashOut")} />
          <NavButton href="/points" icon={<PointsIcon className="h-6 w-6" />} label={t("home.points")} />
          <NavButton href="/profile/language" icon={<GlobeIcon className="h-6 w-6" />} label={t("profile.language")} />
        </div>
      </div>
    </div>
  )
}
