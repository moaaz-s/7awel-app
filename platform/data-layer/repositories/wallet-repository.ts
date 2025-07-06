// WalletRepository - handles local caching of wallet balances
import { BaseRepository } from './base-repository';
import { StorageManagerV2 as StorageManager } from '@/platform/storage/storage-manager-v2';
import { LocalBalance } from '@/platform/local-db/local-db-types';
import { balanceSchema } from '@/platform/validators/schemas-zod';
import { safeMerge } from '@/utils/merge-helpers';
import { walletService } from '@/services/wallet-service';
import type { AssetBalance } from '@/types';
import { isApiSuccess } from '@/utils/api-utils';
import { error as logError } from '@/utils/logger';

export class WalletRepository extends BaseRepository<'balance'> {
  /**
   * Isolated clock helper so tests can stub Date easily.
   * Keeping it as a method avoids mutating globals in unit tests.
   */
  private readonly now = () => Date.now();
  private toCore(local: LocalBalance): AssetBalance {
    return local;
  }

  /**
   * Convert remote/core balance into validated LocalBalance, ensuring we don't duplicate
   * the id / lastUpdated keys (they are managed locally).
   */
  private toLocal(
    core: Omit<AssetBalance, 'id' | 'lastUpdated'> | AssetBalance,
    id: string,
    meta: Partial<LocalBalance> = {}
  ): LocalBalance {
    // runtime validation & defaults
    // Strip potentially conflicting keys from incoming core object first
    // (e.g. if backend now returns id / lastUpdated we still want local values)
    const { id: _discardId, lastUpdated: _discardLu, ...rest } = core as Partial<AssetBalance> & { [k: string]: any };

    return safeMerge({} as LocalBalance, {
      id,
      lastUpdated: this.now(),
      ...rest,
      ...meta,
    }, balanceSchema) as LocalBalance;
  }
  constructor(storageManager: StorageManager) {
    super(storageManager, 'balance');
  }

  /** Get the primary (default) wallet balance */
  async getPrimaryBalance(): Promise<AssetBalance | null> {
    try {
      // Try local cache first (id = "primary")
      const local = await this.storageManager.local.get('balance', 'primary') as LocalBalance | undefined;
      if (local) {
        return this.toCore(local);
      }

      const response = await walletService.getBalance();
      if (isApiSuccess(response) && response.data) {
        // Store locally (id = 'primary')
        await this.storageManager.local.set('balance', this.toLocal(response.data, 'primary'));
        return response.data;
      }
    } catch (err) {
      logError('[WalletRepository] Failed to get balance:', err);
    }
    return null;
  }

  /** Retrieve ALL balances, local-first */
  async getAllBalances(): Promise<AssetBalance[]> {
    try {
      const locals = await this.storageManager.local.getAll('balance') as LocalBalance[];
      if (locals && locals.length) {
        return locals.map(this.toCore);
      }
      const response = await walletService.getBalances();
      if (isApiSuccess(response) && response.data) {
        // Cache
        for (const bal of response.data) {
          await this.storageManager.local.set('balance', this.toLocal(bal, bal.symbol));
        }
        return response.data;
      }
    } catch (err) {
      logError('[WalletRepository] getAllBalances failed:', err);
    }
    return [];
  }

  /** Force refresh from remote and update cache */
  async refreshBalances(): Promise<void> {
    const response = await walletService.getBalances();
    if (!isApiSuccess(response) || !response.data) return;
    for (const bal of response.data) {
      await this.storageManager.local.set('balance', this.toLocal(bal, bal.symbol));
    }
  }
}
