"use client"

import { useEffect, useState } from "react"
import { use } from "react";
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useData } from "@/context/DataContext";
import { PageContainer } from "@/components/ui/page-container"
import { ButtonPrimary } from "@/components/ui/button-primary"
import { ShareButton } from "@/components/share-button"
import { spacing, typography } from "@/components/ui-config"
import { TransactionIcon, ShareIcon } from "@/components/icons"
import { transactionService } from "@/services/transaction-service"
import type { Transaction } from "@/types"
import { useLanguage } from "@/context/LanguageContext"

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { getTransaction, formatDate } = useData()
  const { t } = useLanguage()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { id } = use(params)

  useEffect(() => {
    const fetchTransaction = async () => {
      setIsLoading(true)
      // First try to get from context (for immediate display)
      const txFromContext = await getTransaction(id) // Await the promise
      if (txFromContext) {
        setTransaction(txFromContext) // Set the resolved transaction or null/undefined
        setIsLoading(false)
        return
      }

      // If not in context, try to fetch from API
      try {
        const fetchedTx = await transactionService.getTransaction(id)
        if (fetchedTx) {
          setTransaction(fetchedTx)
        }
      } catch (error) {
        console.error("Error fetching transaction:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransaction()
  }, [id, getTransaction])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <p>{t("transaction.transactionNotFound")}</p>
        <Button asChild className="mt-4">
          <Link href="/transactions">{t("transaction.backToTransactions")}</Link>
        </Button>
      </div>
    )
  }

  // Format date for display
  const formattedDate = formatDate(transaction.date)

  // Format time (in a real app, this would come from the transaction data)
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  })

  // Get initials for avatar
  const initial = transaction.name
    .split(" ")
    .map((n) => n[0])
    .join("")

  return (
    <PageContainer title={t("transaction.details")} backHref="/transactions">
      <div className={spacing.section}>
        <div className="p-6 text-center bg-white rounded-lg">
          <div className="flex justify-center mb-4">
            <TransactionIcon type={transaction.type} size="lg" />
          </div>

          <h2 className="text-2xl font-bold mb-1">
            {transaction.amount < 0 ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
          </h2>
          <p className={typography.muted}>{t(`transaction.${transaction.status}`)}</p>
        </div>

        <div className="bg-white rounded-lg">
          <div className="p-4 flex items-center gap-3 border-b">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-r from-violet-500 to-blue-500 text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{transaction.name}</p>
              <p className={`${typography.small} ${typography.muted}`}>
                {t(transaction.type === "payment" ? "transaction.merchant" : "transaction.user")}
              </p>
            </div>
          </div>

          <div className="divide-y">
            <div className="flex justify-between p-4">
              <span className={typography.muted}>{t("transaction.date")}</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between p-4">
              <span className={typography.muted}>{t("transaction.time")}</span>
              <span>{formattedTime}</span>
            </div>
            <div className="flex justify-between p-4">
              <span className={typography.muted}>{t("transaction.type")}</span>
              <span className="capitalize">{t(`transaction.${transaction.type}`)}</span>
            </div>
            <div className="flex justify-between p-4">
              <span className={typography.muted}>{t("transaction.referenceId")}</span>
              <span className="font-mono text-xs">{transaction.reference || `TXN${transaction.id}`}</span>
            </div>
            {transaction.note && (
              <div className="flex justify-between p-4">
                <span className={typography.muted}>{t("transaction.note")}</span>
                <span>{transaction.note}</span>
              </div>
            )}
          </div>
        </div>

        <div className={spacing.stack}>
          <ShareButton
            variant="outline"
            fullWidth
            title={t("transaction.shareReceipt")}
            text={t("transaction.receiptText", {
              action: transaction.amount < 0 ? t("transaction.send") : t("transaction.receive"),
              amount: Math.abs(transaction.amount).toFixed(2),
              reference: transaction.reference || `TXN${transaction.id}`
            })}
            url={typeof window !== 'undefined' ? window.location.href : ''}
          >
            {t("transaction.shareReceipt")}
          </ShareButton>
          {transaction.type === "send" && (
            <ButtonPrimary fullWidth>{t("transaction.sendAgain")}</ButtonPrimary>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
