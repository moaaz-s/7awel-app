"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

interface AmountInputProps {
  onSubmit: (amount: string) => void
  maxAmount?: number
  showAvailableBalance?: boolean
  availableBalance?: string
}

export function AmountInput({
  onSubmit,
  maxAmount = Number.POSITIVE_INFINITY,
  showAvailableBalance = false,
  availableBalance = "$0.00",
}: AmountInputProps) {
  const { t } = useLanguage()
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleDigitClick = (digit: string) => {
    // Don't allow more than 2 decimal places
    if (amount.includes(".") && amount.split(".")[1].length >= 2 && digit !== "←") {
      return
    }

    if (digit === "←") {
      setAmount(amount.slice(0, -1))
      setError(null)
    } else if (digit === ".") {
      if (!amount.includes(".")) {
        setAmount(amount === "" ? "0." : amount + ".")
      }
    } else {
      const newAmount = amount + digit
      const numericAmount = Number.parseFloat(newAmount)

      // Validate against maxAmount
      if (numericAmount > maxAmount) {
        setError(t("error.insufficientFunds"))
      } else {
        setError(null)
      }

      setAmount(newAmount)
    }
  }

  const handleSubmit = () => {
    const numericAmount = Number.parseFloat(amount)

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError(t("error.invalidAmount"))
      return
    }

    if (numericAmount > maxAmount) {
      setError(t("error.insufficientFunds"))
      return
    }

    const formattedAmount = numericAmount.toFixed(2)
    onSubmit(formattedAmount)
  }

  const formattedAmount = amount ? Number.parseFloat(amount || "0").toFixed(2) : "0.00"

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <div className="text-4xl font-bold">${amount ? formattedAmount : "0.00"}</div>
        {showAvailableBalance && <p className="mt-1 text-sm text-muted-foreground">{availableBalance}</p>}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigitClick(num.toString())}
            className="flex h-14 w-full items-center justify-center rounded-full border text-xl font-medium hover:bg-gray-50"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleDigitClick(".")}
          className="flex h-14 w-full items-center justify-center rounded-full border text-xl font-medium hover:bg-gray-50"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleDigitClick("0")}
          className="flex h-14 w-full items-center justify-center rounded-full border text-xl font-medium hover:bg-gray-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleDigitClick("←")}
          className="flex h-14 w-full items-center justify-center rounded-full border text-xl font-medium hover:bg-gray-50"
        >
          ←
        </button>
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full bg-gradient-to-r from-violet-600 to-blue-600 py-6"
        disabled={!amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > maxAmount}
      >
        {t("common.continue")}
      </Button>
    </div>
  )
}
