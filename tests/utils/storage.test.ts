import { describe, it, expect, beforeEach, vi } from "vitest";

// -------------------- in-memory secure storage mock ------------------------
const mem: Record<string, string> = {};
vi.mock("@/utils/secure-storage", () => ({
  getItem: async (k: string) => mem[k] ?? null,
  setItem: async (k: string, v: string) => { mem[k] = v },
  removeItem: async (k: string) => { delete mem[k] },
}));

// mock constants consumed by storage.ts
vi.mock("@/constants/auth-constants", () => ({
  MAX_PIN_ATTEMPTS: 5,
  SESSION_TTL_MS: 30 * 60 * 1000,
  SESSION_IDLE_TIMEOUT_MS: 5 * 60 * 1000,
}));

// mock logger to keep output clean
vi.mock("@/utils/logger", () => ({ info: () => {}, error: () => {} }));

import {
  getPinAttempts,
  incrementPinAttempts,
  resetPinAttempts,
  getPinLockUntil,
  setPinLockUntil,
  getOtpAttempts,
  incrementOtpAttempts,
  resetOtpAttempts,
  getOtpLockUntil,
  setOtpLockUntil,
  setPinForgotten,
  clearPinForgotten,
  isPinForgotten,
} from "@/utils/storage";

const PIN_ATTEMPTS_KEY = "app_pin_attempts";

function nowMs(ms: number) { return ms; }

describe("utils/storage", () => {
  beforeEach(() => {
    Object.keys(mem).forEach(k => delete mem[k]);
  });

  it("increments and caps PIN attempts", async () => {
    expect(await getPinAttempts()).toBe(0);
    for (let i = 1; i <= 7; i++) {
      const attempts = await incrementPinAttempts();
      const expected = Math.min(i, 5); // MAX_PIN_ATTEMPTS mocked to 5
      expect(attempts).toBe(expected);
      expect(await getPinAttempts()).toBe(expected);
    }
  });

  it("resetPinAttempts clears counter", async () => {
    await incrementPinAttempts();
    await resetPinAttempts();
    expect(await getPinAttempts()).toBe(0);
  });

  it("setPinLockUntil & getPinLockUntil roundtrip", async () => {
    const until = Date.now() + 10_000;
    await setPinLockUntil(until);
    expect(await getPinLockUntil()).toBe(until);
  });

  it("OTP attempts are namespaced per value", async () => {
    const phone = "+123";
    const email = "a@b.com";

    await incrementOtpAttempts(phone);
    await incrementOtpAttempts(phone);
    await incrementOtpAttempts(email);

    expect(await getOtpAttempts(phone)).toBe(2);
    expect(await getOtpAttempts(email)).toBe(1);

    await resetOtpAttempts(phone);
    expect(await getOtpAttempts(phone)).toBe(0);
    expect(await getOtpAttempts(email)).toBe(1);
  });

  it("OTP lock until roundtrip", async () => {
    const value = "test";
    const until = Date.now() + 60_000;
    await setOtpLockUntil(value, until);
    expect(await getOtpLockUntil(value)).toBe(until);
  });

  it("pin forgotten flag helpers", async () => {
    expect(await isPinForgotten()).toBe(false);
    await setPinForgotten();
    expect(await isPinForgotten()).toBe(true);
    await clearPinForgotten();
    expect(await isPinForgotten()).toBe(false);
  });
});
