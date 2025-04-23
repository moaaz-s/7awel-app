"use client"

import { useState, useCallback } from "react"
import { useApp } from "@/context/AppContext"
import { useLanguage } from "@/context/LanguageContext"
import {
  transactionService,
  TransactionStatus,
  type TransactionResult,
  CASH_OUT_METHODS,
} from "@/services/transaction-service"
import type { Contact } from "@/types"

/**
 * Custom hook for transaction operations
 */
export function useTransaction() {
  const { balance, updateBalance, addTransaction } = useApp()
  const { t } = useLanguage()
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.IDLE)
  const [error, setError] = useState<string | null>(null)

  /**
   * Send money to a recipient
   */
  const sendMoney = useCallback(
    async (recipient: Contact, amount: number, note?: string): Promise<TransactionResult> => {
      setError(null) // Clear previous errors
      setStatus(TransactionStatus.IDLE) // Reset status

      // --- Input Validation --- 
      if (amount <= 0) {
        const errorMsg = t("validation.sendMoney.amountPositive")
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      if (amount > balance) {
        const errorMsg = t("validation.sendMoney.insufficientFunds")
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      const maxNoteLength = 100;
      if (note && note.length > maxNoteLength) {
        const errorMsg = t("validation.sendMoney.noteTooLong", { maxLength: String(maxNoteLength) })
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      // --- End Validation --- 

      setStatus(TransactionStatus.LOADING)
      // setError(null) // Already cleared above

      const result = await transactionService.sendMoney(recipient, amount, balance, note)

      if (result.success && result.transaction) {
        // Update local state
        updateBalance(balance - amount)
        addTransaction(result.transaction)
        setStatus(TransactionStatus.SUCCESS)
      } else {
        setError(result.error || "Transaction failed")
        setStatus(TransactionStatus.ERROR)
      }

      return result
    },
    [balance, updateBalance, addTransaction, t],
  )

  /**
   * Cash out money
   */
  const cashOut = useCallback(
    async (amount: number, method: string): Promise<TransactionResult> => {
      setStatus(TransactionStatus.LOADING)
      setError(null)

      const result = await transactionService.cashOut(amount, method, balance)

      if (result.success) {
        // Calculate fee
        const cashOutMethod = CASH_OUT_METHODS.find((m) => m.id === method)
        if (cashOutMethod) {
          const feePercentage = cashOutMethod.feePercentage
          const fee = (amount * feePercentage) / 100
          const totalAmount = amount + fee

          // Update local state
          updateBalance(balance - totalAmount)

          // Create transaction object
          const newTransaction = {
            id: `tx${Date.now()}`,
            name: `${method.charAt(0).toUpperCase() + method.slice(1)} Withdrawal`,
            amount: -amount,
            date: new Date().toISOString().split("T")[0],
            type: "cash_out" as const,
            status: "completed" as const,
            reference: result.reference,
          }

          addTransaction(newTransaction)
        }

        setStatus(TransactionStatus.SUCCESS)
      } else {
        setError(result.error || "Transaction failed")
        setStatus(TransactionStatus.ERROR)
      }

      return result
    },
    [balance, updateBalance, addTransaction],
  )

  /**
   * Request money
   */
  const requestMoney = useCallback((amount: number) => {
    try {
      const userId = "user123" // In a real app, this would come from the user context
      return transactionService.requestMoney(userId, amount)
    } catch (error) {
      setError((error as Error).message)
      return { qrData: { userId: "", timestamp: 0 }, qrString: "" }
    }
  }, [])

  /**
   * Generate payment QR code
   */
  const generatePaymentQR = useCallback(() => {
    try {
      const userId = "user123" // In a real app, this would come from the user context
      return transactionService.generatePaymentQR(userId)
    } catch (error) {
      setError((error as Error).message)
      return { qrData: { userId: "", timestamp: 0 }, qrString: "" }
    }
  }, [])

  /**
   * Reset transaction state
   */
  const resetTransaction = useCallback(() => {
    setStatus(TransactionStatus.IDLE)
    setError(null)
  }, [])

  return {
    status,
    error,
    isLoading: status === TransactionStatus.LOADING,
    isSuccess: status === TransactionStatus.SUCCESS,
    isError: status === TransactionStatus.ERROR,
    sendMoney,
    cashOut,
    requestMoney,
    generatePaymentQR,
    resetTransaction,
  }
}
