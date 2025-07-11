"use client"

import { useState, useMemo } from "react"
import { TransactionCard } from "@/components/ui/transaction-card"
import { useData } from "@/context/DataContext-v2"
import { PageContainer } from "@/components/layouts/page-container"
import { spacing } from "@/components/ui-config"
import { SearchInput } from "@/components/ui/search-input"
import { useLanguage } from "@/context/LanguageContext"
import { ContentCard } from "@/components/ui/cards/content-card"
import { transactionService } from "@/services/transaction-service"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useDateFormatter } from "@/utils/date-formatter"

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
  const { formatForGrouping } = useDateFormatter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    
    const query = searchQuery.toLowerCase();
    return transactions.filter((tx) => {
      // Search in transaction reference
      if (tx.reference?.toLowerCase().includes(query)) return true;
      
      // Search in legacy contact names
      if (tx.senderName?.toLowerCase().includes(query)) return true;
      if (tx.recipientName?.toLowerCase().includes(query)) return true;
      
      // Search in enhanced contact structure
      if (tx.sender?.name?.toLowerCase().includes(query)) return true;
      if (tx.recipient?.name?.toLowerCase().includes(query)) return true;
      
      // Search in phone numbers
      if (tx.sender?.phone?.includes(searchQuery)) return true;
      if (tx.recipient?.phone?.includes(searchQuery)) return true;
      
      return false;
    });
  }, [transactions, searchQuery])

  // Group transactions by relative date for display using centralized formatter
  const groupedTransactions = useMemo(() => {
    return transactionService.groupTransactionsByDate(
      filteredTransactions,
      formatForGrouping
    );
  }, [filteredTransactions, formatForGrouping]);

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
