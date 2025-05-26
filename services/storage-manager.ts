// services/storage-manager.ts
import { httpClient } from "@/services/http-client";
import { info, error as logError } from "@/utils/logger";
import { loadPlatform } from "@/platform";
import type { ApiResponse } from "@/types";
import type { LocalDatabase, StoreName, LocalDatabaseManager } from "@/platform/local-db/local-db-types";
import { isApiSuccess } from "@/utils/api-utils";

export type { LocalDatabase, StoreName } from "@/platform/local-db/local-db-types";

export enum SyncStrategy {
  LOCAL_FIRST = 'local_first',
  REMOTE_FIRST = 'remote_first',
  MERGE = 'merge',
  OVERWRITE_LOCAL = 'overwrite_local',
  OVERWRITE_REMOTE = 'overwrite_remote'
}

interface LocalStorageOperations {
  get<T extends StoreName>(storeName: T, key: string): Promise<LocalDatabase[T] | undefined>
  getAll<T extends StoreName>(storeName: T): Promise<LocalDatabase[T][]>
  set<T extends StoreName>(storeName: T, value: LocalDatabase[T]): Promise<void>
  delete<T extends StoreName>(storeName: T, key: string): Promise<void>
  clear<T extends StoreName>(storeName: T): Promise<void>
  query?<T extends StoreName>(storeName: T, indexOrQuery: string, params?: any): Promise<LocalDatabase[T][]>
}

interface RemoteStorageOperations {
  get<T>(endpoint: string, params?: any): Promise<ApiResponse<T>>
  post<T>(endpoint: string, data: any): Promise<ApiResponse<T>>
  put<T>(endpoint: string, data: any): Promise<ApiResponse<T>>
  delete(endpoint: string): Promise<ApiResponse<void>>
}

interface HybridStorageOperations {
  getWithFallback<T extends StoreName>(
    storeName: T,
    key: string,
    remoteEndpoint: string
  ): Promise<LocalDatabase[T] | undefined>
  
  sync<T extends StoreName>(
    storeName: T,
    remoteEndpoint: string,
    strategy: SyncStrategy
  ): Promise<void>
  
  syncSingle<T extends StoreName>(
    storeName: T,
    key: string,
    remoteEndpoint: string,
    strategy: SyncStrategy
  ): Promise<void>
}

export class StorageManager {
  private platform: any;
  private localDB: LocalDatabaseManager | null = null;
  private initialized = false;
  
  private async init() {
    if (this.initialized) return;
    
    this.platform = await loadPlatform();
    this.localDB = await this.platform.getLocalDB();
    this.initialized = true;
  }
  
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
    if (!this.localDB) {
      throw new Error('LocalDB not initialized');
    }
  }
  
  // Local storage operations
  local: LocalStorageOperations = {
    get: async <T extends StoreName>(storeName: T, key: string) => {
      await this.ensureInitialized();
      return this.localDB!.get(storeName, key);
    },
    
    getAll: async <T extends StoreName>(storeName: T) => {
      await this.ensureInitialized();
      return this.localDB!.getAll(storeName);
    },
    
    set: async <T extends StoreName>(storeName: T, value: LocalDatabase[T]) => {
      await this.ensureInitialized();
      return this.localDB!.set(storeName, value);
    },
    
    delete: async <T extends StoreName>(storeName: T, key: string) => {
      await this.ensureInitialized();
      return this.localDB!.delete(storeName, key);
    },
    
    clear: async <T extends StoreName>(storeName: T) => {
      await this.ensureInitialized();
      return this.localDB!.clear(storeName);
    },
    
    query: async <T extends StoreName>(storeName: T, indexOrQuery: string, params?: any) => {
      await this.ensureInitialized();
      if (this.localDB!.query) {
        return this.localDB!.query(storeName, indexOrQuery, params);
      }
      // Fallback for platforms without query support
      const all = await this.localDB!.getAll(storeName);
      return all; // Would need to implement filtering logic here
    }
  };
  
  // Remote storage operations
  remote: RemoteStorageOperations = {
    get: async <T>(endpoint: string, params?: any) => {
      return httpClient.get<T>(endpoint, params);
    },
    
    post: async <T>(endpoint: string, data: any) => {
      return httpClient.post<T>(endpoint, data);
    },
    
    put: async <T>(endpoint: string, data: any) => {
      return httpClient.put<T>(endpoint, data);
    },
    
    delete: async (endpoint: string) => {
      return httpClient.delete(endpoint);
    }
  };
  
  // Hybrid operations
  hybrid: HybridStorageOperations = {
    getWithFallback: async <T extends StoreName>(
      storeName: T,
      key: string,
      remoteEndpoint: string
    ) => {
      // Try local first
      const localData = await this.local.get(storeName, key);
      if (localData) {
        // Check if data is stale (older than 1 hour)
        const metadata = await this.local.get('syncMetadata', 'sync');
        if (metadata && Date.now() - metadata.lastSync < 3600000) {
          return localData;
        }
      }
      
      // Fetch from remote
      try {
        const response = await this.remote.get<LocalDatabase[T]>(`${remoteEndpoint}/${key}`);
        if (isApiSuccess(response) && response.data) {
          // Update local cache
          await this.local.set(storeName, response.data);
          await this.updateSyncMetadata(storeName);
          return response.data;
        }
      } catch (error) {
        logError(`[StorageManager] Failed to fetch from remote: ${remoteEndpoint}`, error);
      }
      
      // Return local data even if stale
      return localData;
    },
    
    sync: async <T extends StoreName>(
      storeName: T,
      remoteEndpoint: string,
      strategy: SyncStrategy
    ) => {
      info(`[StorageManager] Syncing ${storeName} with strategy: ${strategy}`);
      
      switch (strategy) {
        case SyncStrategy.LOCAL_FIRST:
          await this.syncLocalFirst(storeName, remoteEndpoint);
          break;
        case SyncStrategy.REMOTE_FIRST:
          await this.syncRemoteFirst(storeName, remoteEndpoint);
          break;
        case SyncStrategy.MERGE:
          await this.syncMerge(storeName, remoteEndpoint);
          break;
        case SyncStrategy.OVERWRITE_LOCAL:
          await this.syncOverwriteLocal(storeName, remoteEndpoint);
          break;
        case SyncStrategy.OVERWRITE_REMOTE:
          await this.syncOverwriteRemote(storeName, remoteEndpoint);
          break;
      }
      
      await this.updateSyncMetadata(storeName);
    },
    
    syncSingle: async <T extends StoreName>(
      storeName: T,
      key: string,
      remoteEndpoint: string,
      strategy: SyncStrategy
    ) => {
      // Similar to sync but for single items
      const localItem = await this.local.get(storeName, key);
      const remoteResponse = await this.remote.get<LocalDatabase[T]>(`${remoteEndpoint}/${key}`);
      
      if (!isApiSuccess(remoteResponse)) {
        logError(`[StorageManager] Failed to fetch remote item: ${key}`);
        return;
      }
      
      const remoteItem = remoteResponse.data;
      
      switch (strategy) {
        case SyncStrategy.LOCAL_FIRST:
          if (localItem && !remoteItem) {
            await this.remote.post(`${remoteEndpoint}`, localItem);
          }
          break;
        case SyncStrategy.REMOTE_FIRST:
          if (remoteItem) {
            await this.local.set(storeName, remoteItem);
          }
          break;
        // Add other strategies as needed
      }
    }
  };
  
  private async syncLocalFirst<T extends StoreName>(
    storeName: T,
    remoteEndpoint: string
  ) {
    // Get all local items
    const localItems = await this.local.getAll(storeName);
    
    // Push to remote
    for (const item of localItems) {
      try {
        await this.remote.post(remoteEndpoint, item);
      } catch (error) {
        logError(`[StorageManager] Failed to sync item to remote:`, error);
      }
    }
  }
  
  private async syncRemoteFirst<T extends StoreName>(
    storeName: T,
    remoteEndpoint: string
  ) {
    try {
      const response = await this.remote.get<LocalDatabase[T][]>(remoteEndpoint);
      if (isApiSuccess(response) && response.data) {
        // Clear local and replace with remote
        await this.local.clear(storeName);
        for (const item of response.data) {
          await this.local.set(storeName, item);
        }
      }
    } catch (error) {
      logError(`[StorageManager] Failed to sync from remote:`, error);
    }
  }
  
  private async syncMerge<T extends StoreName>(
    storeName: T,
    remoteEndpoint: string
  ) {
    // This is a simplified merge - in reality, you'd want conflict resolution
    const localItems = await this.local.getAll(storeName);
    const response = await this.remote.get<LocalDatabase[T][]>(remoteEndpoint);
    
    if (!isApiSuccess(response) || !response.data) return;
    
    const remoteItems = response.data;
    const mergedMap = new Map();
    
    // Add all local items
    for (const item of localItems) {
      mergedMap.set((item as any).id, item);
    }
    
    // Merge remote items (remote wins on conflict)
    for (const item of remoteItems) {
      mergedMap.set((item as any).id, item);
    }
    
    // Save merged data
    await this.local.clear(storeName);
    for (const item of mergedMap.values()) {
      await this.local.set(storeName, item);
    }
  }
  
  private async syncOverwriteLocal<T extends StoreName>(
    storeName: T,
    remoteEndpoint: string
  ) {
    await this.syncRemoteFirst(storeName, remoteEndpoint);
  }
  
  private async syncOverwriteRemote<T extends StoreName>(
    storeName: T,
    remoteEndpoint: string
  ) {
    // This would need proper API support for batch updates
    const localItems = await this.local.getAll(storeName);
    await this.remote.put(remoteEndpoint, { items: localItems });
  }
  
  private async updateSyncMetadata(entity: string) {
    const metadata: LocalDatabase['syncMetadata'] = {
      id: 'sync',
      lastSync: Date.now(),
      status: 'synced'
    };
    await this.local.set('syncMetadata', metadata);
  }

  /**
   * Clear all local data from all stores
   * Used for hard logout
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    info('[StorageManager] Clearing all local data');
    
    try {
      // Clear all stores
      const stores: StoreName[] = [
        'userProfile',
        'recentTransactions', 
        'contacts',
        'syncMetadata'
      ];
      
      for (const store of stores) {
        await this.local.clear(store);
      }
      
      info('[StorageManager] All local data cleared successfully');
    } catch (error) {
      logError('[StorageManager] Error clearing local data:', error);
      throw error;
    }
  }
}

// Singleton instance
let storageManager: StorageManager | null = null;

export function getStorageManager(): StorageManager {
  if (!storageManager) {
    storageManager = new StorageManager();
  }
  return storageManager;
}
