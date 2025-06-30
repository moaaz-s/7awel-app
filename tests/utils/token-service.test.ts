import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------- in-memory secure storage ---------------------------
const mem: Record<string, string> = {};
vi.mock("@/utils/secure-storage", () => ({
  getItem: async (k: string) => mem[k] ?? null,
  setItem: async (k: string, v: string) => {
    mem[k] = v;
  },
  removeItem: async (k: string) => {
    delete mem[k];
  },
}));

// ------------------------- supporting mocks --------------------------------

// Track privateHttpClient token mutations
let clientToken: string | null = null;
vi.mock("@/services/httpClients/private", () => ({
  privateHttpClient: {
    setToken: (t: string) => {
      clientToken = t;
    },
    clearToken: () => {
      clientToken = null;
    },
  },
}));

// Use real token-utils; no mock
// Polyfill atob/btoa for Node if not present
if (!(global as any).atob) {
  (global as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}
if (!(global as any).btoa) {
  (global as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}

import { createToken } from "@/utils/token-utils";

vi.mock("@/services/auth-service", () => {
  const refreshToken = vi.fn();
  const acquireToken = vi.fn();
  const logout = vi.fn();
  return {
    authService: {
      refreshToken,
      acquireToken,
      logout,
    },
  };
});

import { AUTH_TOKEN, REFRESH_TOKEN } from "@/constants/storage-keys";
import { authService } from "@/services/auth-service";
const mockedAuth = vi.mocked(authService);
import {
  checkTokenStatus,
  initAndValidate,
  acquireTokens,
  signOut,
} from "@/utils/token-service";

// ----------------------------- helpers -------------------------------------
function setStoredTokens(access: string | null, refresh: string | null) {
  if (access) mem[AUTH_TOKEN] = access; else delete mem[AUTH_TOKEN];
  if (refresh) mem[REFRESH_TOKEN] = refresh; else delete mem[REFRESH_TOKEN];
}

// ---------------------------------------------------------------------------
describe("utils/token-service", () => {
  beforeEach(() => {
    Object.keys(mem).forEach((k) => delete mem[k]);
    clientToken = null;
    mockedAuth.refreshToken.mockReset();
    mockedAuth.acquireToken.mockReset();
    mockedAuth.logout.mockReset();
  });

  it("checkTokenStatus returns exists=false when no token", async () => {
    const res = await checkTokenStatus();
    expect(res).toEqual({ exists: false, isExpired: true });
  });

  it("checkTokenStatus detects expired token", async () => {
    const expired = createToken({ sub: "u1" }, -3600); // already expired
    setStoredTokens(expired, null);
    const res = await checkTokenStatus();
    expect(res).toEqual({ exists: true, isExpired: true });
  });

  it("initAndValidate returns true and sets httpClient token for valid token", async () => {
    const validToken = createToken({ sub: "u1" }, 3600);
    setStoredTokens(validToken, "r1");
    const ok = await initAndValidate();
    expect(ok).toBe(true);
    expect(clientToken).toBe(validToken);
  });

  it("initAndValidate attempts refresh when token expired and stores new tokens", async () => {
    const expired = createToken({ sub: "u1" }, -60);
    setStoredTokens(expired, "refresh123");
    const refreshed = createToken({ sub: "u1" }, 3600);
    mockedAuth.refreshToken.mockResolvedValue({
      statusCode: 200,
      message: "ok",
      data: { accessToken: refreshed, refreshToken: "newR" },
      traceId: "t1",
    } as any);

    const ok = await initAndValidate();
    expect(mockedAuth.refreshToken).toHaveBeenCalledWith("refresh123");
    expect(ok).toBe(true);
    expect(clientToken).toBe(refreshed);
    expect(mem[AUTH_TOKEN]).toBe(refreshed);
  });

  it("initAndValidate fails when expired and no refresh token – tokens cleared", async () => {
    const expired = createToken({ sub: "u1" }, -60);
    setStoredTokens(expired, null);
    const ok = await initAndValidate();
    expect(ok).toBe(false);
    expect(clientToken).toBeNull();
    expect(mem[AUTH_TOKEN]).toBeUndefined();
  });

  it("acquireTokens stores tokens and validates them", async () => {
    const newToken = createToken({ sub: "u2" }, 3600);
    mockedAuth.acquireToken.mockResolvedValue({
      statusCode: 200,
      message: "ok",
      data: { accessToken: newToken, refreshToken: "y" },
      traceId: "t2",
    } as any);
    const ok = await acquireTokens("+123", "test@example.com");
    expect(ok).toBe(true);
    expect(mem[AUTH_TOKEN]).toBe(newToken);
    expect(mem[REFRESH_TOKEN]).toBe("y");
    expect(clientToken).toBe(newToken);
  });

  it("refreshToken failure clears tokens", async () => {
    const expired = createToken({ sub: "u1" }, -60);
    setStoredTokens(expired, "refresh123");
    mockedAuth.refreshToken.mockResolvedValue({ statusCode: 401, error: "invalid", message: "failed" } as any);
    const ok = await initAndValidate();
    expect(ok).toBe(false);
    expect(mem[AUTH_TOKEN]).toBeUndefined();
    expect(mem[REFRESH_TOKEN]).toBeUndefined();
    expect(clientToken).toBeNull();
  });

  it("signOut clears tokens and calls logout", async () => {
    setStoredTokens("valid", "r1");
    await signOut();
    expect(mem[AUTH_TOKEN]).toBeUndefined();
    expect(mem[REFRESH_TOKEN]).toBeUndefined();
    expect(mockedAuth.logout).toHaveBeenCalled();
  });
});
