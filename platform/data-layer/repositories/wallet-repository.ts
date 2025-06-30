// WalletRepository - handles local caching of wallet balances
import { BaseRepository } from './base-repository';
import { StorageManagerV2 as StorageManager } from '@/platform/storage/storage-manager-v2';
import { LocalBalance } from '@/platform/local-db/local-db-types';
import { balanceSchema } from '@/platform/validators/schemas-zod';
import { safeMerge } from '@/utils/merge-helpers';
import { walletService } from '@/services/wallet-service';
import { AssetBalance, ApiResponse } from '@/types';
import { isApiSuccess } from '@/utils/api-utils';
import { error as logError } from '@/utils/logger';

export class WalletRepository extends BaseRepository<'balance'> {
  private toCore(local: LocalBalance): AssetBalance {
    const { id: _id, lastUpdated: _lu, ...core } = local;
    return core;
  }

  private toLocal(core: AssetBalance, id: string, meta: Partial<LocalBalance> = {}): LocalBalance {
    // runtime validation & defaults
    return safeMerge({} as LocalBalance, {
      id,
      lastUpdated: Date.now(),
      ...core,
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
