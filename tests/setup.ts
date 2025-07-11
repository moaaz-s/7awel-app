// tests/setup.ts
import { beforeAll, beforeEach, vi } from 'vitest';
import { webcrypto } from 'crypto';

// Mock the deleted auth-constants file for tests
vi.mock('@/constants/auth-constants', () => ({
  PIN_LENGTH: 6,
  SESSION_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  SESSION_IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  SESSION_LOCKOUT_TIMEOUT_WARNING_MS: 30 * 1000, // 30 seconds
  PIN_MIN_LENGTH: 4,
  PIN_MAX_LENGTH: 6,
  MAX_PIN_ATTEMPTS: 5,
  PIN_LOCKOUT_TIME_MS: 5 * 60 * 1000, // 5 minutes
  MAX_OTP_ATTEMPTS: 3,
  OTP_EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
  OTP_LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  AuthConstants: {
    PIN_MIN_LENGTH: 4,
    PIN_MAX_LENGTH: 6,
  },
}));

// Set up proper environment variables for testing (based on sample.env)
process.env.NEXT_PUBLIC_APP_ENV = 'test';
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001/api/v1';
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3001';
process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID = 'test-web3auth-client-id';
process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.NEXT_PUBLIC_SOLANA_WSS_URL = 'wss://api.devnet.solana.com';

// Mock platform detection for tests
process.env.NEXT_PUBLIC_MOBILE = 'false';

beforeAll(() => {
  // Use Node.js built-in crypto instead of custom polyfills
  if (typeof global.crypto === 'undefined') {
    Object.defineProperty(global, 'crypto', {
      value: webcrypto,
      writable: true,
      configurable: true,
    });
  }

  // Mock window object for browser-specific code
  if (typeof global.window === 'undefined') {
    Object.defineProperty(global, 'window', {
      value: {
        location: { href: 'http://localhost:3000' },
        navigator: { userAgent: 'test' },
      },
      writable: true,
      configurable: true,
    });
  }
});

beforeEach(() => {
  // Reset any test-specific state
  vi.clearAllMocks();
});
