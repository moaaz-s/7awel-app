// Enhanced Storage Manager with persistent sync queue and atomic transactions

import { LocalDatabaseManager, StoreName } from '../local-db/local-db-types';
import { SyncHelpers } from '../local-db/local-db-common';
import { userService } from '@/services/user-service';
import { transactionService } from '@/services/transaction-service';
import { walletService } from '@/services/wallet-service';
import { contactService } from '@/services/contact-service';
import { APP_CONFIG } from '@/constants/app-config';
import { info, error as logError } from '@/utils/logger';
import { loadPlatform } from '@/platform';

interface ApiServices {
  user: typeof userService;
  transaction: typeof transactionService;
  wallet: typeof walletService;
  contact: typeof contactService;
}

export class StorageManagerV2 {
  private apiServices: ApiServices;
  private syncInterval?: NodeJS.Timeout;
  private networkListenerCleanup?: () => void;
  private isSyncing = false;
  local: LocalDatabaseManager;
  
  constructor(
    local: LocalDatabaseManager,
    apiServices: ApiServices
  ) {
    this.local = local;
    this.apiServices = apiServices;
    // Don't start sync automatically - wait for auth
  }
  
  /**
   * Queue an item for sync - persisted in local database
   */
  async queueForSync(
    storeName: string, 
    operation: 'create' | 'update' | 'delete', 
    data: any
  ): Promise<void> {
    const queueItem = {
      id: `${storeName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      storeName,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    // Store in local database atomically
    await this.local.transaction(
      ['syncQueue'],
      'readwrite',
      async (tx) => {
        await tx.set('syncQueue', queueItem);
      }
    );
  }
  
  /**
   * Process sync queue with atomic operations
   */
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing) return;
    
    try {
      this.isSyncing = true;
      await SyncHelpers.updateSyncStatus(this.local, 'syncing');
      
      const queuedItems = await this.local.getAll('syncQueue');
      const sortedItems = queuedItems.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const item of sortedItems) {
        // Skip if recently retried (exponential backoff)
        if (item.lastRetryAt) {
          const backoffMs = Math.min(1000 * Math.pow(2, item.retryCount), 60000);
          if (Date.now() - item.lastRetryAt < backoffMs) {
            continue;
          }
        }
        
        try {
          // Execute sync and removal atomically
          await this.local.transaction(
            ['syncQueue', item.storeName as StoreName],
            'readwrite',
            async (tx) => {
              // Attempt sync
              await this.syncItem(item);
              
              // Success! Remove from queue within same transaction
              await tx.delete('syncQueue', item.id);
            }
          );
        } catch (error: any) {
          // Update retry info atomically
          await this.local.transaction(
            ['syncQueue', 'failedSyncs'],
            'readwrite',
            async (tx) => {
              const updatedItem = {
                ...item,
                retryCount: item.retryCount + 1,
                lastRetryAt: Date.now(),
                error: error.message
              };
              
              if (updatedItem.retryCount < APP_CONFIG.DB.OFFLINE_SYNC_MAX_RETRIES) {
                // Update in sync queue
                await tx.set('syncQueue', updatedItem);
              } else {
                // Move to failed syncs
                const failedItem = {
                  ...updatedItem,
                  movedToFailedAt: Date.now()
                };
                await tx.set('failedSyncs', failedItem);
                await tx.delete('syncQueue', item.id);
              }
            }
          );
        }
      }
      
      await SyncHelpers.updateSyncStatus(this.local, 'synced');
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      await SyncHelpers.updateSyncStatus(this.local, 'error');
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * TODO: Add more stores & operations for full storage sync
   * Sync a specific item to remote
   */
  private async syncItem(item: any): Promise<void> {
    switch (item.storeName) {
      case 'userProfile':
        if (item.operation === 'update') {
          const response = await this.apiServices.user.updateUser(item.data);
          if (response.error) {
            throw new Error(response.error || 'Profile sync failed');
          }
        }
        break;
        
      case 'recentTransactions': {
        switch (item.operation) {
          case 'create': {
            // Currently only sendMoney covers creates; expect data contains required fields.
            const { recipientPhone, amount, currency, note } = item.data;
            if (!recipientPhone) {
              // Data incomplete – skip remote sync but succeed to clear queue.
              break;
            }
            const res = await this.apiServices.transaction.sendMoney(
              recipientPhone,
              amount,
              currency,
              note,
            );
            if (res.error) throw new Error(res.error || 'Transaction sync failed');
            break;
          }
          // Updates/deletes not yet supported by backend – treat as no-op success
          default:
            break;
        }
        break;
      }

      case 'contacts': {
        // Backend endpoints for individual contacts are not available in mock API yet.
        // Perform no-op so that queue item is considered synced.
        // Future: use contactService APIs when implemented.
        break;
      }

      case 'balance': {
        // Balance is refreshed from backend only; local writes are UI convenience.
        // No remote sync needed currently.
        break;
      }
        
      default:
        console.warn(`Unknown sync operation for ${item.storeName}`);
    }
  }
  
  /**
   * Get sync status for UI indicators
   */
  async getSyncStatus(): Promise<{
    pendingCount: number;
    oldestPending?: number;
    hasFailures: boolean;
    lastSyncTime: number;
    syncStatus: 'syncing' | 'synced' | 'error';
  }> {
    const [queuedItems, failedItems, syncMetadata] = await Promise.all([
      this.local.getAll('syncQueue'),
      this.local.getAll('failedSyncs'),
      this.local.get('syncMetadata', 'sync')
    ]);
    
    return {
      pendingCount: queuedItems.length,
      oldestPending: queuedItems[0]?.timestamp,
      hasFailures: failedItems.length > 0,
      lastSyncTime: syncMetadata?.lastSync || 0,
      syncStatus: syncMetadata?.status || 'synced'
    };
  }
  
  /**
   * Initialize network listeners
   */
  private async initializeNetworkListeners(): Promise<void> {
    const platform = await loadPlatform();
    
    // Use platform-specific network listener
    this.networkListenerCleanup = await platform.addNetworkListener((online: boolean) => {
      if (online) {
        this.handleOnline();
      } else {
        this.handleOffline();
      }
    });
  }
  
  /**
   * Handle network online event
   */
  private handleOnline = (): void => {
    info('Network restored, processing sync queue...');
    this.processSyncQueue().catch(logError);
  };
  
  /**
   * Handle network offline event
   */
  private handleOffline = (): void => {
    info('Network offline, pausing sync...');
    // The periodic sync already checks network status, so we just log here
    // This could be extended to cancel in-flight requests if needed
  };
  
  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      const platform = await loadPlatform();
      const online = await platform.isOnline();
      
      if (online) {
        this.processSyncQueue().catch(logError);
      }
    }, APP_CONFIG.DB.OFFLINE_QUEUE_SYNC_INTERVAL_MS);
  }
  
  /**
   * Start sync operations (should only be called when authenticated)
   */
  startSync(): void {
    this.initializeNetworkListeners();
    this.startPeriodicSync();
  }
  
  /**
   * Stop sync operations (should be called when logged out)
   */
  stopSync(): void {
    this.destroy();
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
    
    if (this.networkListenerCleanup) {
      this.networkListenerCleanup();
      this.networkListenerCleanup = undefined;
    }
  }
}
