import { vi, describe, it, expect, beforeEach } from "vitest";

// In-memory stubs -------------------------------------------------------------
// stubs justification:
// Interacts with two low-level pieces that normally aren’t available in a Node
const mem: Record<string, string> = {};
vi.mock("@/utils/secure-storage", () => ({
  getItem: (key: string) => mem[key] ?? null,
  setItem: (key: string, val: string) => {
    mem[key] = val;
  },
  removeItem: (key: string) => {
    delete mem[key];
  },
}));

// Mock hash / verify to be deterministic and fast
vi.mock("@/utils/pin-utils", () => ({
  hashPin: (pin: string) => Promise.resolve(`hash-${pin}`),
  verifyPin: (pin: string, hash: string) =>
    Promise.resolve(hash === `hash-${pin}`),
}));

import {
  setPin,
  validatePin,
  clearPin,
  isPinSet,
} from "@/utils/pin-service";
import { MAX_PIN_ATTEMPTS, PIN_LOCKOUT_TIME_MS } from "@/constants/auth-constants";

// ---------------------------------------------------------------------------

describe("utils/pin-service", () => {
  beforeEach(async () => {
    for (const k of Object.keys(mem)) delete mem[k];
    await clearPin();
  });

  it("setPin stores hash and resets attempts", async () => {
    await setPin("1234");
    expect(await isPinSet()).toBe(true);
    // validate correct pin succeeds
    const res = await validatePin("1234");
    expect(res.valid).toBe(true);
  });

  it("validatePin increments attempts and locks after max", async () => {
    await setPin("1111");
    // wrong pin attempts
    for (let i = 1; i <= MAX_PIN_ATTEMPTS; i++) {
      const res = await validatePin("0000");
      if (i < MAX_PIN_ATTEMPTS) {
        expect(res.valid).toBe(false);
        expect(res.locked).not.toBe(true);
        expect(res.attemptsRemaining).toBe(MAX_PIN_ATTEMPTS - i);
      } else {
        expect(res.locked).toBe(true);
        expect(res.lockUntil).toBeGreaterThan(Date.now());
        expect(res.lockUntil).toBeLessThanOrEqual(Date.now() + PIN_LOCKOUT_TIME_MS + 50);
      }
    }
  });
});
