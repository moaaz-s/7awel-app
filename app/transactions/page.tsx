"use client"

import { useState, useMemo } from "react"
import { TransactionCard } from "@/components/ui/transaction-card"
import { useData } from "@/context/DataContext"
import { PageContainer } from "@/components/layouts/page-container"
import { spacing } from "@/components/ui-config"
import { SearchInput } from "@/components/ui/search-input"
import { useLanguage } from "@/context/LanguageContext"
import { ContentCard } from "@/components/ui/cards/content-card"
import { transactionService } from "@/services/transaction-service"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Interface for grouped transactions
interface TransactionGroup {
  date: string
  formattedDate: string
  transactions: any[]
}

// Transaction group component
function TransactionGroupComponent({ group }: { group: TransactionGroup }) {
  return (
    <ContentCard title={group.formattedDate} elevated={true} padding="sm">
      <div className={spacing.stack_sm}>
        {group.transactions.map((transaction) => (
          <TransactionCard 
            key={transaction.id} 
            transaction={transaction} 
            showStatus={false}  
          />
        ))}
      </div>
    </ContentCard>
  )
}

export default function TransactionsPage() {
  const { transactions, isLoadingTransactions } = useData()
  const { t, language } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [transactions, searchQuery])

  // Group transactions by relative date for display
  const groupedTransactions = useMemo(() => {
    return transactionService.groupTransactionsByDate(
      filteredTransactions,
      (date) => {
        const dateObj = typeof date === "string" ? new Date(date) : date;
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const isSameDay = (d1: Date, d2: Date) =>
          d1.toDateString() === d2.toDateString();
        if (isSameDay(dateObj, today)) return t("transaction.today_label");
        if (isSameDay(dateObj, yesterday)) return t("transaction.yesterday_label");
        return dateObj.toLocaleDateString(language === "ar" ? "ar" : "en-US", {
          day: "numeric",
          month: "short",
        });
      }
    );
  }, [filteredTransactions, t, language]);

  return (
    <PageContainer title={t("transaction.transactions")} backHref="/home">
      <div className="mb-4">
        <SearchInput
          placeholder={t("transaction.searchTransaction")}
          value={searchQuery}
          onChange={setSearchQuery}
          showFilterButton={true}
          onFilterClick={() => setShowFilters(!showFilters)}
        />
      </div>

      {isLoadingTransactions && transactions.length > 0 && (
        <div className="flex justify-center py-2">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {groupedTransactions.length > 0 ? (
        <div className={spacing.section}>
          {groupedTransactions.map((group) => (
            <TransactionGroupComponent key={group.date} group={group} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t("transaction.noTransactions")}</p>
        </div>
      )}
    </PageContainer>
  )
}
