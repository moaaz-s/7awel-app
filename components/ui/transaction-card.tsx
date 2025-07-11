"use client"

import { getDisplayProps } from "@/utils/transaction-view-ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { typography } from "@/components/ui-config"
import { ContentCardItem } from "@/components/ui/cards/content-card-item"
import { ContactDisplay } from "@/components/ui/contact-display"
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
  
  // Use enhanced transaction structure when available
  const direction = transaction.direction || 'incoming';
  const currentContact = direction === 'outgoing' ? transaction.recipient : transaction.sender;
  
  const { 
    dateStr, 
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

  // Create contact label using ContactDisplay component
  const contactLabel = (
    <ContactDisplay
      contact={currentContact}
      direction={direction}
      variant="compact"
      className={typography.body}
    />
  )

  return (
    <ContentCardItem
      href={`/transactions/${id}`} // TODO: Check if we can use a safer link
      className={className}
      icon={iconComponent}
      label={contactLabel}
      description={description}
      rightContent={amountComponent}
    />
  )
}
