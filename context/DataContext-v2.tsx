// Enhanced DataContext with local-first architecture and atomic transactions

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadPlatform } from '@/platform';
import { LocalDatabaseManager, LocalDatabase } from '@/platform/local-db/local-db-types';
import { StorageManagerV2 } from '@/platform/storage/storage-manager-v2';
import { UserRepository } from '@/platform/data-layer/repositories/user-repository';
import { userService } from '@/services/user-service';
import { transactionService } from '@/services/transaction-service';
import { walletService } from '@/services/wallet-service';
import { contactService } from '@/services/contact-service';
import { WalletBalance, Transaction, Contact } from '@/types';
import { useAuth } from '@/context/auth/AuthContext';
import { AuthStatus } from '@/context/auth/auth-state-machine';

interface DataContextValue {
  isInitialized: boolean;
  
  // User Profile
  userProfile: LocalDatabase['userProfile'] | undefined;
  isLoadingProfile: boolean;
  updateProfile: (updates: Partial<LocalDatabase['userProfile']>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Balance
  balance: WalletBalance | null;
  isLoadingBalance: boolean;
  refreshBalance: () => Promise<void>;
  
  // Transactions
  transactions: Transaction[];
  transactionsCursor: string | null;
  isLoadingTransactions: boolean;
  loadMoreTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  getTransaction: (id: string) => Promise<Transaction | null>;
  
  // Contacts
  contacts: Contact[];
  isLoadingContacts: boolean;
  addContact: (contact: Omit<Contact, 'id' | 'initial'>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  refreshContacts: () => Promise<void>;
  
  // Sync Status
  syncStatus: {
    pendingCount: number;
    hasFailures: boolean;
    lastSyncTime: number;
    syncStatus: 'syncing' | 'synced' | 'error' | 'idle' | 'paused';
  };
  forceSyncNow: () => Promise<void>;
  
  // Utility methods
  clearAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { authStatus } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [localDb, setLocalDb] = useState<LocalDatabaseManager | null>(null);
  const [storageManager, setStorageManager] = useState<StorageManagerV2 | null>(null);
  const [userRepository, setUserRepository] = useState<UserRepository | null>(null);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<LocalDatabase['userProfile'] | undefined>();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  // Balance state
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsCursor, setTransactionsCursor] = useState<string | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  
  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  // Sync status state
  const [syncStatus, setSyncStatus] = useState<{
    pendingCount: number;
    hasFailures: boolean;
    lastSyncTime: number;
    syncStatus: 'syncing' | 'synced' | 'error' | 'idle' | 'paused';
  }>({
    pendingCount: 0,
    hasFailures: false,
    lastSyncTime: 0,
    syncStatus: 'synced'
  });
  
  // Initialize database and repositories
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Get local database instance
        const platform = await loadPlatform();
        const db = await platform.getLocalDB();
        setLocalDb(db);
        
        // Create storage manager with API services
        const apiServices = {
          user: userService,
          transaction: transactionService,
          wallet: walletService,
          contact: contactService
        };
        const storage = new StorageManagerV2(db, apiServices);
        setStorageManager(storage);
        
        // Create repositories
        const userRepo = new UserRepository(storage);
        setUserRepository(userRepo);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize DataContext:', error);
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
    if (!isInitialized || authStatus !== AuthStatus.Authenticated) {
      return;
    }
    
    // Load all data
    loadInitialData();
  }, [isInitialized, authStatus]);
  
  // Update sync status periodically
  useEffect(() => {
    if (!storageManager) return;
    
    const updateSyncStatus = async () => {
      const status = await storageManager.getSyncStatus();
      setSyncStatus({
        pendingCount: status.pendingCount,
        hasFailures: status.hasFailures,
        lastSyncTime: status.lastSyncTime,
        syncStatus: status.syncStatus
      });
    };
    
    // Update every 5 seconds
    const interval = setInterval(updateSyncStatus, 5000);
    
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
    refreshTransactions();
    
    // Load contacts
    refreshContacts();
    
    // Get initial sync status
    const status = await storageManager.getSyncStatus();
    setSyncStatus({
      pendingCount: status.pendingCount,
      hasFailures: status.hasFailures,
      lastSyncTime: status.lastSyncTime,
      syncStatus: status.syncStatus
    });
  };
  
  // Update user profile with optimistic updates
  const updateProfile = async (updates: Partial<LocalDatabase['userProfile']>) => {
    if (!userRepository) {
      throw new Error('Data layer not initialized');
    }
    
    try {
      // Optimistically update UI
      setUserProfile(prev => prev ? { ...prev, ...updates } : undefined);
      
      // Save to local and queue for sync
      const updatedProfile = await userRepository.saveProfile(updates);
      setUserProfile(updatedProfile);
      
      // Update sync status
      if (storageManager) {
        const status = await storageManager.getSyncStatus();
        setSyncStatus({
          pendingCount: status.pendingCount,
          hasFailures: status.hasFailures,
          lastSyncTime: status.lastSyncTime,
          syncStatus: status.syncStatus
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      const profile = await userRepository.getProfile();
      setUserProfile(profile);
      throw error;
    }
  };
  
  // Refresh profile from remote
  const refreshProfile = async () => {
    if (!userRepository) return;
    
    setIsLoadingProfile(true);
    try {
      const profile = await userRepository.getProfile();
      setUserProfile(profile);
    } finally {
      setIsLoadingProfile(false);
    }
  };
  
  // Refresh balance
  const refreshBalance = async () => {
    if (!localDb) return;
    
    setIsLoadingBalance(true);
    try {
      const response = await walletService.getBalance();
      if (response.data) {
        setBalance(response.data);
        // Store in local DB
        await localDb.set('balance', {
          id: 'primary',
          ...response.data,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };
  
  // Refresh transactions
  const refreshTransactions = async () => {
    if (!localDb) return;
    
    setIsLoadingTransactions(true);
    try {
      const response = await transactionService.listTransactions(undefined, { limit: 20 });
      if (response.data) {
        setTransactions(response.data.items);
        setTransactionsCursor(response.data.nextCursor || null);
        
        // Store recent transactions in local DB
        for (const tx of response.data.items.slice(0, 10)) {
          await localDb.set('recentTransactions', {
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            currency: tx.assetSymbol || 'USD',
            status: tx.status,
            createdAt: tx.date || new Date().toISOString(),
            recipientId: tx.recipientId,
            senderId: tx.senderId,
            recipientName: tx.type === 'send' ? tx.name : undefined,
            senderName: tx.type === 'receive' ? tx.name : undefined,
            note: tx.note,
            localOnly: false,
            syncedAt: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  // Load more transactions
  const loadMoreTransactions = async () => {
    if (!transactionsCursor || isLoadingTransactions) return;
    
    setIsLoadingTransactions(true);
    try {
      const response = await transactionService.listTransactions(undefined, { 
        limit: 20, 
        cursor: transactionsCursor 
      });
      if (response.data) {
        setTransactions(prev => [...prev, ...response.data!.items]);
        setTransactionsCursor(response.data.nextCursor || null);
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  // Get single transaction
  const getTransaction = async (id: string): Promise<Transaction | null> => {
    const response = await transactionService.getTransaction(id);
    return response || null;
  };
  
  // Refresh contacts
  const refreshContacts = async () => {
    if (!localDb) return;
    
    setIsLoadingContacts(true);
    try {
      const response = await contactService.getContacts();
      if (response.data) {
        setContacts(response.data.items);
        
        // Store in local DB
        for (const contact of response.data.items) {
          const platform = await loadPlatform();
          const phoneHash = contact.phone ? await platform.ContactHelpers.hashPhoneNumber(contact.phone) : '';
          
          await localDb.set('contacts', {
            id: contact.id,
            name: contact.name,
            phone: contact.phone || '',
            phoneHash,
            email: contact.email || undefined,
            lastInteraction: Date.now(),
            isFavorite: false,
            syncedAt: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Failed to refresh contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };
  
  // Add contact
  const addContact = async (contact: Omit<Contact, 'id' | 'initial'>): Promise<Contact> => {
    if (!localDb) throw new Error('Database not initialized');
    
    const platform = await loadPlatform();
    
    // Generate a temporary ID for local storage
    const newContact: Contact = {
      id: `temp_${Date.now()}`,
      ...contact,
      initial: contact.name.charAt(0).toUpperCase()
    };
    
    // Store locally first
    const phoneHash = contact.phone ? await platform.ContactHelpers.hashPhoneNumber(contact.phone) : '';
    await localDb.set('contacts', {
      id: newContact.id,
      name: newContact.name,
      phone: newContact.phone || '',
      phoneHash,
      email: newContact.email || undefined,
      lastInteraction: Date.now(),
      isFavorite: false,
      syncedAt: Date.now()
    });
    
    // Update state
    setContacts(prev => [...prev, newContact]);
    
    // Note: Real API integration would happen here through a repository
    // For now, this is just local storage
    return newContact;
  };
  
  // Update contact
  const updateContact = async (id: string, updates: Partial<Contact>): Promise<Contact> => {
    if (!localDb) throw new Error('Database not initialized');
    
    const existing = await localDb.get('contacts', id);
    if (!existing) throw new Error('Contact not found');
    
    const platform = await loadPlatform();
    
    // Update local storage
    await localDb.set('contacts', {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      phoneHash: updates.phone ? await platform.ContactHelpers.hashPhoneNumber(updates.phone) : existing.phoneHash
    });
    
    // Create updated contact object
    const updatedContact = contacts.find(c => c.id === id);
    if (!updatedContact) throw new Error('Contact not found in state');
    
    const resultContact = { ...updatedContact, ...updates };
    
    // Update state
    setContacts(prev => prev.map(c => c.id === id ? resultContact : c));
    
    // Note: Real API integration would happen here through a repository
    return resultContact;
  };
  
  // Delete contact
  const deleteContact = async (id: string) => {
    if (!localDb) return;
    
    // Delete from local storage
    await localDb.delete('contacts', id);
    
    // Update state
    setContacts(prev => prev.filter(c => c.id !== id));
    
    // Note: Real API integration would happen here through a repository
  };
  
  // Force sync now
  const forceSyncNow = async () => {
    if (!storageManager) return;
    
    await storageManager.processSyncQueue();
    
    // Update sync status
    const status = await storageManager.getSyncStatus();
    setSyncStatus({
      pendingCount: status.pendingCount,
      hasFailures: status.hasFailures,
      lastSyncTime: status.lastSyncTime,
      syncStatus: status.syncStatus
    });
  };
  
  // Clear all data
  const clearAllData = async () => {
    if (!localDb) return;
    
    // Clear all stores
    await localDb.clear('userProfile');
    await localDb.clear('balance');
    await localDb.clear('recentTransactions');
    await localDb.clear('contacts');
    await localDb.clear('syncQueue');
    await localDb.clear('failedSyncs');
    
    // Reset state
    setUserProfile(undefined);
    setBalance(null);
    setTransactions([]);
    setContacts([]);
    setTransactionsCursor(null);
  };
  
  const contextValue: DataContextValue = {
    isInitialized,
    
    // User Profile
    userProfile,
    isLoadingProfile,
    updateProfile,
    refreshProfile,
    
    // Balance
    balance,
    isLoadingBalance,
    refreshBalance,
    
    // Transactions
    transactions,
    transactionsCursor,
    isLoadingTransactions,
    loadMoreTransactions,
    refreshTransactions,
    getTransaction,
    
    // Contacts
    contacts,
    isLoadingContacts,
    addContact,
    updateContact,
    deleteContact,
    refreshContacts,
    
    // Sync
    syncStatus,
    forceSyncNow,
    
    // Utilities
    clearAllData
  };
  
  return (
    <DataContext.Provider value={contextValue}>
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
