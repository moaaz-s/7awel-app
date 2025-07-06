import type { ReactNode } from "react"
import type { Transaction } from "@/types"
import { useData } from "@/context/DataContext-v2";
import { useLanguage } from "@/context/LanguageContext";
import { getDisplayProps } from "@/utils/transaction-view-ui"

interface TransactionItemProps {
  transaction: Transaction
  darkMode?: boolean
  clickable?: boolean
}

export function TransactionItem({ transaction, darkMode = false }: TransactionItemProps) {
  const { userProfile } = useData();
  const { locale } = useLanguage();
  
  const {

    dateStr,
    displayName,
    amountComponent, // New component option
    iconComponent, // New component option
  } = getDisplayProps(transaction, { 
    currentUserId: userProfile?.id, 
    locale, // Now properly using locale from context
    darkMode,
    returnComponents: true, // Enable component return for consistent styling
    amountComponentClassName: "font-medium",
    iconComponentSize: 12
  });

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl ${
        darkMode ? "hover:bg-gray-800" : "hover:bg-gray-50 border"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Use the consistent iconComponent instead of manual styling */}
        {iconComponent}
        <div>
          <p className={`font-medium ${darkMode ? "text-white" : ""}`}>{displayName}</p>
          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-muted-foreground"}`}>{dateStr}</p>
        </div>
      </div>
      {/* Use the consistent amountComponent instead of manual styling */}
      {amountComponent}
    </div>
  )
}
