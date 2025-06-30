import { describe, it, expect, vi } from "vitest";

// Create a simple in-memory map to act as secure storage
const mem: Record<string, string> = {};

vi.mock("@/platform/index", () => ({
  loadPlatform: () =>
    Promise.resolve({
      secureStoreSet: (k: string, v: string) => {
        mem[k] = v;
      },
      secureStoreGet: (k: string) => mem[k] ?? null,
      secureStoreRemove: (k: string) => {
        delete mem[k];
      },
    }),
}));

import { getItem, setItem, removeItem } from "@/utils/secure-storage";

describe("utils/secure-storage", () => {
  it("persists and retrieves items", async () => {
    await setItem("foo", "bar");
    expect(await getItem("foo")).toBe("bar");
  });

  it("returns null for unknown key", async () => {
    expect(await getItem("unknown")).toBeNull();
  });

  it("removes items", async () => {
    await setItem("baz", "qux");
    await removeItem("baz");
    expect(await getItem("baz")).toBeNull();
  });
});
