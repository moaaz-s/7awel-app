// Enhanced DataContext with local-first architecture and atomic transactions

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadPlatform } from '@/platform';
import { LocalDatabaseManager, LocalDatabase } from '@/platform/local-db/local-db-types';
import { StorageManagerV2 as StorageManager } from '@/platform/storage/storage-manager-v2';
import { UserRepository } from '@/platform/data-layer/repositories/user-repository';
// Services replaced by repositories
import { userService } from '@/services/user-service';
import { WalletRepository } from '@/platform/data-layer/repositories/wallet-repository';
import { TransactionRepository } from '@/platform/data-layer/repositories/transaction-repository';
import { ContactRepository } from '@/platform/data-layer/repositories/contact-repository';
// services needed only for StorageManager sync
import { transactionService } from '@/services/transaction-service';
import { walletService } from '@/services/wallet-service';
import { contactService } from '@/services/contact-service';
import { WalletBalance, Transaction, Contact } from '@/types';
import { useAuth } from '@/context/auth/AuthContext';
import { AuthStatus } from '@/context/auth/auth-state-machine';
import { SYNC_STATUS_UPDATE_INTERVAL_MS } from '@/constants/db';
import { info, error as logError } from '@/utils/logger';

interface DataContextValue {
  isInitialized: boolean;
  
  // User Profile
  userProfile: LocalDatabase['userProfile'] | undefined;
  user: LocalDatabase['userProfile'] | undefined; // Alias for backward compatibility
  isLoadingProfile: boolean;
  updateProfile: (updates: Partial<LocalDatabase['userProfile']>) => Promise<void>;
  updateUser: (updates: Partial<LocalDatabase['userProfile']>) => Promise<void>; // Alias for backward compatibility
  refreshProfile: () => Promise<void>;
  
  // Balance
  balance: WalletBalance | null;
  isLoadingBalance: boolean;
  refreshBalance: () => Promise<void>;
  updateBalance: (newAvailableBalance: number) => void; // For backward compatibility
  
  // Transactions
  transactions: Transaction[];
  transactionsCursor: string | null;
  isLoadingTransactions: boolean;
  loadMoreTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  getTransaction: (id: string) => Promise<Transaction | null>;
  addTransaction: (newTransaction: Transaction) => void; // For backward compatibility
  
  // Contacts
  contacts: Contact[];
  isLoadingContacts: boolean;
  addContact: (contact: Omit<Contact, 'id' | 'initial'>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  searchContacts: (query: string) => Contact[]; // For backward compatibility
  
  // Sync Status
  syncStatus: {
    pendingCount: number;
    hasFailures: boolean;
    lastSyncTime: number;
    syncStatus: 'syncing' | 'synced' | 'error' | 'idle' | 'paused';
  };
  forceSyncNow: () => Promise<void>;
  
  // State flags for backward compatibility
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Utility methods
  clearAllData: () => Promise<void>;
  formatCurrency: (amount: number, currency?: string) => string; // For backward compatibility
  formatDate: (dateString: string) => string; // For backward compatibility
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { authStatus, isTokenReady } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [localDb, setLocalDb] = useState<LocalDatabaseManager | null>(null);
  const [storageManager, setStorageManager] = useState<StorageManager | null>(null);
  const [userRepository, setUserRepository] = useState<UserRepository | null>(null);
  // New repositories
  const [walletRepository, setWalletRepository] = useState<WalletRepository | null>(null);
  const [transactionRepository, setTransactionRepository] = useState<TransactionRepository | null>(null);
  const [contactRepository, setContactRepository] = useState<ContactRepository | null>(null);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<LocalDatabase['userProfile'] | undefined>();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  // Balance state
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsCursor, setTransactionsCursor] = useState<string | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  // Sync status state
  const [syncStatus, setSyncStatus] = useState({
    pendingCount: 0,
    hasFailures: false,
    lastSyncTime: 0,
    syncStatus: 'idle' as 'syncing' | 'synced' | 'error' | 'idle' | 'paused',
  });
  
  // Additional state for backward compatibility
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const updateSyncStatus = useCallback(async () => {
    if (!storageManager) return;
    const status = await storageManager.getSyncStatus();
    setSyncStatus({
      pendingCount: status.pendingCount,
      hasFailures: status.hasFailures,
      lastSyncTime: status.lastSyncTime,
      syncStatus: status.syncStatus
    });
  }, [storageManager]);
  
  // Initialize database and repositories
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Get local database instance
        const platform = await loadPlatform();
        const db = await platform.getLocalDB();
        setLocalDb(db);
        
        // Create storage manager (still pass legacy services to preserve sync logic)
        const apiServices = {
          user: userService,
          transaction: transactionService,
          wallet: walletService,
          contact: contactService,
        };
        const storage = new StorageManager(db, apiServices);
        setStorageManager(storage);

        // Instantiate repositories
        const userRepo = new UserRepository(storage);
        const walletRepo = new WalletRepository(storage);
        const txnRepo = new TransactionRepository(storage);
        const contactRepo = new ContactRepository(storage);

        setUserRepository(userRepo);
        setWalletRepository(walletRepo);
        setTransactionRepository(txnRepo);
        setContactRepository(contactRepo);
        setIsInitialized(true);
      } catch (error) {
        logError('Failed to initialize DataContext:', error);
      }
    };
    
    initializeData();
    
    return () => {
      // Cleanup storage manager
      storageManager?.destroy();
    };
  }, []);
  
  // Load data when authenticated
  useEffect(() => {
    info('[DataContext] Auth status:', authStatus, 'Initialized:', isInitialized);
    if (!isInitialized || !storageManager || !isTokenReady) {
      return;
    }
    
    // Start sync only when authenticated
    if (authStatus === AuthStatus.Authenticated) {
      info('[DataContext] Starting sync and loading initial data...');
      storageManager.startSync();
      loadInitialData();
    } else {
      info('[DataContext] Stopping sync - not authenticated');
      storageManager.stopSync();
    }
    
    return () => {
      // Cleanup sync when unmounting or auth status changes
      if (storageManager) {
        storageManager.stopSync();
      }
    };
  }, [isInitialized, authStatus, isTokenReady, storageManager]);
  
  // Load user profile when locked (for PinPad welcome message)
  useEffect(() => {
    info('[DataContext] Auth status:', authStatus, 'Initialized:', isInitialized);
    if (!isInitialized || !storageManager || [AuthStatus.Authenticated].includes(authStatus)) {
      return;
    }
    
    // Only load profile from local storage when locked
    const loadProfileForLockScreen = async () => {
      try {
        info('[DataContext] Loading profile from local storage for lock screen...');
        // Only load from local storage, don't make API calls
        const localProfile = userRepository ? await userRepository.getLocalProfile() : undefined;
        info('[DataContext] Local profile loaded:', localProfile);
        setUserProfile(localProfile);
      } catch (err) {
        logError('Failed to load profile for lock screen:', err);
      }
    };
    
    loadProfileForLockScreen();
  }, [isInitialized, storageManager, authStatus, userRepository]);
  
  // Update sync status periodically
  useEffect(() => {    
    // Update every 5 seconds
    const interval = setInterval(updateSyncStatus, SYNC_STATUS_UPDATE_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [storageManager]);
  
  // Load initial data
  const loadInitialData = async () => {
    if (!userRepository || !storageManager || !localDb) return;
    
    // Load profile
    setIsLoadingProfile(true);
    try {
      const profile = await userRepository.getProfile();
      setUserProfile(profile);
    } finally {
      setIsLoadingProfile(false);
    }
    
    // Load balance
    refreshBalance();

    // Load transactions
    loadLocalTransactions();
    refreshTransactions();

    // Load contacts
    loadLocalContacts();
    refreshContacts();
    
    // Get initial sync status
    updateSyncStatus();
  };
  
  // Load transactions from local storage
  const loadLocalTransactions = async () => {
    if (!transactionRepository) return;
    const local = await transactionRepository.listLocal();
    setTransactions(local);
  };
  
  // Load contacts from local storage
  const loadLocalContacts = async () => {
    if (!contactRepository) return;
    const local = await contactRepository.listLocal();
    setContacts(local as any);
  };
  
  // Update user profile with optimistic updates
  const updateProfile = async (updates: Partial<LocalDatabase['userProfile']>) => {
    if (!userRepository || !userProfile) return;
    
    try {
      setIsLoadingProfile(true);
      setError(null);
      await userRepository.saveProfile({ ...userProfile, ...updates });
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    } finally {
      setIsLoadingProfile(false);
    }
  };
  
  // Refresh profile from remote
  const refreshProfile = async () => {
    if (!userRepository) return;
    
    try {
      setIsLoadingProfile(true);
      setError(null);
      const profile = await userRepository.getProfile();
      setUserProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };
  
  // Refresh balance
  const refreshBalance = async () => {
    if (!walletRepository) return;
    try {
      setIsLoadingBalance(true);
      setError(null);
      const bal = await walletRepository.getPrimaryBalance();
      if (bal) {
        setBalance(bal);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh balance');
    } finally {
      setIsLoadingBalance(false);
    }
  };
  
  // Refresh transactions
  const refreshTransactions = async () => {
    if (!transactionRepository) return;
    setIsLoadingTransactions(true);
    try {
      const paginated = await transactionRepository.listRemote(20);
      setTransactions(paginated.items);
      setTransactionsCursor(paginated.nextCursor || null);
    } catch (error) {
      logError('Failed to refresh transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  // Load more transactions
  const loadMoreTransactions = async () => {
    if (!transactionsCursor || isLoadingTransactions || !transactionRepository) return;
    setIsLoadingTransactions(true);
    try {
      const page = await transactionRepository.listRemote(20, transactionsCursor);
      setTransactions(prev => [...prev, ...page.items]);
      setTransactionsCursor(page.nextCursor || null);
    } catch (error) {
      logError('Failed to load more transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  // Get single transaction
  const getTransaction = async (id: string): Promise<Transaction | null> => {
    if (!transactionRepository) return null;
    return transactionRepository.getTransaction(id);
  };
  
  // Refresh contacts
  const refreshContacts = async () => {
    if (!contactRepository) return;
    setIsLoadingContacts(true);
    try {
      const fresh = await contactRepository.refreshRemote();
      setContacts(fresh as any);
    } catch (error) {
      logError('Failed to refresh contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };
  
  // Add contact
  const addContact = async (contact: Omit<Contact, 'id' | 'initial'>): Promise<Contact> => {
    if (!contactRepository) throw new Error('Repository not ready');
    try {
      setError(null);
      const created = await contactRepository.add(contact);
      await loadLocalContacts();
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
      throw err;
    }
  };
  
  // Update contact
  const updateContact = async (id: string, updates: Partial<Contact>): Promise<Contact> => {
    if (!contactRepository) throw new Error('Repository not ready');
    const updated = await contactRepository.update(id, updates);
    setContacts(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  };
  
  // Delete contact
  const deleteContact = async (id: string) => {
    if (!contactRepository) return;
    await contactRepository.remove(id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };
  
  // Force sync now
  const forceSyncNow = async () => {
    if (!storageManager) return;
    
    await storageManager.processSyncQueue();
    
    // Update sync status
    await updateSyncStatus();
  };
  
  // Clear all data
  const clearAllData = async () => {
    if (!storageManager) return;
    const stores = ['userProfile', 'balance', 'recentTransactions', 'contacts', 'syncQueue', 'failedSyncs'] as const;
    for (const s of stores) {
      await storageManager.local.clear(s as any);
    }
    // Reset state
    setUserProfile(undefined);
    setBalance(null);
    setTransactions([]);
    setContacts([]);
    setTransactionsCursor(null);
  };
  
  // Backward compatibility methods
  const updateBalance = (newAvailableBalance: number) => {
    setBalance(prev => prev ? { ...prev, available: newAvailableBalance } : null);
  };
  
  const addTransaction = (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
  };
  
  const searchContacts = (query: string) => {
    if (!query) return contacts;
    const lowerQuery = query.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.phone.includes(query)
    );
  };
  
  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // Derived state for backward compatibility
  const isLoading = isLoadingProfile || (authStatus === AuthStatus.Authenticated && !isInitialized);
  
  const value: DataContextValue = {
    isInitialized,
    
    // User Profile
    userProfile,
    user: userProfile, // Alias
    isLoadingProfile,
    updateProfile,
    updateUser: updateProfile, // Alias
    refreshProfile,
    
    // Balance
    balance,
    isLoadingBalance,
    refreshBalance,
    updateBalance,
    
    // Transactions
    transactions,
    transactionsCursor,
    isLoadingTransactions,
    loadMoreTransactions,
    refreshTransactions,
    getTransaction,
    addTransaction,
    
    // Contacts
    contacts,
    isLoadingContacts,
    addContact,
    updateContact,
    deleteContact,
    refreshContacts,
    searchContacts,
    
    // Sync Status
    syncStatus,
    forceSyncNow,
    
    // State flags
    isLoading,
    isRefreshing,
    error,
    
    // Utility methods
    clearAllData,
    formatCurrency,
    formatDate
  };
  
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
