// context/auth/hooks/useCustomWeb3Auth.ts
// React hook for managing custom Web3Auth implementation
// Designed for Capacitor compatibility and stablecoin-focused transactions

import { useState, useEffect, useCallback } from 'react';
import { customWeb3AuthService } from '@/services/custom-web3auth-service';
import type { 
  AssetBalance, 
  CustomWalletInfo, 
  StablecoinTransferParams 
} from '@/types';
import { APP_CONFIG } from '@/constants/app-config';
import { info, error as logError } from '@/utils/logger';

interface Web3AuthState {
  isInitialized: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  walletInfo: CustomWalletInfo | null;
  error: string | null;
  isLoading: boolean;
}

interface StablecoinTransferState {
  isTransferring: boolean;
  lastTransferResult: {
    success: boolean;
    signature?: string;
    error?: string;
  } | null;
}

export function useCustomWeb3Auth() {
  const [state, setState] = useState<Web3AuthState>({
    isInitialized: false,
    isConnecting: false,
    isConnected: false,
    walletInfo: null,
    error: null,
    isLoading: false,
  });

  const [transferState, setTransferState] = useState<StablecoinTransferState>({
    isTransferring: false,
    lastTransferResult: null,
  });

  /**
   * Initialize Web3Auth service
   */
  const initializeWeb3Auth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await customWeb3AuthService.init();
      
      setState(prev => ({ 
        ...prev, 
        isInitialized: true, 
        isLoading: false 
      }));

      info('[useCustomWeb3Auth] Web3Auth initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Web3Auth';
      logError('[useCustomWeb3Auth] Initialization failed:', error);
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isLoading: false 
      }));
    }
  }, []);

  /**
   * Connect wallet with custom provider selection
   * This bypasses the Web3Auth modal and uses your custom UI
   */
  const connectWallet = useCallback(async (provider: string = 'google') => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      const walletInfo = await customWeb3AuthService.connectWallet(provider);
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: true,
        walletInfo,
      }));

      info('[useCustomWeb3Auth] Wallet connected successfully:', { 
        address: walletInfo.address,
        stablecoinCount: walletInfo.stablecoinBalances.length 
      });

      return walletInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      logError('[useCustomWeb3Auth] Connection failed:', error);
      
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: errorMessage 
      }));
      
      throw error;
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(async () => {
    try {
      await customWeb3AuthService.disconnect();
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        walletInfo: null,
        error: null,
      }));

      info('[useCustomWeb3Auth] Wallet disconnected');
    } catch (error) {
      logError('[useCustomWeb3Auth] Disconnect failed:', error);
    }
  }, []);

  /**
   * Refresh wallet information and balances
   */
  const refreshWalletInfo = useCallback(async () => {
    try {
      if (!state.isConnected) return;

      setState(prev => ({ ...prev, isLoading: true }));
      
      const walletInfo = await customWeb3AuthService.getWalletInfo();
      
      setState(prev => ({ 
        ...prev, 
        walletInfo, 
        isLoading: false 
      }));

      return walletInfo;
    } catch (error) {
      logError('[useCustomWeb3Auth] Failed to refresh wallet info:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isConnected]);

  /**
   * Send stablecoin with subsidized fees
   */
  const sendStablecoin = useCallback(async (params: StablecoinTransferParams) => {
    try {
      setTransferState(prev => ({ 
        ...prev, 
        isTransferring: true, 
        lastTransferResult: null 
      }));

      const result = await customWeb3AuthService.sendStablecoin(params);
      
      setTransferState(prev => ({ 
        ...prev, 
        isTransferring: false, 
        lastTransferResult: result 
      }));

      // Refresh balances after successful transfer
      if (result.success) {
        await refreshWalletInfo();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transfer failed';
      
      setTransferState(prev => ({ 
        ...prev, 
        isTransferring: false, 
        lastTransferResult: { success: false, error: errorMessage } 
      }));
      
      throw error;
    }
  }, [refreshWalletInfo]);

  /**
   * Get specific stablecoin balance
   */
  const getStablecoinBalance = useCallback((symbol: string): AssetBalance | null => {
    if (!state.walletInfo) return null;
    
    return state.walletInfo.stablecoinBalances.find(
      balance => balance.symbol === symbol
    ) || null;
  }, [state.walletInfo]);

  /**
   * Get total USD value of all stablecoins
   */
  const getTotalUSDValue = useCallback((): number => {
    if (!state.walletInfo) return 0;
    
    return state.walletInfo.stablecoinBalances.reduce(
      (total, balance) => total + (balance.fiatValue || 0), 
      0
    );
  }, [state.walletInfo]);

  /**
   * Check if a specific stablecoin mint is supported
   */
  const isSupportedStablecoin = useCallback((mintAddress: string): boolean => {
    const stablecoins = APP_CONFIG.SOLANA.STABLECOINS;
    const isMainnet = APP_CONFIG.SOLANA.NETWORK === 'mainnet-beta';
    
    const supportedMints: string[] = [
      isMainnet ? stablecoins.USDC_MAINNET : stablecoins.USDC_DEVNET,
      isMainnet ? stablecoins.USDT_MAINNET : stablecoins.USDT_DEVNET,
    ];
    
    return supportedMints.includes(mintAddress);
  }, []);

  /**
   * Auto-initialize on mount if not already initialized
   */
  useEffect(() => {
    if (!state.isInitialized && !state.isLoading) {
      initializeWeb3Auth();
    }
  }, [state.isInitialized, state.isLoading, initializeWeb3Auth]);

  /**
   * Periodically refresh wallet info when connected
   */
  useEffect(() => {
    if (!state.isConnected) return;

    const interval = setInterval(() => {
      refreshWalletInfo();
    }, APP_CONFIG.STORAGE.BALANCE_CACHE_TTL_MS);

    return () => clearInterval(interval);
  }, [state.isConnected, refreshWalletInfo]);

  return {
    // State
    ...state,
    ...transferState,

    // Actions
    initializeWeb3Auth,
    connectWallet,
    disconnectWallet,
    refreshWalletInfo,
    sendStablecoin,

    // Computed values
    getStablecoinBalance,
    getTotalUSDValue,
    isSupportedStablecoin,

    // Helper methods
    clearError: () => setState(prev => ({ ...prev, error: null })),
    clearTransferResult: () => setTransferState(prev => ({ 
      ...prev, 
      lastTransferResult: null 
    })),
    
    // Quick access to common stablecoins
    usdcBalance: getStablecoinBalance('USDC'),
    usdtBalance: getStablecoinBalance('USDT'),
  };
}

export type UseCustomWeb3AuthReturn = ReturnType<typeof useCustomWeb3Auth>; 