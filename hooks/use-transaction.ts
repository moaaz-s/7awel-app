"use client"

import { useState, useCallback } from "react"
import { useData } from "@/context/DataContext"
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
  const { user, balance, updateBalance, addTransaction } = useData()
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
      console.log("[useTransaction.sendMoney] Called with:", { recipient, amount, note });

      const currentBalance = balance?.available ?? 0;

      // --- Input Validation --- 
      if (amount <= 0) {
        const errorMsg = t("validation.sendMoney.amountPositive")
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      if (amount > currentBalance) {
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
      console.log("[useTransaction.sendMoney] Calling transactionService.sendMoney...");
      try {
        const result = await transactionService.sendMoney(recipient, amount, currentBalance, note)
        console.log("[useTransaction.sendMoney] transactionService.sendMoney result:", result);

        if (result.success && result.transaction) {
          console.log("[useTransaction.sendMoney] Success. Calling updateBalance...");
          updateBalance(currentBalance - amount)
          console.log("[useTransaction.sendMoney] Calling addTransaction...");
          addTransaction(result.transaction)
          console.log("[useTransaction.sendMoney] Setting status to SUCCESS.");
          setStatus(TransactionStatus.SUCCESS)
        } else {
          console.warn("[useTransaction.sendMoney] Failed. Error:", result.error);
          setError(result.error || "Transaction failed")
          setStatus(TransactionStatus.ERROR)
        }
        return result

      } catch (err: any) {
          console.error("[useTransaction.sendMoney] Error during transactionService call or state update:", err);
          setError(err.message || "An unexpected error occurred during send money.");
          setStatus(TransactionStatus.ERROR);
          return { success: false, error: err.message || "An unexpected error occurred." };
      }
    },
    [balance, updateBalance, addTransaction, t, user],
  )

  /**
   * Cash out money
   */
  const cashOut = useCallback(
    async (amount: number, method: string): Promise<TransactionResult> => {
      setStatus(TransactionStatus.LOADING)
      setError(null)

      const currentBalance = balance?.available ?? 0;

      const result = await transactionService.cashOut(amount, method, currentBalance)

      if (result.success) {
        // Calculate fee
        const cashOutMethod = CASH_OUT_METHODS.find((m) => m.id === method)
        if (cashOutMethod) {
          const feePercentage = cashOutMethod.feePercentage
          const fee = (amount * feePercentage) / 100
          const totalAmount = amount + fee

          // Update local state
          updateBalance(currentBalance - totalAmount)

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
      if (!user?.id) throw new Error("User ID not found");
      return transactionService.requestMoney(user.id, amount)
    } catch (error) {
      setError((error as Error).message)
      return { qrData: { userId: "", timestamp: 0 }, qrString: "" }
    }
  }, [user])

  /**
   * Generate payment QR code
   */
  const generatePaymentQR = useCallback(() => {
    try {
      if (!user?.id) throw new Error("User ID not found");
      return transactionService.generatePaymentQR(user.id)
    } catch (error) {
      setError((error as Error).message)
      return { qrData: { userId: "", timestamp: 0 }, qrString: "" }
    }
  }, [user])

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
