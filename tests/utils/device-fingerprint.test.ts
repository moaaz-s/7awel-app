import { describe, it, expect, vi, beforeEach } from "vitest";

// deterministic fake platform implementation

const baseInfo = {
  model: "Pixel",
  platform: "android",
  osVersion: "14",
  manufacturer: "Google",
};
const store: Record<string, string> = {};
function mockPlatform(deviceInfo: any) {
  return {
    getDeviceInfo: async () => deviceInfo,
    secureStoreGet: async (k: string) => store[k] ?? null,
    secureStoreSet: async (k: string, v: string) => { store[k] = v },
  };
}

// logger silence
vi.mock("@/utils/logger", () => ({ info: () => {} }));

// mock loadPlatform **after** baseInfo definition to avoid TDZ
vi.mock("@/platform", () => ({
  loadPlatform: () => Promise.resolve(mockPlatform(baseInfo)),
}));



describe("utils/device-fingerprint", () => {
  beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

  it("generateDeviceFingerprint is deterministic for same info", async () => {
    const { generateDeviceFingerprint } = await import("@/utils/device-fingerprint");
    const fp1 = await generateDeviceFingerprint();
    const fp2 = await generateDeviceFingerprint();
    expect(fp1).toBe(fp2);
  });

  it("different info changes fingerprint", async () => {
    // swap platform mock for a different device and reload module cache
    vi.doMock("@/platform", () => ({
      loadPlatform: () => Promise.resolve(mockPlatform({ ...baseInfo, model: "Pixel XL" })),
    }));
    // ensure subsequent import gets fresh instance
    vi.resetModules();
    const { generateDeviceFingerprint: gen2 } = await import("@/utils/device-fingerprint");
    const fpDiff = await gen2();

    // restore original platform mock and reload
    vi.doMock("@/platform", () => ({
      loadPlatform: () => Promise.resolve(mockPlatform(baseInfo)),
    }));
    vi.resetModules();
    const { generateDeviceFingerprint: genBase } = await import("@/utils/device-fingerprint");
    const fpBase = await genBase();
    expect(fpDiff).not.toBe(fpBase);
  });

  it("getDeviceId caches value via secure storage", async () => {
    const { getDeviceId } = await import("@/utils/device-fingerprint");
    const first = await getDeviceId();
    const second = await getDeviceId();
    expect(first).toBe(second);
  });
});
