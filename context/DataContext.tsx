"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { apiService } from "@/services/api-service"
import { useAuth } from "@/context/auth/AuthContext"
import { useSession } from "@/context/SessionContext"
import { AuthStatus } from "@/context/auth/auth-state-machine"
import { SessionStatus } from "@/context/auth/auth-types"
import { info, warn, error as logError } from "@/utils/logger"
import { isApiSuccess } from "@/utils/api-utils"
import { User, Transaction, Contact, AssetBalance, WalletBalance, Paginated, TransactionType, TransactionStatus } from "@/types"
import { getStorageManager, SyncStrategy } from "@/services/storage-manager"
import { backgroundSync } from "@/services/background-sync"

interface DataContextType {
  // User data
  user: User | null
  isLoading: boolean
  isLoadingTransactions: boolean
  isLoadingContacts: boolean
  isRefreshing: boolean
  error: string | null
  balance: AssetBalance | null
  transactions: Transaction[]
  contacts: Contact[]
  fetchUser: () => Promise<void>
  fetchTransactions: () => Promise<void>
  fetchContacts: () => Promise<void>
  searchContacts: (query: string) => Contact[]
  formatCurrency: (amount: number, currency?: string) => string
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
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<AssetBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])

  // Get storage manager instance
  const storage = getStorageManager()

  // Function to clear all data state
  const clearDataState = useCallback(async () => {
    setUser(null)
    setBalance(null)
    setTransactions([])
    setContacts([])
    setError(null)

    // Clear local storage as well
    try {
      await storage.local.clear('userProfile')
      await storage.local.clear('contacts')
      await storage.local.clear('recentTransactions')
    } catch (err) {
      logError("[DataContext] Error clearing local storage:", err)
    }
  }, [storage])

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
      // Load user data - try local first, then remote
      const localUser = await storage.local.get('userProfile', 'main')
      if (localUser) {
        setUser(localUser)
        info("[DataContext] Loaded user from local storage")
      }

      // Fetch from remote and update local in background
      const userResponse = await apiService.getUser()
      if (isApiSuccess(userResponse) && userResponse.data) {
        setUser(userResponse.data)
        // Save to local storage
        await storage.local.set('userProfile', {
          id: 'main',
          firstName: userResponse.data.firstName,
          lastName: userResponse.data.lastName,
          email: userResponse.data.email || '',
          phone: userResponse.data.phone,
          avatar: userResponse.data.avatar,
          country: userResponse.data.country,
          address: userResponse.data.address,
          dateOfBirth: userResponse.data.dob,  // Map 'dob' to 'dateOfBirth'
          gender: userResponse.data.gender as 'male' | 'female' | 'other' | undefined,
          lastUpdated: Date.now()
        })
      }

      // Load balances (multi-asset) - remote only for now
      const balancesResponse = await apiService.getBalances?.()
        ?? await apiService.getWalletBalance()
      if (isApiSuccess(balancesResponse) && balancesResponse.data) {
        const first = Array.isArray(balancesResponse.data) ? (balancesResponse.data as AssetBalance[])[0] : balancesResponse.data
        if (first) setBalance(first)
      }

      // Load transactions - hybrid approach
      const localTransactions = await storage.local.getAll('recentTransactions')
      if (localTransactions.length > 0) {
        // Map local transaction schema to app Transaction type
        const mappedTransactions: Transaction[] = localTransactions.map(t => {
          // Determine the display name based on current user
          const isReceived = t.recipientId === user?.id
          const displayName = isReceived ? 'Unknown Sender' : 'Unknown Recipient'
          
          return {
            id: t.id,
            name: displayName,
            amount: t.amount,
            date: t.createdAt,  // createdAt is already in ISO format
            type: t.type as TransactionType,
            status: t.status as TransactionStatus,
            recipientId: t.recipientId,
            senderId: t.senderId,
            assetSymbol: t.currency,
            note: t.note
          }
        })
        setTransactions(mappedTransactions)
        info("[DataContext] Loaded transactions from local storage")
      }
      
      // Fetch remote transactions in background
      setIsLoadingTransactions(true)
      const transactionsResponse = await apiService.getTransactions()
      if (isApiSuccess(transactionsResponse) && transactionsResponse.data) {
        const txList = (transactionsResponse.data as any).items ?? transactionsResponse.data
        setTransactions(Array.isArray(txList) ? txList : [])
        
        // Update local storage with recent transactions
        const recentTxs = (Array.isArray(txList) ? txList : []).slice(0, 50)
        for (const tx of recentTxs) {
          await storage.local.set('recentTransactions', {
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            currency: tx.assetSymbol || 'USD',
            status: tx.status,
            createdAt: tx.date,  // Store as ISO string
            recipientId: tx.recipientId,
            senderId: tx.senderId,
            note: tx.note,
            syncedAt: Date.now()
          })
        }
      }
      setIsLoadingTransactions(false)

      // Load contacts - local first
      const localContacts = await storage.local.getAll('contacts')
      if (localContacts.length > 0) {
        const mappedContacts: Contact[] = localContacts.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          initial: c.name.charAt(0).toUpperCase()
        }))
        setContacts(mappedContacts)
        info("[DataContext] Loaded contacts from local storage")
      }
      
      // Fetch remote contacts in background
      setIsLoadingContacts(true)
      const contactsResponse = await apiService.getContacts()
      if (isApiSuccess(contactsResponse) && contactsResponse.data) {
        const contactsList = (contactsResponse.data as any).items ?? contactsResponse.data
        const contactsArray = Array.isArray(contactsList) ? contactsList : []
        
        // Add initial field to contacts
        const contactsWithInitials = contactsArray.map(contact => ({
          ...contact,
          initial: contact.name.charAt(0).toUpperCase()
        }))
        
        setContacts(contactsWithInitials)
        
        // Update local storage
        for (const contact of contactsWithInitials) {
          await storage.local.set('contacts', {
            id: contact.id,
            name: contact.name,
            email: contact.email || '',
            phone: contact.phone,
            phoneHash: '', // We don't have phoneNumberHash in the Contact type
            avatar: '',
            hasAccount: true,
            isFavorite: false,
            lastInteraction: Date.now(),
            syncedAt: Date.now()
          })
        }
      }
      setIsLoadingContacts(false)
    } catch (err) {
      setError("Failed to load data. Please try again.")
      logError("Error loading initial data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [authStatus, storage, user?.id])

  // Refresh data
  const refreshData = useCallback(async () => {
    info('[DataContext] Refreshing data...')
    if (authStatus === AuthStatus.Authenticated) {
      await loadInitialData()
    }
  }, [authStatus, loadInitialData])

  // Load data based on AuthContext state changes
  useEffect(() => {
    if (authStatus === AuthStatus.Authenticated && sessionStatus === SessionStatus.Active) {
      // If authenticated, load data
      info("[DataContext] User authenticated, loading initial data...")
      loadInitialData()
      
      // Start background sync
      backgroundSync.start()
    } else if (authStatus === AuthStatus.Unauthenticated) {
      // If unauthenticated, clear data
      info("[DataContext] User unauthenticated, clearing data...")
      clearDataState()
      
      // Stop background sync
      backgroundSync.stop()
    }
  }, [authStatus, sessionStatus, loadInitialData, clearDataState])

  // Fetch functions - these can be called to refresh specific data
  const fetchUser = useCallback(async () => {
    if (authStatus !== AuthStatus.Authenticated || sessionStatus !== SessionStatus.Active) return
    
    try {
      const response = await apiService.getUser()
      if (isApiSuccess(response) && response.data) {
        setUser(response.data)
      }
    } catch (err) {
      logError("[DataContext] Error fetching user:", err)
    }
  }, [authStatus, sessionStatus])

  const fetchTransactions = useCallback(async () => {
    if (authStatus !== AuthStatus.Authenticated || sessionStatus !== SessionStatus.Active) return
    
    try {
      setIsLoadingTransactions(true)
      const response = await apiService.getTransactions()
      if (isApiSuccess(response) && response.data) {
        const txList = (response.data as any).items ?? response.data
        setTransactions(Array.isArray(txList) ? txList : [])
      }
    } catch (err) {
      logError("[DataContext] Error fetching transactions:", err)
    } finally {
      setIsLoadingTransactions(false)
    }
  }, [authStatus, sessionStatus])

  const fetchContacts = useCallback(async () => {
    if (authStatus !== AuthStatus.Authenticated || sessionStatus !== SessionStatus.Active) return
    
    try {
      setIsLoadingContacts(true)
      const contactsResponse = await apiService.getContacts()
      if (isApiSuccess(contactsResponse) && contactsResponse.data) {
        const contactsList = (contactsResponse.data as any).items ?? contactsResponse.data
        const contactsArray = Array.isArray(contactsList) ? contactsList : []
        
        // Add initial field to contacts
        const contactsWithInitials = contactsArray.map(contact => ({
          ...contact,
          initial: contact.name.charAt(0).toUpperCase()
        }))
        
        setContacts(contactsWithInitials)
      }
    } catch (err) {
      logError("[DataContext] Error fetching contacts:", err)
    } finally {
      setIsLoadingContacts(false)
    }
  }, [authStatus, sessionStatus])

  // Utility method to update balance (called when adding a new transaction)
  const updateBalance = useCallback((newAvailableBalance: number) => {
    setBalance((prev) => prev ? { ...prev, available: newAvailableBalance } : null)
  }, [])

  // Utility method to add a new transaction (for real-time updates)
  const addTransaction = useCallback((newTransaction: Transaction) => {
    setTransactions((prev) => [newTransaction, ...prev])
  }, [])

  // Format currency (default formatter - components should use more specific formatters)
  const formatCurrency = useCallback((amount: number, currency?: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount)
  }, [])

  // Format date (default formatter - components should use more specific formatters)
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }, [])

  const value: DataContextType = {
    user,
    isLoading,
    isLoadingTransactions,
    isLoadingContacts,
    isRefreshing,
    error,
    balance,
    transactions,
    contacts,
    fetchUser,
    fetchTransactions,
    fetchContacts,
    searchContacts: (query: string) => contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase())),
    formatCurrency,
    formatDate,
    updateBalance,
    addTransaction,
  }

  return (
    <DataContext.Provider value={value}>
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
