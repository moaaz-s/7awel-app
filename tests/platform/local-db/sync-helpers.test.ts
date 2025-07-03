import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SyncHelpers } from "@/platform/local-db/local-db-common";
import { MemoryDB } from "../../utils/memory-db";

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
