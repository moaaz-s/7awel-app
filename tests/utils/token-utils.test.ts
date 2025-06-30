import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// silence logger
vi.mock("@/utils/logger", () => ({ info: () => {}, warn: () => {}, error: () => {} }));

import { decodeToken, createToken, isTokenExpired, getTokenInfo } from "@/utils/token-utils";

// helper to build unsigned token quickly
function unsignedToken(payload: Record<string, unknown>) {
  const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `header.${encoded}.sig`;
}

describe("utils/token-utils", () => {
  const realDateNow = Date.now;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("decodeToken returns payload for valid token", () => {
    const payload = { sub: "u1", exp: 9999999999 };
    const token = unsignedToken(payload);
    expect(decodeToken(token)).toEqual(payload);
  });

  it("decodeToken returns null for malformed token", () => {
    expect(decodeToken("not.a.jwt")) .toBeNull();
  });

  it("createToken generates decodable token with exp & iat", () => {
    // freeze time
    vi.spyOn(Date, "now").mockReturnValue(1_000_000_000_000);
    const token = createToken({ sub: "user123" }, 3600);
    const payload = decodeToken(token)!;
    expect(payload.sub).toBe("user123");
    expect(payload.iat).toBe(Math.floor(1_000_000_000_000 / 1000));
    expect(payload.exp).toBe(payload.iat + 3600);
  });

  it("isTokenExpired respects buffer", () => {
    const nowSec = 1_700_000_000; // arbitrary
    vi.spyOn(Date, "now").mockReturnValue(nowSec * 1000);
    const validExp = nowSec + 600; // 10 mins ahead
    const token = unsignedToken({ exp: validExp });
    expect(isTokenExpired(token, 300)).toBe(false); // 5 min buffer still ok
    expect(isTokenExpired(token, 900)).toBe(true); // 15 min buffer, should be considered expired
  });

  it("getTokenInfo returns structured info", () => {
    const now = 2_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now * 1000);
    const exp = now + 120;
    const token = unsignedToken({ sub: "abc", exp, deviceId: "d1" });
    const info = getTokenInfo(token)!;
    expect(info.isValid).toBe(false);
    expect(info.subject).toBe("abc");
    expect(info.deviceId).toBe("d1");
    expect(info.remainingSeconds).toBe(120);
  });
});
