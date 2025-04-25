"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiService } from "@/services/api-service"
import { useAuth } from "@/context/AuthContext"
import type { User, Transaction, Contact, WalletBalance } from "@/types"
import { userService } from "@/services/api-service"
import { toast } from "sonner"

interface DataContextType {
  // User data
  user: User | null
  isLoading: boolean
  error: string | null

  // Balance
  balance: WalletBalance | null

  // User methods
  updateUser: (updateData: Partial<User>) => Promise<void>

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
  formatDate: (dateString: string) => string
  updateBalance: (newAvailableBalance: number) => void
  addTransaction: (newTransaction: Transaction) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  // State
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  // Get auth state from AuthContext
  const { authState } = useAuth()

  // Function to clear all data state
  const clearDataState = useCallback(() => {
    setUser(null)
    setBalance(null)
    setTransactions([])
    setContacts([])
    setError(null)
  }, [])

  // Load initial data - Now depends on authState
  const loadInitialData = useCallback(async () => {
    // Only proceed if authenticated (redundant check due to useEffect, but safe)
    if (authState !== "authenticated") {
      console.log("[DataContext] Not authenticated, skipping data load.")
      setIsLoading(false) // Ensure loading stops if called prematurely
      return
    }
    console.log("[DataContext] Authenticated, loading data...")
    setIsLoading(true)
    setError(null)

    try {
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
  }, [authState])

  // Refresh data
  const refreshData = useCallback(async () => {
    // Reload data if authenticated
    if (authState === "authenticated") {
      await loadInitialData()
    }
  }, [authState, loadInitialData])

  // Load data based on AuthContext state changes
  useEffect(() => {
    if (authState === "authenticated") {
      loadInitialData()
    } else {
      // Clear data if not authenticated or pending
      clearDataState()
      // If pending, we might want to keep showing loading, but let's stop it for now
      if (authState !== "pending") {
        setIsLoading(false)
      }
    }
  }, [authState, loadInitialData, clearDataState])

  // User methods
  const updateUser = useCallback(async (updateData: Partial<User>) => {
    if (!user) throw new Error("User not loaded")
    try {
      console.log("[DataContext] Calling updateUser with:", updateData)
      // Simulate API call - Assuming userService is imported
      const updatedUser = await userService.updateProfile(user.id, updateData)
      console.log("[DataContext] updateUser successful, received:", updatedUser)
      // Update local state
      setUser(updatedUser)
      // Optionally update storage if user details are persisted there
      // await storage.setItem("user", JSON.stringify(updatedUser));
      // No toast here, let the calling component handle UI feedback
    } catch (error: any) {
      console.error("[DataContext] Error updating user:", error)
      // Re-throw error for the calling component to handle UI feedback (like toast)
      throw error
    }
  }, [user])

  // Transaction methods
  const getTransaction = useCallback(
    async (id: string): Promise<Transaction | undefined> => {
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
    },
    []
  )

  const sendMoney = useCallback(
    async (
      recipient: Contact,
      amount: number,
      note?: string,
    ): Promise<{
      success: boolean
      error?: string
      transaction?: Transaction
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
    [balance]
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
    []
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
    [balance]
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

  // Function to manually update available balance state
  const updateBalance = useCallback((newAvailableBalance: number) => {
    console.log(`[DataContext] updateBalance called with: ${newAvailableBalance}`); // Log call
    setBalance((prevBalance) => {
      if (!prevBalance) {
        console.warn("[DataContext] updateBalance called but prevBalance is null");
        return null;
      }
      // Keep total/pending, only update available for now
      // A more robust solution might refetch or calculate total/pending too
      return { ...prevBalance, available: newAvailableBalance };
    });
  }, []);

  // Function to manually add a transaction to the state
  const addTransaction = useCallback((newTransaction: Transaction) => {
    console.log(`[DataContext] addTransaction called with:`, newTransaction); // Log call
    setTransactions((prevTransactions) => [newTransaction, ...prevTransactions]);
  }, []);

  // Context value
  const value = {
    user,
    isLoading,
    error,
    balance,
    updateUser,
    transactions,
    getTransaction,
    sendMoney,
    requestMoney,
    cashOut,
    refreshData,
    formatCurrency,
    formatDate,
    contacts,
    updateBalance,
    addTransaction,
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
