// platform/local-db-types.ts
// Common types and interfaces for local database implementations

export interface LocalDatabase {
  userProfile: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    avatar?: string
    country?: string
    address?: string
    dateOfBirth?: string  // ISO 8601 format: YYYY-MM-DD
    gender?: 'male' | 'female' | 'other'
    lastUpdated: number
  }
  
  contacts: {
    id: string
    name: string
    phone: string
    phoneHash: string
    email?: string
    avatar?: string
    lastInteraction?: number
    isFavorite: boolean
    syncedAt: number
    hasAccount?: boolean
  }
  
  recentTransactions: {
    id: string
    type: string
    amount: number
    currency: string
    status: string
    createdAt: string  // ISO 8601 format
    recipientId?: string
    senderId?: string
    recipientName?: string
    senderName?: string
    note?: string
    localOnly?: boolean
    syncedAt: number  // timestamp
  }
  
  syncMetadata: {
    id: string;
    lastSync: number;
    status: 'syncing' | 'synced' | 'error';
  };
  
  balance: {
    id: string;
    symbol: string;
    total: number;
    available: number;
    pending: number;
    lastUpdated: number;
  };
  
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
