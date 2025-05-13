"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiService } from "@/services/api-service"
import { useAuth } from "@/context/auth/AuthContext"
import { useSession } from "@/context/SessionContext"
import { AuthStatus } from "@/context/auth/auth-state-machine"
import { SessionStatus } from "@/context/auth/auth-types"
import { info, warn, error as logError } from "@/utils/logger"
import { isApiSuccess } from "@/utils/api-utils"
import { User, Transaction, Contact, AssetBalance, WalletBalance, Paginated } from "@/types"

interface DataContextType {
  // User data
  user: User | null
  isLoading: boolean
  error: string | null
  balance: AssetBalance | null

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
  // Get auth state from AuthContext
  const { authStatus } = useAuth()
  const { status: sessionStatus } = useSession()

  // State
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<AssetBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

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
    // Only proceed if authenticated
    if (authStatus !== AuthStatus.Authenticated) {
      info("[DataContext] Not authenticated, skipping data load.")
      setIsLoading(false) // Ensure loading stops if called prematurely
      return
    }
    info("[DataContext] Authenticated, loading data...")
    setIsLoading(true)
    setError(null)

    try {
      // Load user data
      const userResponse = await apiService.getUser()
      if (isApiSuccess(userResponse) && userResponse.data) {
        setUser(userResponse.data)
      }

      // Load balances (multi-asset)
      const balancesResponse = await apiService.getBalances?.()
        ?? await apiService.getWalletBalance()
      if (isApiSuccess(balancesResponse) && balancesResponse.data) {
        const first = Array.isArray(balancesResponse.data) ? (balancesResponse.data as AssetBalance[])[0] : balancesResponse.data
        if (first) setBalance(first)
      }

      // Load transactions
      const transactionsResponse = await apiService.getTransactions()
      if (isApiSuccess(transactionsResponse) && transactionsResponse.data) {
        setTransactions(transactionsResponse.data.items ?? [])
      }

      // Load contacts
      const contactsResponse = await apiService.getContacts()
      if (isApiSuccess(contactsResponse) && contactsResponse.data) {
        setContacts(contactsResponse.data.items ?? contactsResponse.data)
      }
    } catch (err) {
      setError("Failed to load data. Please try again.")
      logError("Error loading initial data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [authStatus])

  // Refresh data
  const refreshData = useCallback(async () => {
    info('[DataContext] Refreshing data...')
    if (authStatus === AuthStatus.Authenticated) {
      await loadInitialData()
    }
  }, [authStatus, loadInitialData])

  // Load data based on AuthContext state changes
  useEffect(() => {
    info(`[DataContext] Auth state changed: ${authStatus}, Session status: ${sessionStatus}`);
    // Load data when user is authenticated
    if (authStatus === 'authenticated') {
      info("  User authenticated, calling loadInitialData.");
      loadInitialData()
    } else {
      info("  User not authenticated, clearing data.");
      clearDataState()
      if (authStatus !== 'pending') {
        setIsLoading(false)
      }
    }
  }, [authStatus, sessionStatus, loadInitialData, clearDataState])

  // User methods
  const updateUser = useCallback(async (updateData: Partial<User>) => {
    if (!user) throw new Error("User not loaded")
    try {
      info("[DataContext] Calling updateUser with:", updateData)
      // Simulate API call 
      const response = await apiService.updateUser(updateData)
      if (isApiSuccess(response) && response.data) {
        const updatedUser = response.data
        info("[DataContext] updateUser successful, received:", updatedUser)
        // Update local state
        setUser(updatedUser)
        // Optionally update storage if user details are persisted there
        // await storage.setItem("user", JSON.stringify(updatedUser));
        // No toast here, let the calling component handle UI feedback
      }
    } catch (error: any) {
      logError("[DataContext] Error updating user:", error)
      // Re-throw error for the calling component to handle UI feedback (like toast)
      throw error
    }
  }, [user])

  // Transaction methods
  const getTransaction = useCallback(
    async (id: string): Promise<Transaction | undefined> => {
      try {
        const response = await apiService.getTransaction(id)

        if (isApiSuccess(response) && response.data) {
          return response.data
        }
        return undefined
      } catch (err) {
        logError("Error fetching transaction:", err)
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
      try {
        info(`[DataContext] Sending ${amount} to ${recipient.name} (${recipient.id})`)
        
        // Make API call
        const response = await apiService.sendMoney(recipient.id, amount, note)
        
        if (!isApiSuccess(response)) {
          return {
            success: false,
            error: response.message || "Failed to send money",
          }
        }
        
        // Add transaction to local state immediately for better UX
        if (response.data) {
          setTransactions((prev) => [response.data as Transaction, ...prev])
          
          // If response includes updated balance, update it
          const responseData = response.data as any
          if (responseData && responseData.newBalance !== undefined) {
            setBalance((prev) => prev ? { ...prev, available: responseData.newBalance } : null)
          }
          
          return {
            success: true,
            transaction: response.data as Transaction,
          }
        }
        
        return { success: true }
      } catch (err: any) {
        logError("[DataContext] Error sending money:", err)
        return {
          success: false,
          error: err.message || "Failed to send money",
        }
      }
    },
    []
  )

  const requestMoney = useCallback(
    async (
      amount: number,
    ): Promise<{
      success: boolean
      error?: string
      reference?: string
    }> => {
      try {
        // Make API call
        const response = await apiService.requestMoney(amount)
        
        if (!isApiSuccess(response)) {
          return {
            success: false,
            error: response.message || "Failed to request money",
          }
        }
        
        return {
          success: true,
          reference: response.data?.reference,
        }
      } catch (err: any) {
        logError("[DataContext] Error requesting money:", err)
        return {
          success: false,
          error: err.message || "Failed to request money",
        }
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
      try {
        // Make API call
        const response = await apiService.cashOut(amount, method)
        
        if (!isApiSuccess(response)) {
          return {
            success: false,
            error: response.message || "Failed to process cash out",
          }
        }
        
        // Add transaction to local state immediately for better UX
        if (response.data) {
          const newTransaction: Transaction = {
            id: response.data.reference || `cashout-${Date.now()}`,
            name: `Cash Out (${method})`,
            amount: amount,
            date: new Date().toISOString(),
            type: "cash_out",
            status: "pending",
            reference: response.data.reference,
          }
          
          setTransactions((prev) => [newTransaction, ...prev])
          
          // If response includes updated balance, update it
          const responseData = response.data as any
          if (responseData && responseData.newBalance !== undefined) {
            setBalance((prev) => prev ? { ...prev, available: responseData.newBalance } : null)
          }
          
          return {
            success: true,
            reference: response.data.reference,
          }
        }
        
        return { success: true }
      } catch (err: any) {
        logError("[DataContext] Error processing cash out:", err)
        return {
          success: false,
          error: err.message || "Failed to process cash out",
        }
      }
    },
    []
  )

  // Utility method to update balance (called when adding a new transaction)
  const updateBalance = useCallback((newAvailableBalance: number) => {
    setBalance((prev) => prev ? { ...prev, available: newAvailableBalance } : null)
  }, [])

  // Utility method to add a new transaction (for real-time updates)
  const addTransaction = useCallback((newTransaction: Transaction) => {
    setTransactions((prev) => [newTransaction, ...prev])
  }, [])

  // Format currency (default formatter - components should use more specific formatters)
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }, [])

  // Format date (default formatter - components should use more specific formatters)
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }, [])

  return (
    <DataContext.Provider
      value={{
        user,
        isLoading,
        error,
        balance,
        transactions,
        contacts,
        refreshData,
        updateUser,
        getTransaction,
        sendMoney,
        requestMoney,
        cashOut,
        formatCurrency,
        formatDate,
        updateBalance,
        addTransaction,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

// Custom hook to use the data context
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error("useData must be used within DataProvider")
  }
  return context
}
