"use client"

import { TransactionIcon } from "@/components/icons"
import { StatusBadge } from "@/components/ui/status-badge"
import { typography } from "@/components/ui-config"
import { ContentCardItem } from "@/components/ui/cards/content-card-item"
import { useLanguage } from "@/context/LanguageContext"
import type { Transaction } from "@/types/index"

interface TransactionCardProps {
  transaction: Transaction
  showStatus?: boolean
  className?: string
}

export function TransactionCard({ transaction, showStatus = false, className = "" }: TransactionCardProps) {
  const { id, name, amount, date, type, status } = transaction
  const { t } = useLanguage()

  // Create description component with date and optional status badge
  const description = (
    <div className="flex items-center gap-2">
      <span className={`${typography.small} ${typography.muted} ltr-phone-number`}>{date}</span>
      {showStatus && <StatusBadge status={status as any} text={t(`transaction.${status}`)} />}
    </div>
  )

  // Format amount with proper sign
  const formattedAmount = (
    <div className={typography.body}>
      {amount < 0 ? "-" : "+"}${Math.abs(amount).toFixed(2)}
    </div>
  )

  return (
    <ContentCardItem
      href={`/transactions/${id}`}
      className={className}
      icon={<TransactionIcon type={type} />}
      label={name}
      description={description}
      rightContent={formattedAmount}
    />
  )
}
