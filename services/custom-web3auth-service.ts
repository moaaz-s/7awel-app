// services/custom-web3auth-service.ts
// Custom Web3Auth implementation for Capacitor compatibility
// Focuses on stablecoins and subsidized transactions

import { WEB3AUTH_NETWORK_TYPE, Web3AuthNoModal } from "@web3auth/no-modal";
import { CHAIN_NAMESPACES, IProvider, IWeb3AuthCoreOptions } from "@web3auth/base";
import { SolanaPrivateKeyProvider } from "@web3auth/solana-provider";
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { 
  createTransferInstruction, 
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { APP_CONFIG } from "@/constants/app-config";
import { privateHttpClient } from "@/services/httpClients/private";
import { info, error as logError } from "@/utils/logger";
import { 
  validateTransaction
} from "@/utils/solana-instruction-decoder";
import type { 
  AssetBalance, 
  TransactionType, 
  Contact, 
  ApiResponse,
  CustomWalletInfo,
  StablecoinTransferParams,
  TransactionBreakdown,
  PreparedTransaction
} from "@/types";

export class CustomWeb3AuthService {
  private web3auth: Web3AuthNoModal | null = null;
  private provider: IProvider | null = null;
  private connection: Connection;
  private solanaKeyProvider: SolanaPrivateKeyProvider | null = null;

  constructor() {
    this.connection = new Connection(APP_CONFIG.SOLANA.RPC_URL, 'confirmed');
  }

  /**
   * Initialize Web3Auth without modal for Capacitor compatibility
   */
  async init(): Promise<void> {
    try {
      const chainConfig = {
        chainNamespace: CHAIN_NAMESPACES.SOLANA,
        chainId: APP_CONFIG.SOLANA.CHAIN_ID,
        rpcTarget: APP_CONFIG.SOLANA.RPC_URL,
      };

      // Initialize Solana provider
      this.solanaKeyProvider = new SolanaPrivateKeyProvider({
        config: { chainConfig }
      });

      // TODO: Fix Web3Auth no-modal initialization
      // The current Web3Auth types have compatibility issues
      // This needs proper adapter setup for no-modal implementation
      const web3AuthOptions: any = {
        clientId: APP_CONFIG.WEB3AUTH.CLIENT_ID,
        web3AuthNetwork: APP_CONFIG.WEB3AUTH.NETWORK as WEB3AUTH_NETWORK_TYPE,
        chainConfig,
      };

      this.web3auth = new Web3AuthNoModal(web3AuthOptions);
      await this.web3auth.init();

      info('[CustomWeb3AuthService] Initialized successfully');
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Connect wallet using custom flow (no modal)
   * TODO: Implement proper Web3Auth no-modal connection
   * Currently requires proper adapter setup for the no-modal version
   */
  async connectWallet(loginProvider: string = 'google'): Promise<CustomWalletInfo> {
    try {
      if (!this.web3auth) {
        throw new Error('Web3Auth not initialized');
      }

      // TODO: Implement proper Web3Auth no-modal connection
      // This requires setting up the correct adapter for no-modal
      // For now, returning a placeholder response
      throw new Error('Web3Auth no-modal connection needs proper adapter setup');

      // The following code is the intended implementation once Web3Auth is properly configured:
      /*
      const web3authProvider = await this.web3auth.connectTo(adapterName, {
        loginProvider,
      });

      if (!web3authProvider) {
        throw new Error('Failed to connect wallet');
      }

      this.provider = web3authProvider;
      
      if (this.solanaKeyProvider) {
        await this.solanaKeyProvider.setupProvider(web3authProvider);
      }

      const walletInfo = await this.getWalletInfo();
      info('[CustomWeb3AuthService] Wallet connected:', { address: walletInfo.address });

      return walletInfo;
      */
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive wallet information including stablecoin balances
   */
  async getWalletInfo(): Promise<CustomWalletInfo> {
    try {
      if (!this.provider || !this.web3auth?.connected) {
        return {
          address: '',
          isConnected: false, // Check if this is correct
          provider: null,
          stablecoinBalances: [],
          solBalance: {
            id: 'disconnected-SOL',
            symbol: 'SOL',
            amount: 0,
            lastUpdated: Date.now(),
            decimals: 9, // SOL has 9 decimals
          },
        };
      }

      const accounts = await this.provider.request({
        method: "getAccounts",
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      const publicKey = new PublicKey(address);

      // Get SOL balance as AssetBalance
      const solBalanceLamports = await this.connection.getBalance(publicKey);
      const solBalanceInSol = solBalanceLamports / APP_CONFIG.SOLANA.LAMPORTS_PER_SOL;
      
      const solBalance: AssetBalance = {
        id: `${address}-SOL`,
        symbol: 'SOL',
        amount: solBalanceInSol,
        fiatValue: solBalanceInSol * 100, // Placeholder SOL price
        lastUpdated: Date.now(),
        decimals: 9, // SOL has 9 decimals
      };

      // Get stablecoin balances
      const stablecoinBalances = await this.getStablecoinBalances(publicKey);

      return {
        address,
        isConnected: true,
        provider: this.provider,
        stablecoinBalances,
        solBalance,
      };
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to get wallet info:', error);
      throw error;
    }
  }

  /**
   * Get all stablecoin balances for the wallet
   */
  async getStablecoinBalances(publicKey: PublicKey): Promise<AssetBalance[]> {
    try {
      const stablecoins = APP_CONFIG.SOLANA.STABLECOINS;
      const isMainnet = APP_CONFIG.SOLANA.NETWORK === 'mainnet-beta';
      
      const tokenMints = [
        {
          symbol: 'USDC',
          mint: isMainnet ? stablecoins.USDC_MAINNET : stablecoins.USDC_DEVNET,
          decimals: APP_CONFIG.SOLANA.STABLECOIN_DECIMALS,
        },
        {
          symbol: 'USDT', 
          mint: isMainnet ? stablecoins.USDT_MAINNET : stablecoins.USDT_DEVNET,
          decimals: APP_CONFIG.SOLANA.STABLECOIN_DECIMALS,
        },
      ];

      const balances: AssetBalance[] = [];

      for (const tokenInfo of tokenMints) {
        try {
          const mintPubkey = new PublicKey(tokenInfo.mint);
          const tokenAccountAddress = await getAssociatedTokenAddress(
            mintPubkey,
            publicKey
          );

          const tokenAccountInfo = await this.connection.getTokenAccountBalance(
            tokenAccountAddress
          );

          if (tokenAccountInfo.value.uiAmount !== null) {
            balances.push({
              id: `${publicKey.toBase58()}-${tokenInfo.symbol}`,
              symbol: tokenInfo.symbol,
              amount: tokenAccountInfo.value.uiAmount,
              fiatValue: tokenAccountInfo.value.uiAmount, // 1:1 for stablecoins
              lastUpdated: Date.now(),
              mint: tokenInfo.mint,
              decimals: tokenInfo.decimals,
            });
          }
        } catch (error) {
          // Token account doesn't exist yet - balance is 0
          balances.push({
            id: `${publicKey.toBase58()}-${tokenInfo.symbol}`,
            symbol: tokenInfo.symbol,
            amount: 0,
            fiatValue: 0,
            lastUpdated: Date.now(),
            mint: tokenInfo.mint,
            decimals: tokenInfo.decimals,
          });
        }
      }

      return balances;
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to get stablecoin balances:', error);
      return [];
    }
  }

  /**
   * ✅ IMPLEMENTED: Prepare stablecoin transfer with backend fee payer
   * ✅ IMPLEMENTED: Handles token account creation for recipient
   * ✅ IMPLEMENTED: Validates transaction before signing
   */
  async prepareStablecoinTransfer(params: StablecoinTransferParams): Promise<PreparedTransaction> {
    try {
      const walletInfo = await this.getWalletInfo();
      if (!walletInfo.isConnected) {
        throw new Error('Wallet not connected');
      }

      // Get fee payer from backend
      const feePayerResponse = await privateHttpClient.getFeePayer();

      if (!feePayerResponse.data?.feePayer) {
        throw new Error('Failed to get fee payer from backend');
      }

      const feePayer = new PublicKey(feePayerResponse.data.feePayer);
      const fromPubkey = new PublicKey(walletInfo.address);
      const toPubkey = new PublicKey(params.toAddress);
      const mintPubkey = new PublicKey(params.tokenMint);

      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
      const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

      // ✅ Check if recipient token account exists
      const toTokenAccountInfo = await this.connection.getAccountInfo(toTokenAccount);
      const needsTokenAccountCreation = toTokenAccountInfo === null;

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();

      // Create transaction with backend fee payer
      const transaction = new Transaction({
        feePayer,
        recentBlockhash: blockhash,
      });

      // ✅ Add create token account instruction if needed
      if (needsTokenAccountCreation) {
        const createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
          feePayer, // Backend pays for account creation
          toTokenAccount,
          toPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createTokenAccountInstruction);
      }

      // Convert amount to token units (considering decimals)
      const decimals = APP_CONFIG.SOLANA.STABLECOIN_DECIMALS;
      const amountInTokenUnits = Math.round(params.amount * Math.pow(10, decimals));

      // Add transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPubkey,
        amountInTokenUnits,
        [],
        TOKEN_PROGRAM_ID
      );
      transaction.add(transferInstruction);

      // Add memo if provided
      if (params.memo) {
        const memoInstruction = new TransactionInstruction({
          keys: [],
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          data: Buffer.from(params.memo, 'utf8'),
        });
        transaction.add(memoInstruction);
      }

      // ✅ Validate transaction by analyzing instructions (secure approach)
      const validationResult = validateTransaction(transaction);
      
      // Override breakdown from validation result (generated from actual instructions)
      const breakdown: TransactionBreakdown = {
        ...validationResult.breakdown,
        willCreateTokenAccount: needsTokenAccountCreation,
      };

      return {
        transaction,
        breakdown,
        isValid: validationResult.isValid,
        validationErrors: validationResult.errors,
      };
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to prepare stablecoin transfer:', error);
      throw error;
    }
  }

  /**
   * Sign transaction using Web3Auth provider (full signature)
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }

      const signedTransaction = await this.provider.request({
        method: "signTransaction",
        params: {
          message: transaction.serialize({ requireAllSignatures: false }),
        },
      }) as { signature: string };

      return Transaction.from(Buffer.from(signedTransaction.signature, 'base64'));
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to sign transaction:', error);
      throw error;
    }
  }

  /**
   * ✅ IMPLEMENTED: Partially sign transaction with user's key only (for backend completion)
   */
  async partialSignTransaction(transaction: Transaction): Promise<{
    partiallySignedTx: string; // Base64 serialized transaction
    userSignature: string; // User's signature for verification
  }> {
    try {
      if (!this.provider) {
        throw new Error('Provider not available');
      }

      // Get user's signature
      const signResult = await this.provider.request({
        method: "signTransaction",
        params: {
          message: transaction.serialize({ requireAllSignatures: false }),
        },
      }) as { signature: string };

      const signedTransaction = Transaction.from(Buffer.from(signResult.signature, 'base64'));

      return {
        partiallySignedTx: signedTransaction.serialize({ requireAllSignatures: false }).toString('base64'),
        userSignature: signResult.signature,
      };
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to partially sign transaction:', error);
      throw error;
    }
  }

  /**
   * ✅ IMPLEMENTED: Submit transaction to backend with fee payer handling
   */
  async submitTransactionWithFeePayerHandling(userSignedTx: string): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      // Submit to backend
      const response = await privateHttpClient.submitStablecoinTransaction(userSignedTx);

      if (response.data?.signature) {
        return {
          success: true,
          signature: response.data.signature,
        };
      }

      // Fee payer is now dynamic from backend, no retry needed

      return {
        success: false,
        error: response.error || 'Transaction submission failed',
      };
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to submit transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction submission failed',
      };
    }
  }



  /**
   * ✅ IMPLEMENTED: Send stablecoin with complete backend flow
   */
  async sendStablecoin(params: StablecoinTransferParams): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
    breakdown?: TransactionBreakdown;
  }> {
    try {
      // Validate amount
      if (params.amount <= 0) {
        throw new Error('Amount must be positive');
      }

      // Check balance
      const walletInfo = await this.getWalletInfo();
      const tokenBalance = walletInfo.stablecoinBalances.find(
        b => b.mint === params.tokenMint
      );

      if (!tokenBalance || tokenBalance.amount < params.amount) {
        throw new Error('Insufficient token balance');
      }

      // Prepare transaction
      const preparedTx = await this.prepareStablecoinTransfer(params);

      // ✅ Validate transaction before signing
      if (!preparedTx.isValid) {
        throw new Error(`Transaction validation failed: ${preparedTx.validationErrors.join(', ')}`);
      }

      // Partially sign transaction with user's key
      const userSignedTx = await this.partialSignTransaction(preparedTx.transaction);

      // Submit to backend with dynamic fee payer
      const result = await this.submitTransactionWithFeePayerHandling(userSignedTx.partiallySignedTx);

      return {
        ...result,
        breakdown: preparedTx.breakdown,
      };
    } catch (error) {
      logError('[CustomWeb3AuthService] Stablecoin transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (this.web3auth?.connected) {
        await this.web3auth.logout();
      }
      this.provider = null;
      info('[CustomWeb3AuthService] Wallet disconnected');
    } catch (error) {
      logError('[CustomWeb3AuthService] Failed to disconnect:', error);
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.web3auth?.connected || false;
  }

  /**
   * Get connection instance for direct blockchain interactions
   */
  getConnection(): Connection {
    return this.connection;
  }
}

export const customWeb3AuthService = new CustomWeb3AuthService(); 