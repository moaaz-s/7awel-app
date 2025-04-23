"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import type { User, Contact } from "@/types"
import { useLanguage } from "@/context/LanguageContext"

// Define types
export type TransactionType = "send" | "receive" | "payment" | "cash_out"
export type TransactionStatus = "pending" | "completed" | "failed"

export type Transaction = {
  id: string
  name: string
  amount: number
  date: string
  type: TransactionType
  status: TransactionStatus
  reference?: string
  note?: string
  recipientId?: string
  senderId?: string
}

// Define the shape of our context
type AppContextType = {
  // User data
  user: User | null
  isAuthenticated: boolean
  login: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateUser: (userData: Partial<User>) => void

  // Balance
  balance: number
  updateBalance: (newBalance: number) => void

  // Transactions
  transactions: Transaction[]
  addTransaction: (transaction: Transaction) => void
  getTransaction: (id: string) => Transaction | undefined

  // Contacts
  contacts: Contact[]

  // Utility
  formatCurrency: (amount: number) => string
  formatDate: (date: string) => string
  generatePaymentQR: () => { qrData: any; qrString: string }
}

// Create the context with a default value
const AppContext = createContext<AppContextType | undefined>(undefined)

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  // Get language at the component top level
  const { language } = useLanguage() || { language: 'en' }

  // User state
  const [user, setUser] = useState<User | null>({
    id: "user123",
    firstName: "John",
    lastName: "Doe",
    phone: "+1 (555) 123-4567",
    avatar: "JD",
  })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true)

  // Balance state
  const [balance, setBalance] = useState<number>(1250.75)

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "tx1",
      name: "Sarah Johnson",
      amount: -50,
      date: "2025-04-11",
      type: "send",
      status: "completed",
      recipientId: "contact1",
      note: "Lunch payment",
    },
    {
      id: "tx2",
      name: "Coffee Shop",
      amount: -4.75,
      date: "2025-04-11",
      type: "payment",
      status: "completed",
    },
    {
      id: "tx3",
      name: "Michael Chen",
      amount: 125,
      date: "2025-04-10",
      type: "receive",
      status: "completed",
      senderId: "contact2",
    },
    {
      id: "tx4",
      name: "Grocery Store",
      amount: -32.5,
      date: "2025-04-10",
      type: "payment",
      status: "completed",
    },
  ])

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([
    { id: "contact1", name: "Sarah Johnson", phone: "+1 (555) 123-4567", initial: "SJ" },
    { id: "contact2", name: "Michael Chen", phone: "+1 (555) 987-6543", initial: "MC" },
    { id: "contact3", name: "Emma Wilson", phone: "+1 (555) 456-7890", initial: "EW" },
    { id: "contact4", name: "David Kim", phone: "+1 (555) 234-5678", initial: "DK" },
  ])

  // Authentication methods
  const login = useCallback(async (phone: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    // In a real app, this would make an API call
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // For demo purposes, any PIN works
      setIsAuthenticated(true)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: "Authentication failed. Please check your credentials and try again.",
      }
    }
  }, [])

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    // In a real app, you would clear tokens, etc.
  }, [])

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((prevUser) => (prevUser ? { ...prevUser, ...userData } : null))
  }, [])

  // Balance methods
  const updateBalance = useCallback((newBalance: number) => {
    setBalance(newBalance)
  }, [])

  // Transaction methods
  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev])
  }, [])

  const getTransaction = useCallback(
    (id: string): Transaction | undefined => {
      return transactions.find((tx) => tx.id === id)
    },
    [transactions],
  )

  // Utility functions
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }, [])

  const formatDate = useCallback((dateString: string): string => {
    // Use language state from the component scope, not from a hook call inside useCallback
    const locale = language === 'ar' ? 'ar' : 'en-US'
    
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return language === 'ar' ? "اليوم" : "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return language === 'ar' ? "أمس" : "Yesterday"
    } else {
      // Use Intl.DateTimeFormat to ensure proper formatting
      return new Intl.DateTimeFormat(locale, { 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        calendar: 'gregory' // Force Gregorian calendar for both languages
      }).format(date)
    }
  }, [language]) // Include language in the dependencies

  const generatePaymentQR = useCallback(() => {
    const userId = user?.id || "defaultUserId"
    const qrData = {
      userId: userId,
      timestamp: Date.now(),
    }

    const qrString = JSON.stringify(qrData)

    return { qrData, qrString }
  }, [user])

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      logout,
      updateUser,
      balance,
      updateBalance,
      transactions,
      addTransaction,
      getTransaction,
      contacts,
      formatCurrency,
      formatDate,
      generatePaymentQR,
    }),
    [
      user,
      isAuthenticated,
      login,
      logout,
      updateUser,
      balance,
      updateBalance,
      transactions,
      addTransaction,
      getTransaction,
      contacts,
      formatCurrency,
      formatDate,
      generatePaymentQR,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Custom hook to use the context
export function useApp(): AppContextType {
  const context = useContext(AppContext)

  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }

  return context
}
