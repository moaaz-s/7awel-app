// TransactionRepository provides local-first access to transactions
import { BaseRepository } from './base-repository';
import { StorageManagerV2 as StorageManager } from '@/platform/storage/storage-manager-v2';
import { transactionService } from '@/services/transaction-service';
import { transactionSchema } from '@/platform/validators/schemas-zod';
import { safeMerge } from '@/utils/merge-helpers';
import type { Transaction, Paginated, ApiResponse } from '@/types';
import { isApiSuccess } from '@/utils/api-utils';
import { ErrorCode } from '@/types/errors';

type LocalTx = import('@/platform/local-db/local-db-types').LocalTransaction;

export class TransactionRepository extends BaseRepository<'recentTransactions'> {
  constructor(storageManager: StorageManager) {
    super(storageManager, 'recentTransactions');
  }

  /** 
   * Convert LocalTransaction to core Transaction using Zod validation
   */
  private toCore(tx: LocalTx): Transaction {
    // Let Zod handle validation and throw descriptive errors
    const validationResult = transactionSchema.safeParse(tx);
    if (!validationResult.success) {
      console.error(`Invalid LocalTransaction data:`, validationResult.error.errors);
      throw new Error(`Invalid LocalTransaction: ${validationResult.error.errors.map(e => `${e.path.join('.')} ${e.message}`).join(', ')}`);
    }

    return validationResult.data;
  }

  /** Convert core Transaction to LocalTransaction for caching */
  private toLocal(tx: Transaction, extra: Partial<LocalTx> = {}): LocalTx {
    return safeMerge({} as LocalTx, {
      ...tx,
      syncedAt: Date.now(),
      ...extra,
    }, transactionSchema) as LocalTx;
  }

  /** Return latest cached transactions */
  async listLocal(): Promise<Transaction[]> {
    const local = (await this.storageManager.local.getAll('recentTransactions')) as LocalTx[];
    return local
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .map(this.toCore);
  }

  /** Fetch remote list then cache */
  async listRemote(limit = 20, cursor?: string, currentUserId?: string): Promise<Paginated<Transaction>> {
    const response = await transactionService.listTransactions(undefined, { limit, cursor }, currentUserId);
    if (!isApiSuccess(response) || !response.data) {
      throw new Error(response.error || ErrorCode.TRANSACTION_LIST_FAILED);
    }
    // cache top 10
    for (const tx of response.data.items.slice(0, 10)) {
      await this.storageManager.local.set('recentTransactions', this.toLocal(tx));
    }
    return response.data;
  }

  async getTransaction(id: string, currentUserId?: string): Promise<Transaction | null> {
    // 1. Try local cache first
    const local = (await this.storageManager.local.get('recentTransactions', id)) as LocalTx | undefined;
    if (local) return this.toCore(local)

    // 2. Fetch from remote service
    const response = await transactionService.getTransactionById(id, currentUserId);
    
    if (!isApiSuccess(response) || !response.data) {
      return null; // Not found or request failed
    }

    const tx = response.data;

    // 3. Cache a subset of the transaction locally for future quick access
    try {
      await this.storageManager.local.set('recentTransactions', this.toLocal(tx));
    } catch (err) {
      // Non-critical – ignore caching errors
    }

    return tx;
  }
}
