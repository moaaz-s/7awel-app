"use client"

import Link from "next/link"
import { TransactionIcon } from "@/components/ui/transaction-icon"
import { StatusBadge } from "@/components/ui/status-badge"
import { colors, typography } from "@/components/ui-config"
import { useLanguage } from "@/context/LanguageContext"
import type { Transaction } from "@/types/index"

interface TransactionCardProps {
  transaction: Transaction
  showStatus?: boolean
  className?: string
}

export function TransactionCard({ transaction, showStatus = false, className = "" }: TransactionCardProps) {
  const { id, name, amount, date, type, status } = transaction
  const { t, isRTL } = useLanguage()

  return (
    <Link href={`/transactions/${id}`} className="block">
      <div
        className={`
          rounded-lg p-4 
          transition-all duration-200
          hover:bg-gray-50 active:bg-gray-100
          ${className}
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <TransactionIcon type={type} />
            <div>
              <p className={typography.body}>{name}</p>
              <div className="flex items-center gap-2">
                <p className={`${typography.small} ${typography.muted} ltr-phone-number`}>{date}</p>
                {showStatus && <StatusBadge status={status as any} text={t(`transaction.${status}`)} />}
              </div>
            </div>
          </div>
          <div className={typography.body}>
            {amount < 0 ? "-" : "+"}${Math.abs(amount).toFixed(2)}
          </div>
        </div>
      </div>
    </Link>
  )
}
