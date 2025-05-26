import { getStorageManager } from '@/services/storage-manager';
import { apiService } from '@/services/api-service';
import { isApiSuccess } from '@/types';
import { info, logError } from '@/utils/logger';

export enum SyncInterval {
  BALANCE = 30 * 1000,      // 30 seconds
  TRANSACTIONS = 60 * 1000,  // 1 minute
  CONTACTS = 5 * 60 * 1000,  // 5 minutes
  USER = 10 * 60 * 1000      // 10 minutes
}

interface SyncTask {
  name: string;
  interval: number;
  lastRun: number;
  isRunning: boolean;
  sync: () => Promise<void>;
}

class BackgroundSyncService {
  private tasks: Map<string, SyncTask> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;
  private storage = getStorageManager();

  constructor() {
    this.initializeTasks();
  }

  private initializeTasks() {
    // Balance sync task
    this.tasks.set('balance', {
      name: 'balance',
      interval: SyncInterval.BALANCE,
      lastRun: 0,
      isRunning: false,
      sync: async () => {
        try {
          const response = await apiService.getBalances?.() ?? await apiService.getWalletBalance();
          if (isApiSuccess(response) && response.data) {
            // Store in memory cache or emit event to update UI
            info('[BackgroundSync] Balance updated');
          }
        } catch (error) {
          logError('[BackgroundSync] Balance sync failed:', error);
        }
      }
    });

    // Transactions sync task
    this.tasks.set('transactions', {
      name: 'transactions',
      interval: SyncInterval.TRANSACTIONS,
      lastRun: 0,
      isRunning: false,
      sync: async () => {
        try {
          const response = await apiService.getTransactions();
          if (isApiSuccess(response) && response.data) {
            const txList = (response.data as any).items ?? response.data;
            const transactions = Array.isArray(txList) ? txList : [];
            
            // Update local storage with recent transactions
            const recentTxs = transactions.slice(0, 50);
            for (const tx of recentTxs) {
              await this.storage.local.set('recentTransactions', {
                id: tx.id,
                type: tx.type,
                amount: tx.amount,
                currency: tx.currency || 'USD',
                status: tx.status || 'completed',
                createdAt: tx.createdAt || new Date().toISOString(),
                recipientId: tx.recipientId,
                senderId: tx.senderId,
                note: tx.note,
                syncedAt: Date.now()
              });
            }
            info('[BackgroundSync] Transactions updated');
          }
        } catch (error) {
          logError('[BackgroundSync] Transactions sync failed:', error);
        }
      }
    });

    // Contacts sync task
    this.tasks.set('contacts', {
      name: 'contacts',
      interval: SyncInterval.CONTACTS,
      lastRun: 0,
      isRunning: false,
      sync: async () => {
        try {
          const response = await apiService.getContacts();
          if (isApiSuccess(response) && response.data) {
            const contactsList = (response.data as any).items ?? response.data;
            const contacts = Array.isArray(contactsList) ? contactsList : [];
            
            // Update local storage
            for (const contact of contacts) {
              await this.storage.local.set('contacts', {
                id: contact.id,
                name: contact.name,
                email: contact.email || '',
                phone: contact.phone,
                phoneHash: '',
                avatar: '',
                hasAccount: true,
                isFavorite: false,
                lastInteraction: Date.now(),
                syncedAt: Date.now()
              });
            }
            info('[BackgroundSync] Contacts updated');
          }
        } catch (error) {
          logError('[BackgroundSync] Contacts sync failed:', error);
        }
      }
    });

    // User profile sync task
    this.tasks.set('user', {
      name: 'user',
      interval: SyncInterval.USER,
      lastRun: 0,
      isRunning: false,
      sync: async () => {
        try {
          const response = await apiService.getUser();
          if (isApiSuccess(response) && response.data) {
            await this.storage.local.set('userProfile', {
              id: 'main',
              firstName: response.data.firstName,
              lastName: response.data.lastName,
              email: response.data.email || '',
              phone: response.data.phone,
              avatar: response.data.avatar,
              country: response.data.country,
              lastUpdated: Date.now()
            });
            info('[BackgroundSync] User profile updated');
          }
        } catch (error) {
          logError('[BackgroundSync] User sync failed:', error);
        }
      }
    });
  }

  start() {
    if (this.isActive) {
      info('[BackgroundSync] Already running');
      return;
    }

    this.isActive = true;
    info('[BackgroundSync] Starting background sync service');

    // Run sync check every 5 seconds
    this.intervalId = setInterval(() => {
      this.runPendingTasks();
    }, 5000);

    // Run initial sync for all tasks
    this.runPendingTasks(true);
  }

  stop() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    info('[BackgroundSync] Stopped background sync service');
  }

  private async runPendingTasks(forceAll = false) {
    const now = Date.now();

    for (const task of this.tasks.values()) {
      // Skip if task is already running
      if (task.isRunning) {
        continue;
      }

      // Check if task should run
      const shouldRun = forceAll || (now - task.lastRun >= task.interval);
      if (!shouldRun) {
        continue;
      }

      // Run task
      task.isRunning = true;
      task.lastRun = now;

      // Run async without blocking
      task.sync()
        .catch(error => {
          logError(`[BackgroundSync] Task ${task.name} failed:`, error);
        })
        .finally(() => {
          task.isRunning = false;
        });
    }
  }

  // Force sync specific data type
  async forceSync(type: 'balance' | 'transactions' | 'contacts' | 'user') {
    const task = this.tasks.get(type);
    if (!task) {
      return;
    }

    if (task.isRunning) {
      info(`[BackgroundSync] Task ${type} is already running`);
      return;
    }

    info(`[BackgroundSync] Force syncing ${type}`);
    task.isRunning = true;
    task.lastRun = Date.now();

    try {
      await task.sync();
    } catch (error) {
      logError(`[BackgroundSync] Force sync ${type} failed:`, error);
    } finally {
      task.isRunning = false;
    }
  }

  // Get sync status
  getSyncStatus() {
    const status: Record<string, { lastRun: number; isRunning: boolean }> = {};
    
    for (const [name, task] of this.tasks.entries()) {
      status[name] = {
        lastRun: task.lastRun,
        isRunning: task.isRunning
      };
    }

    return status;
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSyncService();
