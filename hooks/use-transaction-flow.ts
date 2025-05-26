"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTransaction } from "@/hooks/use-transaction"
import { transactionService, TransactionStatus } from "@/services/transaction-service"
import type { Contact } from "@/types"
import type { CashOutMethod } from "@/services/transaction-service"
import { info, warn } from "@/utils/logger"

type TransactionStep = "recipient" | "amount" | "confirmation"
type CashOutStep = "method" | "amount" | "confirmation"

interface SendMoneyState {
  recipient: Contact | null
  amount: string
  note: string
}

interface CashOutState {
  method: CashOutMethod | null
  amount: string
}

/**
 * Custom hook for managing cash out flow
 */
export function useCashOutFlow() {
  const router = useRouter()
  const { cashOut, status, error } = useTransaction()
  const [step, setStep] = useState<CashOutStep>("method")
  const [state, setState] = useState<CashOutState>({
    method: null,
    amount: "",
  })

  const setMethod = useCallback((method: CashOutMethod) => {
    setState((prev) => ({ ...prev, method }))
    setStep("amount")
  }, [])

  const setAmount = useCallback((amount: string) => {
    setState((prev) => ({ ...prev, amount }))
    setStep("confirmation")
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!state.method) return

    const result = await cashOut(Number.parseFloat(state.amount), state.method.id)

    if (result.success) {
      // // Store transaction details for success page
      // transactionService.storeTransactionDetails("cashOutDetails", {
      //   amount: state.amount,
      //   method: state.method.name,
      //   fee: transactionService.calculateFee(Number.parseFloat(state.amount), state.method.feePercentage),
      //   date: transactionService.formatDate(new Date()),
      //   reference: result.reference || transactionService.generateReference("WD"),
      // })

      router.push("/cash-out/success")
    }
  }, [state, cashOut, router])

  const goBack = useCallback(() => {
    if (step === "amount") {
      setStep("method")
    } else if (step === "confirmation") {
      setStep("amount")
    }
  }, [step])

  const calculateFee = useCallback(() => {
    if (!state.method || !state.amount) return "0.00"
    return transactionService.calculateFee(Number.parseFloat(state.amount), state.method.feePercentage)
  }, [state])

  const calculateTotal = useCallback(() => {
    if (!state.method || !state.amount) return "0.00"
    const amount = Number.parseFloat(state.amount)
    const fee = (amount * state.method.feePercentage) / 100
    return (amount + fee).toFixed(2)
  }, [state])

  return {
    step,
    state,
    status,
    error,
    isLoading: status === TransactionStatus.LOADING,
    setMethod,
    setAmount,
    handleConfirm,
    goBack,
    calculateFee,
    calculateTotal,
  }
}

/**
 * Custom hook for managing request money flow
 */
export function useRequestMoneyFlow() {
  const { requestMoney } = useTransaction()
  const [amount, setAmount] = useState("")
  const [requestGenerated, setRequestGenerated] = useState(false)
  const [qrData, setQrData] = useState<{ qrData: any; qrString: string } | null>(null)

  const handleAmountSubmit = useCallback(
    (value: string) => {
      setAmount(value)

      // Generate QR code data for the request
      const numericAmount = Number.parseFloat(value)
      const requestData = requestMoney(numericAmount)
      setQrData(requestData)

      setRequestGenerated(true)

      // // Store request details for future reference if needed
      // transactionService.storeTransactionDetails("requestDetails", {
      //   amount: value,
      //   recipient: "Selected Contact", // In a real app, this would be the selected contact
      //   date: transactionService.formatDate(new Date()),
      //   reference: requestData.qrData.reference || transactionService.generateReference("REQ"),
      // })
    },
    [requestMoney],
  )

  return {
    amount,
    requestGenerated,
    qrData,
    handleAmountSubmit,
  }
}
