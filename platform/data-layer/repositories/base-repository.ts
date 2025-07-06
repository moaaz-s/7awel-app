// Base Repository with transaction support

import { LocalDatabaseManager, StoreName, TransactionContext } from '../../local-db/local-db-types';
import { StorageManagerV2 as StorageManager } from '../../../platform/storage/storage-manager-v2';
import { RepositoryOptions } from '../types';

export abstract class BaseRepository<T extends StoreName> {
  protected storeName: T;
  
  constructor(
    protected storageManager: StorageManager,
    storeName: T,
    protected options?: RepositoryOptions
  ) {
    this.storeName = storeName;
  }
  
  /**
   * Execute operations within a transaction
   * This ensures atomicity for complex operations
   */
  protected async executeInTransaction<R>(
    callback: (tx: TransactionContext) => Promise<R>,
    storeNames?: StoreName[]
  ): Promise<R> {
    const stores = storeNames || [this.storeName];
    return this.storageManager.local.transaction(
      stores,
      'readwrite',
      callback
    );
  }
  
  /**
   * Queue item for sync with automatic retry
   */
  protected async queueForSync(
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    await this.storageManager.queueForSync(this.storeName, operation, data);
  }
  
  /**
   * Handle conflicts between local and remote data
   */
  protected resolveConflict<D>(local: D, remote: D): D {
    if (!this.options?.conflictResolution) {
      // Default: remote wins
      return remote;
    }
    
    switch (this.options.conflictResolution.strategy) {
      case 'local-wins':
        return local;
      case 'remote-wins':
        return remote;
      case 'merge':
        if (this.options.conflictResolution.resolver) {
          return this.options.conflictResolution.resolver(local, remote);
        }
        return remote; // fallback
      case 'manual':
        // In a real app, this would queue for manual resolution
        console.warn('Manual conflict resolution required', { local, remote });
        return local; // keep local until resolved
      default:
        return remote;
    }
  }
}
