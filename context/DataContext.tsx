"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiService } from "@/services/api-service"
import type { User, Transaction, Contact, WalletBalance } from "@/types"

interface DataContextType {
  // User data
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Balance
  balance: WalletBalance | null

  // Auth methods
  login: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>

  // User methods
  updateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>

  // Transaction methods
  transactions: Transaction[]
  getTransaction: (id: string) => Promise<Transaction | undefined>
  sendMoney: (
    recipient: Contact,
    amount: number,
    note?: string,
  ) => Promise<{
    success: boolean
    error?: string
    transaction?: Transaction
  }>
  requestMoney: (amount: number) => Promise<{
    success: boolean
    error?: string
    reference?: string
  }>
  cashOut: (
    amount: number,
    method: string,
  ) => Promise<{
    success: boolean
    error?: string
    reference?: string
  }>

  // Contacts methods
  contacts: Contact[]

  // Utility methods
  refreshData: () => Promise<void>
  formatCurrency: (amount: number) => string
  formatDate: (date: string) => string
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  // State
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  // Load initial data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // For demo purposes, we'll simulate being authenticated
      setIsAuthenticated(true)

      // Load user data
      const userResponse = await apiService.getUser()
      if (userResponse.success) {
        setUser(userResponse.data)
      }

      // Load balance
      const balanceResponse = await apiService.getWalletBalance()
      if (balanceResponse.success) {
        setBalance(balanceResponse.data)
      }

      // Load transactions
      const transactionsResponse = await apiService.getTransactions()
      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data)
      }

      // Load contacts
      const contactsResponse = await apiService.getContacts()
      if (contactsResponse.success) {
        setContacts(contactsResponse.data)
      }
    } catch (err) {
      setError("Failed to load data. Please try again.")
      console.error("Error loading initial data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return
    await loadInitialData()
  }, [isAuthenticated, loadInitialData])

  // Load data on initial mount
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Auth methods
  const login = useCallback(
    async (phone: string, pin: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await apiService.login(phone, pin)

        if (response.success) {
          setUser(response.data.user)
          setIsAuthenticated(true)
          apiService.setToken(response.data.token)

          // Load other data after successful login
          await refreshData()

          return { success: true }
        } else {
          return { success: false, error: response.error || "Login failed" }
        }
      } catch (err) {
        const errorMessage = "Authentication failed. Please check your credentials and try again."
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsLoading(false)
      }
    },
    [refreshData],
  )

  const logout = useCallback(() => {
    setUser(null)
    setIsAuthenticated(false)
    setBalance(null)
    setTransactions([])
    setContacts([])
    apiService.clearToken()
  }, [])

  const verifyOtp = useCallback(async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.verifyOtp(phone, otp)

      if (response.success) {
        return { success: true }
      } else {
        return { success: false, error: response.error || "OTP verification failed" }
      }
    } catch (err) {
      const errorMessage = "OTP verification failed. Please try again."
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // User methods
  const updateUser = useCallback(async (userData: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.updateUser(userData)

      if (response.success) {
        setUser(response.data)
        return { success: true }
      } else {
        return { success: false, error: response.error || "Failed to update user" }
      }
    } catch (err) {
      const errorMessage = "Failed to update user information. Please try again."
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Transaction methods
  const getTransaction = useCallback(async (id: string): Promise<Transaction | undefined> => {
    try {
      const response = await apiService.getTransaction(id)

      if (response.success) {
        return response.data
      }
      return undefined
    } catch (err) {
      console.error("Error fetching transaction:", err)
      return undefined
    }
  }, [])

  const sendMoney = useCallback(
    async (
      recipient: Contact,
      amount: number,
      note?: string,
    ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> => {
      setIsLoading(true)
      setError(null)

      try {
        // Validate amount
        if (isNaN(amount) || amount <= 0) {
          return { success: false, error: "Please enter a valid amount." }
        }

        // Check balance
        if (balance && amount > balance.available) {
          return { success: false, error: "Insufficient funds. Please enter a smaller amount." }
        }

        const response = await apiService.sendMoney(recipient.id, amount, note)

        if (response.success) {
          // Update local state
          if (balance) {
            setBalance({
              ...balance,
              available: balance.available - amount,
              total: balance.total - amount,
            })
          }

          // Add to transactions
          const newTransaction = response.data
          setTransactions((prev) => [newTransaction, ...prev])

          return {
            success: true,
            transaction: newTransaction,
          }
        } else {
          return {
            success: false,
            error: response.error || "Transaction failed. Please try again later.",
          }
        }
      } catch (err) {
        const errorMessage = "Transaction failed. Please try again later."
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsLoading(false)
      }
    },
    [balance],
  )

  const requestMoney = useCallback(
    async (
      amount: number,
    ): Promise<{
      success: boolean
      error?: string
      reference?: string
    }> => {
      setIsLoading(true)
      setError(null)

      try {
        // Validate amount
        if (isNaN(amount) || amount <= 0) {
          return { success: false, error: "Please enter a valid amount." }
        }

        const response = await apiService.requestMoney(amount)

        if (response.success) {
          return {
            success: true,
            reference: response.data.reference,
          }
        } else {
          return {
            success: false,
            error: response.error || "Request failed. Please try again later.",
          }
        }
      } catch (err) {
        const errorMessage = "Request failed. Please try again later."
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const cashOut = useCallback(
    async (
      amount: number,
      method: string,
    ): Promise<{
      success: boolean
      error?: string
      reference?: string
    }> => {
      setIsLoading(true)
      setError(null)

      try {
        // Validate amount
        if (isNaN(amount) || amount <= 0) {
          return { success: false, error: "Please enter a valid amount." }
        }

        // Check balance
        if (balance && amount > balance.available) {
          return { success: false, error: "Insufficient funds. Please enter a smaller amount." }
        }

        const response = await apiService.cashOut(amount, method)

        if (response.success) {
          // Calculate fee
          const feePercentage = method === "bank" ? 0.005 : method === "agent" ? 0.01 : 0.015
          const fee = amount * feePercentage
          const totalAmount = amount + fee

          // Update local state
          if (balance) {
            setBalance({
              ...balance,
              available: balance.available - totalAmount,
              total: balance.total - totalAmount,
            })
          }

          // Add to transactions
          const newTransaction: Transaction = {
            id: `tx${Date.now()}`,
            name: `${method.charAt(0).toUpperCase() + method.slice(1)} Withdrawal`,
            amount: -amount,
            date: new Date().toISOString().split("T")[0],
            type: "cash_out",
            status: "completed",
            reference: response.data.reference,
          }

          setTransactions((prev) => [newTransaction, ...prev])

          return {
            success: true,
            reference: response.data.reference,
          }
        } else {
          return {
            success: false,
            error: response.error || "Cash out failed. Please try again later.",
          }
        }
      } catch (err) {
        const errorMessage = "Cash out failed. Please try again later."
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsLoading(false)
      }
    },
    [balance],
  )

  // Utility methods
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }, [])

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }
  }, [])

  // Context value
  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    balance,
    transactions,
    contacts,
    login,
    logout,
    verifyOtp,
    updateUser,
    getTransaction,
    sendMoney,
    requestMoney,
    cashOut,
    refreshData,
    formatCurrency,
    formatDate,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// Custom hook to use the data context
export function useData(): DataContextType {
  const context = useContext(DataContext)

  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }

  return context
}
