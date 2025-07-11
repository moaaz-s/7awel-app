// utils/solana-instruction-decoder.ts
// Utility functions for decoding Solana instructions and analyzing transactions

import { TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { APP_CONFIG } from "@/constants/app-config";
import { error as logError } from "@/utils/logger";
import type { Transaction } from "@solana/web3.js";
import type { TransactionBreakdown } from "@/types";

// Transaction analysis result interface
export interface TransactionAnalysis {
  isValidStablecoinTransfer: boolean;
  hasTransferInstruction: boolean;
  hasCreateAccountInstruction: boolean;
  hasMemoInstruction: boolean;
  transferAmount: number; // In token units
  humanReadableAmount: number; // Converted to human-readable units
  tokenMint: string;
  assetSymbol: string;
  fromAddress: string;
  toAddress: string;
  memo: string;
  decimals: number;
}

// Decoded transfer instruction
export interface DecodedTransferInstruction {
  amount: number;
  source: string;
  destination: string;
}

// Decoded create associated token account instruction
export interface DecodedCreateAssociatedTokenAccountInstruction {
  associatedTokenAccount: string;
  mint: string;
  owner: string;
}

/**
 * Main function to analyze Solana transaction instructions
 * Returns comprehensive analysis of the transaction content
 */
export function analyzeTransactionInstructions(instructions: TransactionInstruction[]): TransactionAnalysis {
  let hasTransferInstruction = false;
  let hasCreateAccountInstruction = false;
  let hasMemoInstruction = false;
  let transferAmount = 0;
  let tokenMint = '';
  let fromAddress = '';
  let toAddress = '';
  let memo = '';
  let assetSymbol = 'UNKNOWN';

  for (const instruction of instructions) {
    const programId = instruction.programId.toBase58();

    // Decode TOKEN_PROGRAM instructions
    if (programId === TOKEN_PROGRAM_ID.toBase58()) {
      hasTransferInstruction = true;
      
      const decodedTransfer = decodeTokenTransferInstruction(instruction);
      if (decodedTransfer) {
        transferAmount = decodedTransfer.amount;
        fromAddress = decodedTransfer.source;
        toAddress = decodedTransfer.destination;
      }
    }

    // Decode ASSOCIATED_TOKEN_PROGRAM instructions
    if (programId === ASSOCIATED_TOKEN_PROGRAM_ID.toBase58()) {
      hasCreateAccountInstruction = true;
      
      const decodedCreate = decodeCreateAssociatedTokenAccountInstruction(instruction);
      if (decodedCreate) {
        tokenMint = decodedCreate.mint;
        // Update toAddress if we're creating an account (this is the destination)
        if (!toAddress) {
          toAddress = decodedCreate.associatedTokenAccount;
        }
      }
    }

    // Decode memo instructions
    if (programId === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
      hasMemoInstruction = true;
      memo = instruction.data.toString('utf8');
    }
  }

  // Determine asset symbol from token mint
  assetSymbol = getAssetSymbolFromMint(tokenMint);

  // Convert amount from token units to human-readable units
  const decimals = APP_CONFIG.SOLANA.STABLECOIN_DECIMALS;
  const humanReadableAmount = transferAmount / Math.pow(10, decimals);

  return {
    isValidStablecoinTransfer: hasTransferInstruction,
    hasTransferInstruction,
    hasCreateAccountInstruction,
    hasMemoInstruction,
    transferAmount,
    humanReadableAmount,
    tokenMint: tokenMint || 'Unknown',
    assetSymbol,
    fromAddress: fromAddress || 'Unknown',
    toAddress: toAddress || 'Unknown',
    memo: memo || '',
    decimals,
  };
}

/**
 * Decode SPL Token Transfer instruction
 */
export function decodeTokenTransferInstruction(instruction: TransactionInstruction): DecodedTransferInstruction | null {
  try {
    // SPL Token Transfer instruction layout:
    // [instruction_type: u8, amount: u64]
    if (instruction.data.length < 9) {
      return null;
    }

    const instructionType = instruction.data[0];
    
    // Transfer instruction type is 3 in SPL Token program
    if (instructionType !== 3) {
      return null;
    }

    // Extract amount (u64 little-endian, bytes 1-8)
    const amountBuffer = instruction.data.slice(1, 9);
    const amount = readU64LE(amountBuffer);

    // Extract addresses from instruction keys
    // Transfer instruction account layout:
    // 0: source token account
    // 1: destination token account  
    // 2: source account owner
    if (instruction.keys.length < 3) {
      return null;
    }

    const source = instruction.keys[0].pubkey.toBase58();
    const destination = instruction.keys[1].pubkey.toBase58();

    return {
      amount,
      source,
      destination,
    };
  } catch (error) {
    logError('[SolanaInstructionDecoder] Failed to decode transfer instruction:', error);
    return null;
  }
}

/**
 * Decode Associated Token Account creation instruction
 */
export function decodeCreateAssociatedTokenAccountInstruction(instruction: TransactionInstruction): DecodedCreateAssociatedTokenAccountInstruction | null {
  try {
    // Associated Token Account creation has no instruction data (empty)
    // All info is in the account keys
    
    // Create Associated Token Account instruction account layout:
    // 0: funding account (payer)
    // 1: associated token account (to be created)
    // 2: wallet address (owner)
    // 3: token mint
    // 4: system program
    // 5: token program
    // 6: rent sysvar
    if (instruction.keys.length < 7) {
      return null;
    }

    const associatedTokenAccount = instruction.keys[1].pubkey.toBase58();
    const owner = instruction.keys[2].pubkey.toBase58();
    const mint = instruction.keys[3].pubkey.toBase58();

    return {
      associatedTokenAccount,
      mint,
      owner,
    };
  } catch (error) {
    logError('[SolanaInstructionDecoder] Failed to decode create associated token account instruction:', error);
    return null;
  }
}

/**
 * Determine asset symbol from token mint address
 */
export function getAssetSymbolFromMint(tokenMint: string): string {
  if (!tokenMint) return 'UNKNOWN';

  const stablecoins = APP_CONFIG.SOLANA.STABLECOINS;
  const isMainnet = APP_CONFIG.SOLANA.NETWORK === 'mainnet-beta';

  // Check against known stablecoin mints
  if (tokenMint === (isMainnet ? stablecoins.USDC_MAINNET : stablecoins.USDC_DEVNET)) {
    return 'USDC';
  }
  
  if (tokenMint === (isMainnet ? stablecoins.USDT_MAINNET : stablecoins.USDT_DEVNET)) {
    return 'USDT';
  }

  // Default to USDC if unknown (most common stablecoin)
  return 'USDC';
}

/**
 * Read u64 little-endian from buffer
 */
export function readU64LE(buffer: Buffer): number {
  // JavaScript can safely handle integers up to 2^53 - 1
  // For token amounts, this should be sufficient for most use cases
  try {
    // Read as two 32-bit integers and combine
    const low = buffer.readUInt32LE(0);
    const high = buffer.readUInt32LE(4);
    
    // Combine into a single number
    // This will lose precision for very large numbers, but token amounts
    // even with 18 decimals should be within safe integer range
    return high * 0x100000000 + low;
  } catch (error) {
    logError('[SolanaInstructionDecoder] Failed to read u64:', error);
    return 0;
  }
}

/**
 * Validate that instructions contain only allowed programs
 */
export function validateInstructionPrograms(instructions: TransactionInstruction[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  const allowedPrograms = [
    TOKEN_PROGRAM_ID.toBase58(),
    ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
    'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', // Memo program
  ];

  for (const instruction of instructions) {
    const programId = instruction.programId.toBase58();
    
    if (!allowedPrograms.includes(programId)) {
      errors.push(`Unauthorized program: ${programId}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
} 

/**
 * Validate Solana transaction by analyzing instructions (SECURE)
 * This function can be shared between frontend and backend
 * TODO: Extract into shared resources to check that the transaction is valid when received in the backend.
 */
export function validateTransaction(transaction: Transaction): {
  isValid: boolean;
  errors: string[];
  breakdown: TransactionBreakdown;
} {
  const errors: string[] = [];

  // Check instruction count - should be 1-3 instructions max
  if (transaction.instructions.length > 3) {
    errors.push('Transaction contains too many instructions');
  }

  if (transaction.instructions.length === 0) {
    errors.push('Transaction contains no instructions');
  }

  // Validate instruction programs using utils
  const programValidation = validateInstructionPrograms(transaction.instructions);
  if (!programValidation.isValid) {
    errors.push(...programValidation.errors);
  }

  // Analyze instructions using utils
  const instructionAnalysis = analyzeTransactionInstructions(transaction.instructions);
  
  if (!instructionAnalysis.isValidStablecoinTransfer) {
    errors.push('Transaction is not a valid stablecoin transfer');
  }

  // Generate breakdown from analysis
  const breakdown: TransactionBreakdown = {
    type: 'stablecoin_transfer',
    fromAddress: instructionAnalysis.fromAddress,
    toAddress: instructionAnalysis.toAddress,
    amount: instructionAnalysis.humanReadableAmount,
    assetSymbol: instructionAnalysis.assetSymbol,
    tokenMint: instructionAnalysis.tokenMint,
    decimals: instructionAnalysis.decimals,
    usdValue: instructionAnalysis.humanReadableAmount, // 1:1 for stablecoins
    memo: instructionAnalysis.memo || undefined,
    willCreateTokenAccount: instructionAnalysis.hasCreateAccountInstruction,
    estimatedFee: 0.001, // Placeholder - calculate from transaction
    createdAt: new Date().toISOString(),
  };

  return {
    isValid: errors.length === 0,
    errors,
    breakdown,
  };
} 