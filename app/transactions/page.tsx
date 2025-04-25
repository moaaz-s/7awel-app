"use client"

import { useState, useMemo } from "react"
import { TransactionCard } from "@/components/ui/transaction-card"
import { useData } from "@/context/DataContext"
import { PageContainer } from "@/components/ui/page-container"
import { spacing, typography } from "@/components/ui-config"
import { SearchInput } from "@/components/ui/search-input"
import { useLanguage } from "@/context/LanguageContext"

// Interface for grouped transactions
interface TransactionGroup {
  date: string
  formattedDate: string
  transactions: any[]
}

// Transaction group component
function TransactionGroupComponent({ group }: { group: TransactionGroup }) {
  return (
    <div className={spacing.stack}>
      <h3 className={`${typography.small} ${typography.muted} px-1 font-medium`}>{group.formattedDate}</h3>
      <div className={spacing.stack}>
        {group.transactions.map((transaction) => (
          <TransactionCard key={transaction.id} transaction={transaction} showStatus={true} />
        ))}
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const { transactions, formatDate } = useData()
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [transactions, searchQuery])

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionGroup> = {}

    filteredTransactions.forEach((tx) => {
      const formattedDate = formatDate(tx.date)

      if (!groups[tx.date]) {
        groups[tx.date] = {
          date: tx.date,
          formattedDate,
          transactions: [],
        }
      }

      groups[tx.date].transactions.push({
        ...tx,
        date: formattedDate,
      })
    })

    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [filteredTransactions, formatDate])

  return (
    <PageContainer title={t("transaction.transactions")} backHref="/home">
      <div className="p-4 bg-white border-b mb-4">
        <SearchInput
          placeholder={t("transaction.searchTransaction")}
          value={searchQuery}
          onChange={setSearchQuery}
          showFilterButton={true}
          onFilterClick={() => setShowFilters(!showFilters)}
        />
      </div>

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
