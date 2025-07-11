// platform/local-db-types.ts
// Common types and interfaces for local database implementations

import { Transaction, User, Contact, AssetBalance } from '@/types';

// Extend core DTOs with optional local-only metadata
export interface LocalTransaction extends Transaction {
  /** Timestamp when the record was last synced */
  syncedAt: number;
  /** Mark record as not yet pushed to backend */
  localOnly?: boolean;
  /** Blockchain network (e.g., 'solana-mainnet', 'solana-devnet') */
  network?: string;
  /** Raw blockchain transaction data */
  rawBlockchainData?: any;
}

export interface LocalUser extends User {
  /** Timestamp when profile was updated in local DB */
  lastUpdated: number;
}

export interface LocalContact extends Contact {
  /** Timestamp when contact was last synced */
  syncedAt: number;
  /** Whether contact is marked as favorite */
  isFavorite: boolean;
  /** Timestamp of last interaction */
  lastInteraction?: number;
  /** Contact avatar URL */
  avatar?: string;
  /** Whether contact has a 7awel account */
  hasAccount?: boolean;
  /** User ID if contact has a 7awel account */
  linkedUserId?: string;
}

export interface LocalBalance extends AssetBalance {
  /** Unique identifier for the balance record */
  id: string;
  /** Timestamp when balance was last updated */
  lastUpdated: number;
  /** Blockchain mint address (for tokens) - now part of AssetBalance */
  // mint?: string; // Already in AssetBalance
  /** Token decimals (SOL=9, stablecoins=6) - now part of AssetBalance */  
  // decimals?: number; // Already in AssetBalance
  /** Available balance for spending */
  available?: number;
  /** Pending balance (locked in transactions) */
  pending?: number;
  /** Total balance (available + pending) */
  total?: number;
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
