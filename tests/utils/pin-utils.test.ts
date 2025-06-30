import { describe, it, expect, vi, beforeAll } from "vitest";

// ---- stub minimal WebCrypto compatible API -------------------------------

const fixedSalt = new Uint8Array(Array.from({ length: 16 }, (_, i) => i + 1));

// importKey returns the Uint8Array we pass so deriveBits can read the pin bytes
function importKey(_format: string, keyData: Uint8Array) {
  return keyData; // just echo back bytes for deriveBits
}

function deriveBits(_params: any, keyMaterial: Uint8Array, length: number) {
  const out = new Uint8Array(length / 8);
  for (let i = 0; i < out.length; i++) {
    out[i] = keyMaterial[i % keyMaterial.length];
  }
  return out.buffer;
}

const cryptoStub = {
  getRandomValues: (arr: Uint8Array) => {
    arr.set(fixedSalt);
    return arr;
  },
  subtle: {
    importKey: importKey as any,
    deriveBits: deriveBits as any,
  },
};

// Attach before module import so pin-utils picks it up
beforeAll(() => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  if (!desc || desc.configurable) {
    Object.defineProperty(globalThis, "crypto", { value: cryptoStub, configurable: true });
  } else {
    // fall back: patch methods instead of replacing object
    // @ts-ignore
    globalThis.crypto.getRandomValues = cryptoStub.getRandomValues;
    // @ts-ignore
    globalThis.crypto.subtle = cryptoStub.subtle as any;
  }
});

// silence logger
vi.mock("@/utils/logger", () => ({ info: () => {}, error: () => {}, warn: () => {} }));

import { hashPin, verifyPin } from "@/utils/pin-utils";

describe("utils/pin-utils", () => {
  it("hashPin + verifyPin round-trip", async () => {
    const pin = "1234";
    const stored = await hashPin(pin);
    expect(stored.split(".")).toHaveLength(3);
    const ok = await verifyPin(pin, stored);
    expect(ok).toBe(true);
  });

  it("verifyPin returns false for wrong pin", async () => {
    const stored = await hashPin("1111");
    expect(await verifyPin("2222", stored)).toBe(false);
  });

  it("verifyPin returns false for malformed stored hash", async () => {
    expect(await verifyPin("1234", "bad.hash" )).toBe(false);
  });
});
