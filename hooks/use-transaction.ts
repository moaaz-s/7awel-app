"use client"

import { useState, useCallback } from "react"
import { info, warn, error as logError } from "@/utils/logger"
import { useData } from "@/context/DataContext-v2"
import { useLanguage } from "@/context/LanguageContext"
import {
  transactionService,
  TransactionStatus,
  type TransactionResult,
} from "@/services/transaction-service"
import type { Contact } from "@/types"
import { OTP_CHANNEL } from "@/context/auth/auth-types"
import { isApiSuccess } from "@/utils/api-utils"
import type { CashOutResponse } from "@/types"
import { ErrorCode } from "@/types/errors"

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
      info("[useTransaction.sendMoney] Called with:", { recipient, amount, note });

      const currentBalance = balance?.available ?? 0;

      // --- Input Validation --- 
      if (amount <= 0) {
        const errorMsg = t("uiErrors.invalidAmount")
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      if (amount > currentBalance) {
        const errorMsg = t("uiErrors.insufficientFunds")
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      const maxNoteLength = 100;
      if (note && note.length > maxNoteLength) {
        const errorMsg = t("uiErrors.noteTooLong", { maxLength: String(maxNoteLength) })
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      // --- End Validation --- 

      setStatus(TransactionStatus.LOADING)
      // setError(null) // Already cleared above
      info("[useTransaction.sendMoney] Calling transactionService.sendMoney...");
      try {
        const result = await transactionService.sendMoney(recipient, amount, currentBalance, note)
        info("[useTransaction.sendMoney] transactionService.sendMoney result:", result);

        if (result.success && result.transaction) {
          info("[useTransaction.sendMoney] Success. Calling updateBalance...");
          updateBalance(currentBalance - amount)
          info("[useTransaction.sendMoney] Calling addTransaction...");
          addTransaction(result.transaction)
          info("[useTransaction.sendMoney] Setting status to SUCCESS.");
          setStatus(TransactionStatus.SUCCESS)
        } else {
          warn("[useTransaction.sendMoney] Failed. Error:", result.error);
          setError(result.error || "Transaction failed")
          setStatus(TransactionStatus.ERROR)
        }
        return result

      } catch (err: any) {
          logError("[useTransaction.sendMoney] Error during transactionService call or state update:", err);
          setError(err.message || "An unexpected error occurred during send money.");
          setStatus(TransactionStatus.ERROR);
          return { success: false, error: err.message || "An unexpected error occurred." };
      }
    },
    [balance, updateBalance, addTransaction, t, user],
  )

  /**
   * Request money
   */
  const requestMoney = useCallback((amount: number, note?: string) => {
    try {
      if (!user?.id) throw new Error("User ID not found");
      return transactionService.requestMoney({ 
        amount, 
        note, 
        contactId: user.id, 
        channel: OTP_CHANNEL.WHATSAPP 
      })
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
   * Cash out funds
   * TBD
   */
  const cashOut = useCallback(
    async (amount: number, methodId: string): Promise<TransactionResult> => {
      setError(null)
      setStatus(TransactionStatus.IDLE)
      info("[useTransaction.cashOut] Called with:", { amount, methodId })
      const currentBalance = balance?.available ?? 0
      if (isNaN(amount) || amount <= 0) {
        const errorMsg = t("uiErrors.invalidAmount")
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      if (amount > currentBalance) {
        const errorMsg = t("uiErrors.insufficientFunds")
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
      setStatus(TransactionStatus.LOADING)
      try {
        const response = await transactionService.initiateCashout({ fromAccount: user?.id ?? "", toAccount: methodId, amount, currency: "USD" })
        if (isApiSuccess(response) && response.data) {
          updateBalance(currentBalance - amount)
          info("[useTransaction.cashOut] Success", response.data)
          setStatus(TransactionStatus.SUCCESS)
          return { success: true, reference: response.data.reference }
        } else {
          const errorMsg = response.error || t("uiErrors.cashOutFailed")
          warn("[useTransaction.cashOut] Failed. Error:", errorMsg)
          setError(errorMsg)
          setStatus(TransactionStatus.ERROR)
          return { success: false, error: errorMsg }
        }
      } catch (err: any) {
        logError("[useTransaction.cashOut] Error:", err)
        const errorMsg = err.message || t("uiErrors.cashOutFailed")
        setError(errorMsg)
        setStatus(TransactionStatus.ERROR)
        return { success: false, error: errorMsg }
      }
    },
    [balance, updateBalance, t, user]
  )

  return {
    status,
    error,
    isLoading: status === TransactionStatus.LOADING,
    isSuccess: status === TransactionStatus.SUCCESS,
    isError: status === TransactionStatus.ERROR,
    sendMoney,
    requestMoney,
    generatePaymentQR,
    cashOut
  }
}
