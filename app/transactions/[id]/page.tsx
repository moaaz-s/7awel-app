"use client"

import { useEffect, useState } from "react"
import { use } from "react";
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PenIcon } from "@/components/icons/ui-icons"
import { useData } from "@/context/DataContext";
import { PageContainer } from "@/components/layouts/page-container"
import { ContentCard } from "@/components/ui/cards/content-card"
import { DateDisplay } from "@/components/ui/date-display"
import { transactionService } from "@/services/transaction-service"
import type { Transaction } from "@/types"
import { useLanguage } from "@/context/LanguageContext"
import { toast } from "@/hooks/use-toast"
import { ContentCardRowItem } from "@/components/ui/cards/content-card-row-item";

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { getTransaction, formatDate, formatCurrency } = useData()
  const { t, language } = useLanguage()
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

  // Handle the note action
  const handleAddNote = () => {
    toast({
      title: t("transaction.addingNote"),
      description: t("transaction.enterTransactionNote"),
      variant: "info",
    })
  }

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

  // Transaction date object for display
  const transactionDate = new Date(transaction.date)
    
  // Format transaction amount with sign and currency symbol
  const isNegative = transaction.amount < 0
  // Use Euro currency symbol to match the Revolut screenshot
  const amount = Math.abs(transaction.amount).toFixed(2)
  const formattedAmount = isNegative ? `-€${amount}` : `€${amount}`

  const transactionHeader = (
    <div className="flex items-start">
      <div className="flex-grow">
        <div className="flex items-baseline mb-1">
          <h1 className="text-2xl font-semibold mr-1">
            {formattedAmount}
          </h1>
        </div>
        {/* Make the contact name clickable - using appropriate ID based on transaction type */}
        <Link 
          href={`/contacts/${transaction.type === 'send' ? transaction.recipientId : 
            transaction.type === 'receive' ? transaction.senderId : 
            transaction.name.replace(/\s/g, '-').toLowerCase()}`} 
          className="text-base text-primary hover:underline block mb-1"
        >
          {transaction.name}
        </Link>
        <DateDisplay 
          date={transactionDate} 
          format="datetime" 
          className="text-sm text-gray-500"
        />
      </div>
    </div>
  )
  return (
    <PageContainer title={""} backHref="/transactions">
      <div className="flex flex-col full-width space-y-4">
        {transactionHeader}

        {/* Status */}
        <ContentCard>
          <ContentCardRowItem label={t("transaction.status")}>{t("transaction.completed")}</ContentCardRowItem>
        </ContentCard>

        {/* Note */}
        <ContentCard>
          <ContentCardRowItem label={t("transaction.note")}>
            {transaction.note || (
              <button 
                onClick={handleAddNote}
                className="text-primary flex items-center gap-1"
              >
                <PenIcon className="h-4 w-4" />
                <span>{t("transaction.addNote")}</span>
              </button>
            )}
          </ContentCardRowItem>
        </ContentCard>
        
      </div>
    </PageContainer>
  )
}
