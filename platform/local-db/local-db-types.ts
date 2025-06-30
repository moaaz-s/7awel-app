// platform/local-db-types.ts
// Common types and interfaces for local database implementations

import { Transaction, User, Contact, AssetBalance } from '@/types';

// Extend core DTOs with optional local-only metadata
export interface LocalTransaction extends Transaction {
  /** Timestamp when the record was last synced */
  syncedAt?: number;
  /** Mark record as not yet pushed to backend */
  localOnly?: boolean;


}

export interface LocalUser extends User {
  /** Timestamp when profile was updated in local DB */
  lastUpdated?: number;
}

export interface LocalContact extends Contact {
  phoneHash?: string;
  isFavorite?: boolean;
  syncedAt?: number;
  hasAccount?: boolean;
  lastInteraction?: number;
  avatar?: string;
}

export interface LocalBalance extends AssetBalance {
  id: string;
  lastUpdated: number;
}

export interface LocalDatabase {
  userProfile: LocalUser;
  
  contacts: LocalContact;
  
  recentTransactions: LocalTransaction;
  
  syncMetadata: {
    id: string;
    lastSync: number;
    status: 'syncing' | 'synced' | 'error';
  };
  
  balance: LocalBalance;
  
  syncQueue: {
    id: string;
    storeName: string;
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    retryCount: number;
    lastRetryAt?: number;
    error?: string;
  };
  
  failedSyncs: {
    id: string;
    storeName: string;
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    retryCount: number;
    lastRetryAt: number;
    error: string;
    movedToFailedAt: number;
  };
}

export type StoreName = keyof LocalDatabase;

export interface LocalDatabaseManager {
  init(): Promise<void>;
  get<T extends StoreName>(storeName: T, key: string): Promise<LocalDatabase[T] | undefined>;
  getAll<T extends StoreName>(storeName: T): Promise<LocalDatabase[T][]>;
  set<T extends StoreName>(storeName: T, value: LocalDatabase[T]): Promise<void>;
  delete<T extends StoreName>(storeName: T, key: string): Promise<void>;
  clear<T extends StoreName>(storeName: T): Promise<void>;
  query?<T extends StoreName>(storeName: T, index: string, value: any): Promise<LocalDatabase[T][]>;
  
  // Transaction support
  transaction<T>(
    storeNames: StoreName[], 
    mode: 'readonly' | 'readwrite',
    callback: (tx: TransactionContext) => Promise<T>
  ): Promise<T>;
}

export interface TransactionContext {
  get<T extends StoreName>(storeName: T, key: string): Promise<LocalDatabase[T] | undefined>;
  getAll<T extends StoreName>(storeName: T): Promise<LocalDatabase[T][]>;
  set<T extends StoreName>(storeName: T, value: LocalDatabase[T]): Promise<void>;
  delete<T extends StoreName>(storeName: T, key: string): Promise<void>;
}
