// tests/utils/solana-instruction-decoder.test.ts
// Integration tests for Solana instruction decoder with real transactions

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair,
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  analyzeTransactionInstructions,
  validateInstructionPrograms,
  readU64LE,
  getAssetSymbolFromMint,
} from '@/utils/solana-instruction-decoder';

// Mock app config for consistent testing
vi.mock('@/constants/app-config', () => ({
  APP_CONFIG: {
    SOLANA: {
      NETWORK: 'devnet',
      STABLECOIN_DECIMALS: 6,
      STABLECOINS: {
        USDC_MAINNET: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        USDC_DEVNET: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        USDT_MAINNET: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        USDT_DEVNET: 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS',
      }
    }
  }
}));

vi.mock('@/utils/logger', () => ({
  error: vi.fn(),
}));

describe('Solana Instruction Decoder - Real Transaction Tests', () => {
  let userKeypair: Keypair;
  let feePayerKeypair: Keypair;
  let recipientKeypair: Keypair;
  let userTokenAccount: PublicKey;
  let recipientTokenAccount: PublicKey;
  let usdcMintDevnet: PublicKey;
  let usdtMintDevnet: PublicKey;

  beforeEach(() => {
    // Create test keypairs and accounts
    userKeypair = Keypair.generate();
    feePayerKeypair = Keypair.generate();
    recipientKeypair = Keypair.generate();
    
    // Create mock token accounts (these would be derived in real app)
    userTokenAccount = Keypair.generate().publicKey;
    recipientTokenAccount = Keypair.generate().publicKey;
    
    // Use real mint addresses from config
    usdcMintDevnet = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
    usdtMintDevnet = new PublicKey('EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS');
  });

  /**
   * Helper function to create a real SPL Token transfer instruction
   */
  function createRealTransferInstruction(
    source: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: number
  ): TransactionInstruction {
    // This creates the actual instruction data that SPL Token uses
    const instructionData = Buffer.alloc(9);
    instructionData[0] = 3; // Transfer instruction type
    
    // Write amount as u64 little-endian (handle large numbers properly)
    const amountBuffer = Buffer.alloc(8);
    if (amount <= 0xFFFFFFFF) {
      // Small amounts fit in 32 bits
      amountBuffer.writeUInt32LE(amount, 0);
      amountBuffer.writeUInt32LE(0, 4);
    } else {
      // Large amounts need proper u64 handling
      const low = amount & 0xFFFFFFFF;
      const high = Math.floor(amount / 0x100000000);
      amountBuffer.writeUInt32LE(low >>> 0, 0); // Ensure unsigned
      amountBuffer.writeUInt32LE(high >>> 0, 4); // Ensure unsigned
    }
    instructionData.set(amountBuffer, 1);

    return new TransactionInstruction({
      keys: [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: TOKEN_PROGRAM_ID,
      data: instructionData,
    });
  }

  /**
   * Helper function to create a real Associated Token Account creation instruction
   */
  function createRealATAInstruction(
    payer: PublicKey,
    associatedToken: PublicKey,
    owner: PublicKey,
    mint: PublicKey
  ): TransactionInstruction {
    return new TransactionInstruction({
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedToken, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false }, // System program
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      data: Buffer.alloc(0), // ATA creation has no instruction data
    });
  }

  describe('Basic Unit Tests', () => {
    it('should correctly read u64 values from buffers', () => {
      const buffer = Buffer.alloc(8);
      buffer.writeUInt32LE(1000000, 0); // 1 USDC (6 decimals)
      buffer.writeUInt32LE(0, 4);
      
      const result = readU64LE(buffer);
      expect(result).toBe(1000000);
    });

    it('should map asset symbols correctly', () => {
      expect(getAssetSymbolFromMint('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')).toBe('USDC');
      expect(getAssetSymbolFromMint('EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS')).toBe('USDT');
      expect(getAssetSymbolFromMint('UnknownMint')).toBe('USDC');
      expect(getAssetSymbolFromMint('')).toBe('UNKNOWN');
    });
  });

  describe('Simple Transfer Transaction', () => {
    it('should decode a basic USDC transfer transaction correctly', () => {
      const transaction = new Transaction({
        feePayer: feePayerKeypair.publicKey,
        recentBlockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
      });

      // Add real SPL Token transfer instruction for 5 USDC
      const transferAmount = 5 * Math.pow(10, 6); // 5 USDC (6 decimals)
      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        transferAmount
      );
      
      transaction.add(transferInstruction);

      // Test decoder on real transaction
      const analysis = analyzeTransactionInstructions(transaction.instructions);

      expect(analysis).toEqual({
        isValidStablecoinTransfer: true,
        hasTransferInstruction: true,
        hasCreateAccountInstruction: false,
        hasMemoInstruction: false,
        transferAmount: transferAmount,
        humanReadableAmount: 5,
        tokenMint: 'Unknown', // Won't be detected without ATA creation
        assetSymbol: 'UNKNOWN',
        fromAddress: userTokenAccount.toBase58(),
        toAddress: recipientTokenAccount.toBase58(),
        memo: '',
        decimals: 6,
      });
    });

    it('should validate program IDs correctly', () => {
      const transaction = new Transaction();
      
      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        1000000 // 1 USDC
      );
      
      transaction.add(transferInstruction);

      const validation = validateInstructionPrograms(transaction.instructions);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Complete Transfer with ATA Creation', () => {
    it('should decode transaction with ATA creation + transfer + memo', () => {
      const transaction = new Transaction({
        feePayer: feePayerKeypair.publicKey,
        recentBlockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
      });

      // 1. Create associated token account for recipient
      const createAtaInstruction = createRealATAInstruction(
        feePayerKeypair.publicKey, // payer
        recipientTokenAccount, // ata
        recipientKeypair.publicKey, // owner
        usdcMintDevnet // mint
      );
      transaction.add(createAtaInstruction);

      // 2. Transfer USDC
      const transferAmount = 10.5 * Math.pow(10, 6); // 10.5 USDC
      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        transferAmount
      );
      transaction.add(transferInstruction);

      // 3. Add memo
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from('Payment for services 💰', 'utf8'),
      });
      transaction.add(memoInstruction);

      // Analyze the complete transaction
      const analysis = analyzeTransactionInstructions(transaction.instructions);

      expect(analysis).toEqual({
        isValidStablecoinTransfer: true,
        hasTransferInstruction: true,
        hasCreateAccountInstruction: true,
        hasMemoInstruction: true,
        transferAmount: transferAmount,
        humanReadableAmount: 10.5,
        tokenMint: usdcMintDevnet.toBase58(),
        assetSymbol: 'USDC',
        fromAddress: userTokenAccount.toBase58(),
        toAddress: recipientTokenAccount.toBase58(),
        memo: 'Payment for services 💰',
        decimals: 6,
      });

      // Validate all programs are allowed
      const validation = validateInstructionPrograms(transaction.instructions);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('USDT Transfer Transaction', () => {
    it('should correctly identify USDT transfers', () => {
      const transaction = new Transaction();

      // Create ATA for USDT
      const createAtaInstruction = createRealATAInstruction(
        feePayerKeypair.publicKey,
        recipientTokenAccount,
        recipientKeypair.publicKey,
        usdtMintDevnet // USDT mint
      );
      transaction.add(createAtaInstruction);

      // Transfer USDT
      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        2000000 // 2 USDT
      );
      transaction.add(transferInstruction);

      const analysis = analyzeTransactionInstructions(transaction.instructions);

      expect(analysis.assetSymbol).toBe('USDT');
      expect(analysis.tokenMint).toBe(usdtMintDevnet.toBase58());
      expect(analysis.humanReadableAmount).toBe(2);
    });
  });

  describe('Transaction Signing Tests', () => {
    it('should analyze transaction instructions consistently', () => {
      // Create transaction
      const transaction = new Transaction({
        feePayer: feePayerKeypair.publicKey,
        recentBlockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
      });

      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        1000000 // 1 USDC
      );
      transaction.add(transferInstruction);

      // Test instruction analysis
      const analysis = analyzeTransactionInstructions(transaction.instructions);
      expect(analysis.isValidStablecoinTransfer).toBe(true);
      expect(analysis.humanReadableAmount).toBe(1);
      expect(analysis.transferAmount).toBe(1000000);
    });

    it('should handle instruction analysis on transaction structures', () => {
      const transaction = new Transaction({
        feePayer: feePayerKeypair.publicKey,
        recentBlockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
      });

      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        5000000 // 5 USDC
      );
      transaction.add(transferInstruction);

      // Test that analysis works on instruction array
      const analysis = analyzeTransactionInstructions(transaction.instructions);
      expect(analysis.humanReadableAmount).toBe(5);
      expect(analysis.fromAddress).toBe(userTokenAccount.toBase58());
      expect(analysis.toAddress).toBe(recipientTokenAccount.toBase58());
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle transactions with unauthorized programs', () => {
      const transaction = new Transaction();
      
      // Add legitimate transfer
      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        1000000
      );
      transaction.add(transferInstruction);

      // Add unauthorized instruction (use a valid PublicKey format)
      const maliciousProgram = Keypair.generate().publicKey; // Valid format but unauthorized
      const maliciousInstruction = new TransactionInstruction({
        keys: [],
        programId: maliciousProgram,
        data: Buffer.from('malicious data'),
      });
      transaction.add(maliciousInstruction);

      const validation = validateInstructionPrograms(transaction.instructions);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(`Unauthorized program: ${maliciousProgram.toBase58()}`);

      // But analysis should still work for valid instructions
      const analysis = analyzeTransactionInstructions(transaction.instructions);
      expect(analysis.hasTransferInstruction).toBe(true);
    });

    it('should handle empty transactions', () => {
      const transaction = new Transaction();
      
      const analysis = analyzeTransactionInstructions(transaction.instructions);
      expect(analysis).toEqual({
        isValidStablecoinTransfer: false,
        hasTransferInstruction: false,
        hasCreateAccountInstruction: false,
        hasMemoInstruction: false,
        transferAmount: 0,
        humanReadableAmount: 0,
        tokenMint: 'Unknown',
        assetSymbol: 'UNKNOWN',
        fromAddress: 'Unknown',
        toAddress: 'Unknown',
        memo: '',
        decimals: 6,
      });
    });

    it('should handle very large transfer amounts', () => {
      const transaction = new Transaction();
      
      // Transfer 100 million USDC (within safe integer range)
      const largeAmount = 100_000_000 * Math.pow(10, 6);
      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        largeAmount
      );
      transaction.add(transferInstruction);

      const analysis = analyzeTransactionInstructions(transaction.instructions);
      expect(analysis.transferAmount).toBe(largeAmount);
      expect(analysis.humanReadableAmount).toBe(100_000_000);
      expect(Number.isFinite(analysis.humanReadableAmount)).toBe(true);
    });

    it('should handle transactions with multiple transfer instructions', () => {
      const transaction = new Transaction();
      
      // Add two transfer instructions (suspicious)
      const transfer1 = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        1000000 // 1 USDC
      );
      
      const transfer2 = createRealTransferInstruction(
        userTokenAccount,
        Keypair.generate().publicKey,
        userKeypair.publicKey,
        2000000 // 2 USDC
      );
      
      transaction.add(transfer1);
      transaction.add(transfer2);

      const analysis = analyzeTransactionInstructions(transaction.instructions);
      
      // Should detect transfer instruction and use the last one processed
      expect(analysis.hasTransferInstruction).toBe(true);
      expect(analysis.humanReadableAmount).toBe(2); // Last transfer amount overrides
    });

    it('should handle memo-only transactions', () => {
      const transaction = new Transaction();
      
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from('Just a memo, no transfer', 'utf8'),
      });
      transaction.add(memoInstruction);

      const analysis = analyzeTransactionInstructions(transaction.instructions);
      expect(analysis.isValidStablecoinTransfer).toBe(false);
      expect(analysis.hasMemoInstruction).toBe(true);
      expect(analysis.memo).toBe('Just a memo, no transfer');
    });

    it('should handle corrupted instruction data', () => {
      const transaction = new Transaction();
      
      // Create instruction with corrupted data
      const corruptedInstruction = new TransactionInstruction({
        keys: [
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
          { pubkey: userKeypair.publicKey, isSigner: true, isWritable: false },
        ],
        programId: TOKEN_PROGRAM_ID,
        data: Buffer.from([0xFF, 0xFF, 0xFF]), // Invalid instruction data
      });
      transaction.add(corruptedInstruction);

      const analysis = analyzeTransactionInstructions(transaction.instructions);
      
      expect(analysis.isValidStablecoinTransfer).toBe(true); // Still detected as token instruction
      expect(analysis.transferAmount).toBe(0); // Failed to decode properly
      expect(analysis.fromAddress).toBe('Unknown');
      expect(analysis.toAddress).toBe('Unknown');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle first-time recipient transaction', () => {
      // Scenario: Sending USDC to someone who has never received USDC before
      const newRecipient = Keypair.generate();
      const newRecipientTokenAccount = Keypair.generate().publicKey;

      const transaction = new Transaction({
        feePayer: feePayerKeypair.publicKey,
        recentBlockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
      });

      // Backend creates token account for recipient
      const createAtaInstruction = createRealATAInstruction(
        feePayerKeypair.publicKey, // Backend pays
        newRecipientTokenAccount,
        newRecipient.publicKey,
        usdcMintDevnet
      );
      transaction.add(createAtaInstruction);

      // Transfer USDC
      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        newRecipientTokenAccount,
        userKeypair.publicKey,
        25000000 // 25 USDC
      );
      transaction.add(transferInstruction);

      // Add payment memo
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from('First time payment to new user', 'utf8'),
      });
      transaction.add(memoInstruction);

      const analysis = analyzeTransactionInstructions(transaction.instructions);

      expect(analysis).toEqual({
        isValidStablecoinTransfer: true,
        hasTransferInstruction: true,
        hasCreateAccountInstruction: true,
        hasMemoInstruction: true,
        transferAmount: 25000000,
        humanReadableAmount: 25,
        tokenMint: usdcMintDevnet.toBase58(),
        assetSymbol: 'USDC',
        fromAddress: userTokenAccount.toBase58(),
        toAddress: newRecipientTokenAccount.toBase58(),
        memo: 'First time payment to new user',
        decimals: 6,
      });
    });

    it('should handle micro-payment', () => {
      // Scenario: 0.01 USDC micro-payment
      const transaction = new Transaction();
      
      const transferInstruction = createRealTransferInstruction(
        userTokenAccount,
        recipientTokenAccount,
        userKeypair.publicKey,
        10000 // 0.01 USDC (10,000 units with 6 decimals)
      );
      transaction.add(transferInstruction);

      const analysis = analyzeTransactionInstructions(transaction.instructions);
      expect(analysis.humanReadableAmount).toBe(0.01);
      expect(analysis.transferAmount).toBe(10000);
    });

    it('should handle memo with special characters and emojis', () => {
      const transaction = new Transaction();
      
      const memoText = '🚀 Payment for 💰 services with émojis! 中文测试';
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(memoText, 'utf8'),
      });
      transaction.add(memoInstruction);

      const analysis = analyzeTransactionInstructions(transaction.instructions);
      expect(analysis.hasMemoInstruction).toBe(true);
      expect(analysis.memo).toBe(memoText);
    });
  });
}); 