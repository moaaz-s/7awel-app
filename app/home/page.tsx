"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useData } from "@/context/DataContext"
import { TransactionCard } from "@/components/ui/transaction-card"
import { patterns, spacing } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import { SendIcon, ReceiveIcon, ScanIcon, HistoryIcon, CashOutIcon } from "@/components/icons"
import { PromotionalSlider } from "@/components/ui/promotional-slider"
import { useEffect } from "react"
import { apiService } from "@/services/api-service"
import { Promotion } from "@/types"
import { ContentCard } from "@/components/ui/content-card"

function ActionButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Button
      variant="ghost"
      className="flex flex-col items-center justify-center gap-1 h-auto p-2 text-white rounded-[var(--radius)]"
      asChild
    >
      <Link href={href} className="flex flex-col items-center justify-center w-full">
        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-white/20 mb-1">
          <div className="text-white">{icon}</div>
        </div>
        <span className="text-xs font-medium text-center w-full">{label}</span>
      </Link>
    </Button>
  )
}

export default function HomePage() {
  const { user, balance, transactions, formatCurrency, formatDate } = useData()
  const { t, language } = useLanguage()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promotionsClosed, setPromotionsClosed] = useState(false)

  const displayName = user?.firstName ?? "User";
  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() 
    : displayName[0].toUpperCase();

  const recentTransactions = transactions.slice(0, 3).map((tx) => ({
    ...tx,
    date: formatDate(tx.date),
  }))

  // Format currency with smaller cents
  const formatCurrencyWithSmallerCents = (amount: number) => {
    const parts = formatCurrency(amount).split('.')
    const dollars = parts[0]
    const cents = parts[1] || '00'
    const currency = '$' // This should be dynamic based on user's currency

    return (
      <span className="flex items-end justify-center font-bold" dir="ltr">
        <span className="text-5xl">{dollars}</span>
        <span className="text-sm pb-1">,{cents} {currency}</span>
      </span>
    )
  }

  // Fetch promotions when language changes
  useEffect(() => {
    const fetchPromotions = async () => {
      const response = await apiService.getPromotions(language)
      if (response.data) {
        setPromotions(response.data)
      }
    }
    
    fetchPromotions()
  }, [language])
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Full gradient background for top section */}
      <div className="bg-gradient-to-br from-violet-600 to-blue-400 text-white pb-10">
        {/* Header with avatar */}
        <header className="flex justify-between items-center p-4">
          <div className="w-10" /> {/* Empty div for spacing */}
          <div /> {/* Empty div to center the avatar */}
          <Link href="/profile" className="block">
            <Avatar className="h-10 w-10 border border-white/20">
              {/* {user?.avatar ? (
                <AvatarImage src={user.avatar} alt={displayName} onError={() => console.log('Avatar image failed to load')} />
              ) : null} */}
              {/* {!user?.avatar && ( */}
                <AvatarFallback className="bg-white/20 text-white">
                  {userInitials}
                </AvatarFallback>
              {/* )} */}
            </Avatar>
          </Link>
        </header>

        {/* Balance display */}
        <div className="text-center px-4 py-14">
          <p className="text-sm text-white/80 mb-1">{t("home.main")} - USD</p>
          {formatCurrencyWithSmallerCents(balance?.available ?? 0)}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-8 mt-0 w-full max-w-sm mx-auto">
            <ActionButton href="/send" icon={<SendIcon className="h-5 w-5" />} label={t("home.send")} />
            <ActionButton href="/receive" icon={<ReceiveIcon className="h-5 w-5" />} label={t("home.receive")} />
            <ActionButton href="/scan" icon={<ScanIcon className="h-5 w-5" />} label={t("home.scan")} />
        </div>
      </div>
      
      <main className="flex-1 flex flex-col gap-2 pb-20 px-4 -mt-4">
        {/* Container for content that overlaps with the gradient */}
        
        {promotions.length > 0 && !promotionsClosed && (
          <div>
            {/* Promotional slider - positioned to overlap with gradient */}
            <PromotionalSlider 
              promotions={promotions} 
              className="mb-2"
              onClose={() => setPromotionsClosed(true)}
            />
          </div>  
        )}

        {/* Recent transactions */}
        <ContentCard elevated={true}>
          <div className="flex items-center justify-between px-4 py-3 text-muted-foreground">
            <h3 className="text-base font-medium">{t("transaction.transactions")}</h3>
            <div className="ml-auto">
              <h3 className="text-base font-medium">{t("transaction.amount")}</h3>
            </div>
          </div>
          <div className="py-4">
            {recentTransactions.length > 0 ? (
              <div className="space-y-1">
                {recentTransactions.map((tx) => (
                  <TransactionCard key={tx.id} transaction={tx} />
                ))}
                
                {recentTransactions.length > 2 && (
                  <div className="mt-6 text-center">
                    <Link href="/transactions" className="text-primary text-sm font-medium">
                      {t("home.seeAll")}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t("transaction.noTransactions")}</p>
            )}
          </div>
        </ContentCard>
      </main>

      {/* Bottom navigation */}
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
    </div>
  )
}
