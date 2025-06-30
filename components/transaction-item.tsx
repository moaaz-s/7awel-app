import type { ReactNode } from "react"
import type { Transaction } from "@/types"
import { useData } from "@/context/DataContext-v2";
import { getDisplayProps } from "@/utils/transaction-view-ui"

interface TransactionItemProps {
  transaction: Transaction
  darkMode?: boolean
  clickable?: boolean
}

export function TransactionItem({ transaction, darkMode = false }: TransactionItemProps) {
  const { userProfile } = useData();
  const {
    direction,
    icon: iconNode,
    amountStr: formattedAmount,
    dateStr,
    colour: { bg, icon: iconColor },
  } = getDisplayProps(transaction, { currentUserId: userProfile?.id, darkMode });
  const { name } = transaction

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl ${
        darkMode ? "hover:bg-gray-800" : "hover:bg-gray-50 border"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${bg}`}>
          <div className={iconColor}>{iconNode}</div>
        </div>
        <div>
          <p className={`font-medium ${darkMode ? "text-white" : ""}`}>{name}</p>
          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-muted-foreground"}`}>{dateStr}</p>
        </div>
      </div>
      <div className={`font-medium ${direction === "outgoing" ? (darkMode ? "text-red-400" : "text-red-500") : darkMode ? "text-green-400" : "text-green-500"}`}>
        {formattedAmount}
      </div>
    </div>
  )
}
