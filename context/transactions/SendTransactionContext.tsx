"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTransaction } from "@/hooks/use-transaction"
import { transactionService, TransactionStatus } from "@/services/transaction-service"
import type { Contact } from "@/types"

export type TransactionStep = "recipient" | "amount" | "confirmation"

export interface SendMoneyState {
  recipient: Contact | null
  amount: string
  note: string
}

export interface SendMoneyDetails {
  amount: string
  recipient: string
  date: string
  reference: string
  note?: string
}

interface SendTransactionContextType {
  step: TransactionStep
  state: SendMoneyState
  details: SendMoneyDetails | null
  isLoading: boolean
  error: unknown
  setRecipient: (recipient: Contact) => void
  setAmount: (amount: string) => void
  setNote: (note: string) => void
  confirmSend: () => Promise<void>
  goBack: () => void
}

const SendTransactionContext = createContext<SendTransactionContextType | undefined>(undefined)

export function SendTransactionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { sendMoney, status, error } = useTransaction()
  const [step, setStep] = useState<TransactionStep>("recipient")
  const [state, setState] = useState<SendMoneyState>({ recipient: null, amount: "", note: "" })
  const [details, setDetails] = useState<SendMoneyDetails | null>(null)

  const setRecipient = useCallback((recipient: Contact) => {
    setState(prev => ({ ...prev, recipient }))
    setStep("amount")
  }, [])

  const setAmount = useCallback((amount: string) => {
    setState(prev => ({ ...prev, amount }))
    setStep("confirmation")
  }, [])

  const setNote = useCallback((note: string) => {
    setState(prev => ({ ...prev, note }))
  }, [])

  const confirmSend = useCallback(async () => {
    if (!state.recipient) return
    const result = await sendMoney(state.recipient, Number.parseFloat(state.amount), state.note)
    if (result.success) {
      const reference = result.transaction?.reference || transactionService.generateReference()
      const date = transactionService.formatDate(new Date())
      setDetails({ amount: state.amount, recipient: state.recipient.name, date, reference, note: state.note })
      router.push("/send/success")
    }
  }, [state, sendMoney, router])

  const goBack = useCallback(() => {
    if (step === "amount") setStep("recipient")
    else if (step === "confirmation") setStep("amount")
  }, [step])

  return (
    <SendTransactionContext.Provider
      value={{ step, state, details, isLoading: status === TransactionStatus.LOADING, error, setRecipient, setAmount, setNote, confirmSend, goBack }}
    >
      {children}
    </SendTransactionContext.Provider>
  )
}

export function useSendTransaction() {
  const context = useContext(SendTransactionContext)
  if (!context) {
    throw new Error("useSendTransaction must be used within a SendTransactionProvider")
  }
  return context
}
