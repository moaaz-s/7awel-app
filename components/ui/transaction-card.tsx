"use client"

import { getDisplayProps } from "@/utils/transaction-view-ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { typography } from "@/components/ui-config"
import { ContentCardItem } from "@/components/ui/cards/content-card-item"
import { useLanguage } from "@/context/LanguageContext"
import { useData } from "@/context/DataContext-v2"
import type { Transaction } from "@/types/index"

interface TransactionCardProps {
  transaction: Transaction
  showStatus?: boolean
  className?: string
}

export function TransactionCard({ transaction, showStatus = false, className = "" }: TransactionCardProps) {
  const { id, status } = transaction
  const { userProfile } = useData()
  const { t, locale } = useLanguage()
  
  const { 
    dateStr, 
    displayName, 
    iconComponent,
    amountComponent,
  } = getDisplayProps(transaction, {
    currentUserId: userProfile?.id,
    locale,
    returnComponents: true,
    amountComponentClassName: typography.body,
    iconComponentSize: 12,
  })

  // Create description component with date and optional status badge
  const description = (
    <div className="flex items-center gap-2">
      <span className={`${typography.small} ${typography.muted} ltr-phone-number`}>{dateStr}</span>
      {showStatus && <StatusBadge status={status as any} text={t(`transaction.${status}`)} />}
    </div>
  )

  return (
    <ContentCardItem
      href={`/transactions/${id}`} // TODO: Check if we can use a safer link
      className={className}
      icon={iconComponent}
      label={displayName}
      description={description}
      rightContent={amountComponent}
    />
  )
}
