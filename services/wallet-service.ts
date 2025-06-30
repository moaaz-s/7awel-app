// services/wallet-service.ts
import { privateHttpClient } from "@/services/httpClients/private";
import { handleError, isApiSuccess, respondOk } from "@/utils/api-utils";
import { error as logError } from "@/utils/logger";
import type { ApiResponse, AssetBalance } from "@/types";
import { ErrorCode } from "@/types/errors";

export interface WalletServiceType {
  getBalance(assetId?: string): Promise<ApiResponse<AssetBalance>>;
  getBalances(): Promise<ApiResponse<AssetBalance[]>>;
  refreshBalances(): Promise<ApiResponse<void>>;
}

export const walletService: WalletServiceType = {
  /** Get balance for a specific asset (or primary asset when omitted) – REMOTE ONLY */
  async getBalance(assetId?: string): Promise<ApiResponse<AssetBalance>> {
    try {
      const response = assetId
        ? await privateHttpClient.getBalanceOf(assetId)
        : await privateHttpClient.getBalance();

      if (isApiSuccess(response) && response.data) {
        return response; // already conforms to ApiResponse
      }
      return handleError("Failed to fetch balance", ErrorCode.NETWORK_ERROR);
    } catch (e) {
      logError("[walletService] getBalance failed:", e);
      return handleError("Failed to get balance", e as any);
    }
  },

  /** Get ALL asset balances – REMOTE ONLY */
  async getBalances(): Promise<ApiResponse<AssetBalance[]>> {
    try {
      const response = await privateHttpClient.getBalances();
      if (isApiSuccess(response) && response.data) {
        return response;
      }
      return handleError("Failed to get balances", ErrorCode.BALANCES_REFRESH_FAILED);
    } catch (e) {
      logError("[walletService] getBalances failed:", e);
      return handleError("Failed to get balances", ErrorCode.BALANCES_UNKNOWN_ISSUE);
    }
  },
  
  /** Refresh balances – proxy that returns empty payload on success */
  async refreshBalances(): Promise<ApiResponse<void>> {
    const resp = await this.getBalances();
    if (isApiSuccess(resp)) {
      return respondOk<void>(undefined);
    }
    return handleError("Failed to refresh balances", ErrorCode.NETWORK_ERROR);
  }
};
