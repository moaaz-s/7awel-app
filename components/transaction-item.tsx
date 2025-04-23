import type { ReactNode } from "react"
import type { Transaction } from "@/context/AppContext"
import { SendIcon, ReceiveIcon, PaymentIcon, CashOutIcon } from "@/components/icons"

interface TransactionItemProps {
  transaction: Transaction
  darkMode?: boolean
  clickable?: boolean
}

export function TransactionItem({ transaction, darkMode = false }: TransactionItemProps) {
  const { name, amount, date, type } = transaction

  const getIcon = (): ReactNode => {
    switch (type) {
      case "send":
        return <SendIcon className="h-4 w-4" />
      case "receive":
        return <ReceiveIcon className="h-4 w-4" />
      case "payment":
        return <PaymentIcon className="h-4 w-4" />
      case "cash_out":
        return <CashOutIcon className="h-4 w-4" />
    }
  }

  const getIconBgColor = (): string => {
    switch (type) {
      case "send":
        return darkMode ? "bg-red-900" : "bg-red-100"
      case "receive":
        return darkMode ? "bg-green-900" : "bg-green-100"
      case "payment":
        return darkMode ? "bg-gray-800" : "bg-gray-100"
      case "cash_out":
        return darkMode ? "bg-blue-900" : "bg-blue-100"
    }
  }

  const getIconColor = (): string => {
    switch (type) {
      case "send":
        return darkMode ? "text-red-400" : "text-red-500"
      case "receive":
        return darkMode ? "text-green-400" : "text-green-500"
      case "payment":
        return darkMode ? "text-gray-400" : "text-gray-500"
      case "cash_out":
        return darkMode ? "text-blue-400" : "text-blue-500"
    }
  }

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl ${
        darkMode ? "hover:bg-gray-800" : "hover:bg-gray-50 border"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getIconBgColor()}`}>
          <div className={getIconColor()}>{getIcon()}</div>
        </div>
        <div>
          <p className={`font-medium ${darkMode ? "text-white" : ""}`}>{name}</p>
          <p className={`text-xs ${darkMode ? "text-gray-400" : "text-muted-foreground"}`}>{date}</p>
        </div>
      </div>
      <div
        className={`font-medium ${
          amount < 0 ? (darkMode ? "text-red-400" : "text-red-500") : darkMode ? "text-green-400" : "text-green-500"
        }`}
      >
        {amount < 0 ? "-" : "+"}${Math.abs(amount).toFixed(2)}
      </div>
    </div>
  )
}
