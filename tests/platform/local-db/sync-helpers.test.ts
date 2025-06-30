import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SyncHelpers, BaseLocalDatabaseManager } from "@/platform/local-db/local-db-common";
import type { LocalDatabase, StoreName } from "@/platform/local-db/local-db-types";

class MemoryDB extends BaseLocalDatabaseManager {
  private stores: Record<string, Map<string, any>> = {};
  async init() { this.isInitialized = true; }
  private s<T extends StoreName>(name: T) {
    if (!this.stores[name]) this.stores[name] = new Map<string, any>();
    return this.stores[name] as Map<string, LocalDatabase[T]>;
  }
  async get<T extends StoreName>(store: T, key: string) { return this.s(store).get(key);
  }
  async getAll<T extends StoreName>(store: T) { return Array.from(this.s(store).values()); }
  async set<T extends StoreName>(store: T, value: LocalDatabase[T]) { this.s(store).set((value as any).id, value); }
  async delete<T extends StoreName>(store: T, key: string) { this.s(store).delete(key); }
  async clear<T extends StoreName>(store: T) { this.s(store).clear(); }
  async transaction<R>() { throw new Error("not implemented"); }
}

const db = new MemoryDB();

vi.useFakeTimers();

beforeEach(async () => {
  // clear syncMetadata store
  await db.clear("syncMetadata");
});

afterEach(() => {
  vi.clearAllTimers();
});

describe("SyncHelpers", () => {
  it("isSyncNeeded returns true when no metadata", async () => {
    const needed = await SyncHelpers.isSyncNeeded(db);
    expect(needed).toBe(true);
  });

  it("updateSyncStatus sets lastSync and getLastSyncTime returns it", async () => {
    await SyncHelpers.updateSyncStatus(db, "synced");
    const last = await SyncHelpers.getLastSyncTime(db);
    expect(last).toBeGreaterThan(0);
  });

  it("isSyncNeeded respects maxAge", async () => {
    await SyncHelpers.updateSyncStatus(db, "synced");
    const neededImmediately = await SyncHelpers.isSyncNeeded(db, 1000);
    expect(neededImmediately).toBe(false);

    // advance time 2 seconds
    vi.advanceTimersByTime(2000);
    const neededLater = await SyncHelpers.isSyncNeeded(db, 1000);
    expect(neededLater).toBe(true);
  });
});
