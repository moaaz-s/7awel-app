// services/wallet-service.ts
import { httpClient } from "@/services/http-client";
import { handleError, respondOk, isApiSuccess } from "@/utils/api-utils";
import { error as logError, info } from "@/utils/logger";
import type { ApiResponse, AssetBalance, WalletBalance } from "@/types";
import { ErrorCode } from "@/types/errors";
import { getStorageManager, SyncStrategy } from "@/services/storage-manager";

const BASE_PATH = "/api/wallet";

export interface WalletServiceType {
  getBalance(assetId?: string): Promise<ApiResponse<AssetBalance>>;
  getBalances(): Promise<ApiResponse<AssetBalance[]>>;
  refreshBalances(): Promise<ApiResponse<void>>;
}

export const walletService: WalletServiceType = {
  /** Get balance for a specific asset or the primary asset */
  async getBalance(assetId?: string): Promise<ApiResponse<AssetBalance>> {
    try {
      const storage = getStorageManager();
      const cacheKey = assetId || 'primary';
      
      // Try local first
      const cachedBalance = await storage.cache.get<AssetBalance>(`balance_${cacheKey}`);
      if (cachedBalance) {
        info(`[walletService] Using cached balance for ${cacheKey}`);
        // Don't wait for remote update
        this.refreshBalances().catch(() => {});
        return respondOk(cachedBalance);
      }
      
      // Fetch from remote
      const endpoint = assetId ? `${BASE_PATH}/balances/${assetId}` : `${BASE_PATH}/balance`;
      const response = await httpClient.get<ApiResponse<AssetBalance>>(endpoint);
      
      if (isApiSuccess(response) && response.data) {
        // Cache the balance
        await storage.cache.set(`balance_${cacheKey}`, response.data, 60); // 1 minute cache
        return respondOk(response.data);
      }
      
      return handleError("Failed to fetch balance", ErrorCode.UNKNOWN_ERROR);
    } catch (e) {
      logError("[walletService] getBalance failed:", e);
      return handleError("Failed to get balance", e as any);
    }
  },

  /** Get all asset balances */
  async getBalances(): Promise<ApiResponse<AssetBalance[]>> {
    try {
      const storage = getStorageManager();
      
      // Try local first
      const cachedBalances = await storage.cache.get<AssetBalance[]>('all_balances');
      if (cachedBalances && cachedBalances.length > 0) {
        info(`[walletService] Using ${cachedBalances.length} cached balances`);
        // Don't wait for remote update
        this.refreshBalances().catch(() => {});
        return respondOk(cachedBalances);
      }
      
      // Fetch from remote
      const response = await httpClient.get<ApiResponse<AssetBalance[]>>(`${BASE_PATH}/balances`);
      
      if (isApiSuccess(response) && response.data) {
        // Cache all balances
        await storage.cache.set('all_balances', response.data, 60); // 1 minute cache
        
        // Also cache individual balances
        for (const balance of response.data) {
          await storage.cache.set(`balance_${balance.assetId}`, balance, 60);
        }
        
        return respondOk(response.data);
      }
      
      return handleError("Failed to fetch balances", ErrorCode.UNKNOWN_ERROR);
    } catch (e) {
      logError("[walletService] getBalances failed:", e);
      return handleError("Failed to get balances", e as any);
    }
  },

  /** Force refresh all balances from remote */
  async refreshBalances(): Promise<ApiResponse<void>> {
    try {
      const storage = getStorageManager();
      
      // Clear existing cache
      await storage.cache.clear('all_balances');
      
      // Fetch fresh data
      const response = await httpClient.get<ApiResponse<AssetBalance[]>>(`${BASE_PATH}/balances`);
      
      if (isApiSuccess(response) && response.data) {
        // Update cache
        await storage.cache.set('all_balances', response.data, 60);
        
        // Cache individual balances
        for (const balance of response.data) {
          await storage.cache.set(`balance_${balance.assetId}`, balance, 60);
        }
        
        info(`[walletService] Refreshed ${response.data.length} balances`);
      }
      
      return respondOk(undefined);
    } catch (e) {
      logError("[walletService] refreshBalances failed:", e);
      return handleError("Failed to refresh balances", e as any);
    }
  }
};
