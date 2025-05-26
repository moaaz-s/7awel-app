// Data Layer Types

import { LocalDatabase } from '../local-db/local-db-types';
import { Transaction } from '@/types';

export interface DataLayerConfig {
  enableAutoSync?: boolean;
  syncIntervalMs?: number;
  maxRetries?: number;
  offlineQueueLimit?: number;
}

export interface SyncResult {
  success: boolean;
  syncedAt?: number;
  error?: string;
  itemsSynced?: number;
}

export interface DataLayerTransaction {
  id: string;
  operations: Array<{
    storeName: keyof LocalDatabase;
    operation: 'create' | 'update' | 'delete';
    data: any;
  }>;
}

export interface ConflictResolution<T> {
  strategy: 'local-wins' | 'remote-wins' | 'merge' | 'manual';
  resolver?: (local: T, remote: T) => T;
}

export interface RepositoryOptions {
  conflictResolution?: ConflictResolution<any>;
  cacheEnabled?: boolean;
  cacheTTLMs?: number;
}
