/**
 * tests/helpers/test-setup.ts
 *
 * Centralised mocks & helpers that all unit / integration tests can import once
 * to avoid repeating boiler-plate. Keep this file dependency-free (only Vitest).
 *
 * Usage (at top of a test file):
 *   import "@/tests/helpers/test-setup";
 *
 * If you need to tweak a mocked implementation inside a test, access the spies
 * exported below (e.g. `privateHttpClient.sendMoney.mockResolvedValue(...)`).
 */

import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Logger mock – silence console while preserving call tracking if needed
// ---------------------------------------------------------------------------
vi.mock("@/utils/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// ---------------------------------------------------------------------------
// HTTP client stubs (private / public)
// ---------------------------------------------------------------------------

function createHttpClientSpies() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(), // matches privateHttpClient.delete usage
    del: vi.fn(),     // alias for legacy tests (will point to same fn)
    // domain-specific convenience calls used in codebase --------------------
    sendMoney: vi.fn(),
    listTransactions: vi.fn(),
    requestMoney: vi.fn(),
    refreshToken: vi.fn(),
    // contact-service helpers
    getContacts: vi.fn(),
    syncContacts: vi.fn(),
    getRecentContacts: vi.fn(),
    getFavoriteContacts: vi.fn(),
    recordInteraction: vi.fn(),
    toggleFavorite: vi.fn(),
    unFavorite: vi.fn(),
  } as any;
}

export const privateHttpClientSpies = createHttpClientSpies();
export const publicHttpClientSpies = createHttpClientSpies();
// Alias: tests that still import baseHttpClientSpies will continue to work
export const baseHttpClientSpies = privateHttpClientSpies;

vi.mock("@/services/httpClients/private", () => ({
  privateHttpClient: privateHttpClientSpies,
}));

vi.mock("@/services/httpClients/public", () => ({
  publicHttpClient: publicHttpClientSpies,
}));

// Preserve original exports (HttpClient class, ENDPOINTS) but override httpClient instance
vi.mock("@/services/httpClients/base", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    httpClient: baseHttpClientSpies,
  } as any;
});

// ---------------------------------------------------------------------------
// Helper to reset all spies – call in beforeEach if desired
// ---------------------------------------------------------------------------
export function resetTestSpies() {
  Object.values({ ...privateHttpClientSpies, ...publicHttpClientSpies }).forEach((fn) => {
    (fn as any).mockReset();
  });
}
