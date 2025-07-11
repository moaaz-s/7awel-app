// constants/app-config.ts
// Centralized application configuration
// Consolidates all environment variables and constants for better maintainability

export const APP_CONFIG = {
  // API Configuration
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
    VERSION: 1,
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
  },

  // Security Configuration
  SECURITY: {
    // Session Management
    SESSION_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
    SESSION_IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes  
    SESSION_LOCKOUT_WARNING_MS: 30 * 1000, // 30 seconds

    // PIN Configuration
    PIN_HASH_ITERATIONS: 100_000,
    PIN_SALT_BYTES: 16,
    PIN_MIN_LENGTH: 4,
    PIN_MAX_LENGTH: 6,
    MAX_PIN_ATTEMPTS: 5,
    PIN_LOCKOUT_TIME_MS: 5 * 60 * 1000, // 5 minutes

    // OTP Configuration  
    MAX_OTP_ATTEMPTS: 3,
    OTP_EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
    OTP_LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  },

  // Caching & Storage Configuration
  STORAGE: {
    // Local Database
    DB_NAME: '7awel-local-db',
    DB_VERSION: 2,

    // Cache TTLs
    USER_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
    TRANSACTION_CACHE_TTL_MS: 2 * 60 * 1000, // 2 minutes
    BALANCE_CACHE_TTL_MS: 1 * 60 * 1000, // 1 minute

    // Sync Configuration
    OFFLINE_SYNC_MAX_RETRIES: 3,
    OFFLINE_QUEUE_SYNC_INTERVAL_MS: 30 * 1000, // 30 seconds
    SYNC_STATUS_UPDATE_INTERVAL_MS: 5 * 1000, // 5 seconds
  },

  // Platform Configuration
  PLATFORM: {
    IS_MOBILE: process.env.NEXT_PUBLIC_MOBILE === "true",
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  },

  // Features Toggle
  FEATURES: {
    BIOMETRICS_ENABLED: true,
    OFFLINE_MODE_ENABLED: true,
    ANALYTICS_ENABLED: process.env.NODE_ENV === 'production',
    PUSH_NOTIFICATIONS_ENABLED: true,
    DEBUG_LOGGING: process.env.NODE_ENV !== 'production',
  },

  // Transaction Configuration
  TRANSACTION: {
    MAX_TRANSACTION_AMOUNT: 1_000_000, // Maximum amount limit
    DEFAULT_CONFIRMATION_TIMEOUT_MS: 30 * 1000, // 30 seconds
    FEE_ESTIMATION_BUFFER: 5000, // Extra lamports for fee estimation
  },

  // Logging Configuration
  LOGGING: {
    FLUSH_INTERVAL_MS: 60 * 1000, // 1 minute
    MAX_LOG_ENTRIES: 1000,
    LOG_LEVELS: {
      ERROR: 0,
      WARN: 1, 
      INFO: 2,
      DEBUG: 3,
    },
  },

  // UI/UX Configuration
  UI: {
    TOAST_DURATION_MS: 4 * 1000, // 4 seconds
    LOADING_DEBOUNCE_MS: 300,
    SEARCH_DEBOUNCE_MS: 500,
    ANIMATION_DURATION_MS: 200,
  },

  // Web3 Configuration
  WEB3AUTH: {
    CLIENT_ID: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || '',
    NETWORK: process.env.NODE_ENV === 'production' ? 'sapphire_mainnet' : 'sapphire_devnet',
  },
  SOLANA: {
    LAMPORTS_PER_SOL: 1_000_000_000, // 1 billion lamports per SOL
    RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    CHAIN_ID: process.env.NODE_ENV === 'production' ? '0x1' : '0x2',
    NETWORK: process.env.NODE_ENV === 'production' ? 'mainnet-beta' : 'devnet',
    WSS_URL: process.env.NEXT_PUBLIC_SOLANA_WSS_URL || 'wss://api.devnet.solana.com',

    // Stablecoin Configuration
    STABLECOINS: {
      // USDC addresses for different networks
      USDC_DEVNET: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',  // Devnet USDC
      USDC_MAINNET: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
      USDT_DEVNET: 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS',  // Devnet USDT
      USDT_MAINNET: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // Mainnet USDT
    },

    // SPL Token decimals (most stablecoins use 6 decimals)
    STABLECOIN_DECIMALS: 6,
    DEFAULT_SLIPPAGE: 0.5, // 0.5% slippage for swaps
  },
  
  // Database constants
  DB: {
    USER_REPOSITORY_TTL_MS: 5 * 60 * 1000, // 5 minutes
    BALANCE_CACHE_TTL_MS: 2 * 60 * 1000, // 2 minutes
    CONTACT_CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
    TRANSACTION_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
    SYNC_STATUS_UPDATE_INTERVAL_MS: 30 * 1000, // 30 seconds
    OFFLINE_SYNC_MAX_RETRIES: 3,
    OFFLINE_QUEUE_SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  },
} as const;

// Type definitions for better IntelliSense
export type AppConfig = typeof APP_CONFIG;
export type ApiConfig = typeof APP_CONFIG.API;
export type SecurityConfig = typeof APP_CONFIG.SECURITY;
export type StorageConfig = typeof APP_CONFIG.STORAGE;

// Environment variable validation
export function validateConfig(): void {

  console.log(process.env);
  
  const errors: string[] = [];

  // Required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_MOBILE',
    'NODE_ENV',
  ];

  // Check for missing environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Validate numeric values
  if (APP_CONFIG.SECURITY.PIN_MIN_LENGTH > APP_CONFIG.SECURITY.PIN_MAX_LENGTH) {
    errors.push('PIN_MIN_LENGTH cannot be greater than PIN_MAX_LENGTH');
  }

  if (APP_CONFIG.SECURITY.SESSION_IDLE_TIMEOUT_MS > APP_CONFIG.SECURITY.SESSION_TTL_MS) {
    errors.push('SESSION_IDLE_TIMEOUT_MS cannot be greater than SESSION_TTL_MS');
  }

  // Throw if any errors found
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Auto-validate configuration on import (browser only)
// if (typeof window !== 'undefined') {
//   try {
//     validateConfig();
//   } catch (error) {
//     console.error('❌ App configuration validation failed:', error);
//     // Don't throw in production to avoid app crashes
//     if (process.env.NODE_ENV === 'development') {
//       throw error;
//     }
//   }
// } 