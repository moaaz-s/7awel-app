// Enhanced Storage Manager with persistent sync queue and atomic transactions

import { LocalDatabaseManager, StoreName } from '../local-db/local-db-types';
import { SyncHelpers } from '../local-db/local-db-common';
import { userService } from '@/services/user-service';
import { transactionService } from '@/services/transaction-service';
import { walletService } from '@/services/wallet-service';
import { contactService } from '@/services/contact-service';

const MAX_RETRIES = 3;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

interface ApiServices {
  user: typeof userService;
  transaction: typeof transactionService;
  wallet: typeof walletService;
  contact: typeof contactService;
}

export class StorageManagerV2 {
  private syncInterval?: NodeJS.Timer;
  private isSyncing = false;
  
  constructor(
    public local: LocalDatabaseManager,
    private apiServices: ApiServices
  ) {
    this.initializeNetworkListeners();
    this.startPeriodicSync();
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
              
              if (updatedItem.retryCount < MAX_RETRIES) {
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
   * Sync a specific item to remote
   */
  private async syncItem(item: any): Promise<void> {
    switch (item.storeName) {
      case 'userProfile':
        if (item.operation === 'update') {
          const response = await this.apiServices.user.updateProfile(item.data);
          if (!response.success) {
            throw new Error(response.error || 'Profile sync failed');
          }
        }
        break;
        
      case 'recentTransactions':
        if (item.operation === 'create') {
          // For transactions, we might need to map the data format
          const response = await this.apiServices.transaction.sendMoney({
            recipientPhone: item.data.recipientPhone,
            amount: item.data.amount,
            currency: item.data.currency,
            note: item.data.note
          });
          if (!response.success) {
            throw new Error(response.error || 'Transaction sync failed');
          }
        }
        break;
        
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
  private initializeNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }
  
  /**
   * Handle network online event
   */
  private handleOnline = (): void => {
    console.log('Network restored, processing sync queue...');
    this.processSyncQueue().catch(console.error);
  };
  
  /**
   * Handle network offline event
   */
  private handleOffline = (): void => {
    console.log('Network offline, pausing sync...');
  };
  
  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (typeof window !== 'undefined' && navigator.onLine) {
        this.processSyncQueue().catch(console.error);
      }
    }, SYNC_INTERVAL_MS);
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}
