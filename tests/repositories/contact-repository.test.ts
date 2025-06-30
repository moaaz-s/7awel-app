import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { StorageManagerV2 } from "@/platform/storage/storage-manager-v2";
import { ContactRepository } from "@/platform/data-layer/repositories/contact-repository";
import type { LocalDatabaseManager, StoreName } from "@/platform/local-db/local-db-types";
import type { Contact } from "@/types";

// ---------------------------------------------------------------------------
// Memory DB harness (same minimalist impl as transaction repo test)
// ---------------------------------------------------------------------------
class MemoryDB { // implements LocalDatabaseManager
  private data: Record<string, Record<string, any>> = {};

  private ensure<T extends StoreName>(store: T) {
    if (!this.data[store]) this.data[store] = {};
    return this.data[store];
  }

  async get<T extends StoreName>(store: T, key: string) {
    return this.ensure(store)[key];
  }

  async set<T extends StoreName>(store: T, value: any) {
    this.ensure(store)[value.id] = value;
  }

  async delete<T extends StoreName>(store: T, key: string) {
    delete this.ensure(store)[key];
  }

  async getAll<T extends StoreName>(store: T) {
    return Object.values(this.ensure(store));
  }

  async clear<T extends StoreName>(store: T) {
    this.data[store] = {};
  }

  async query<T extends StoreName>(_store: T, _index: string, _value: any) {
    return [];
  }

  // very naive transaction impl – runs callback immediately with this same API
  async transaction<T>(_stores: StoreName[], _mode: any, cb: any): Promise<T> {
    return cb(this);
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/services/contact-service", () => {
  const getContactsMock = vi.fn();
  return {
    contactService: {
      getContacts: getContactsMock,
    },
    __m: { getContactsMock },
  } as any;
});

// eslint-disable-next-line import/first
import * as ContactSvcModule from "@/services/contact-service";
const { getContactsMock } = (ContactSvcModule as any).__m;

// Mock platform hash helper
vi.mock("@/platform", () => ({
  loadPlatform: async () => ({
    ContactHelpers: {
      hashPhoneNumber: async (p: string) => `hash_${p}`,
    },
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ContactRepository integration", () => {
  let db: MemoryDB;
  let storage: StorageManagerV2;
  let repo: ContactRepository;

  beforeEach(() => {
    db = new MemoryDB();
    storage = new StorageManagerV2(db as any, {
      user: {} as any,
      transaction: {} as any,
      wallet: {} as any,
      contact: {} as any,
    });
    repo = new ContactRepository(storage as any);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("refreshRemote stores remote contacts locally", async () => {
    const remoteContacts: Contact[] = [
      { id: "c1", name: "Alice", phone: "+123", email: "a@b.com", initial: "A" },
      { id: "c2", name: "Bob", phone: "+456", email: "b@b.com", initial: "B" },
    ];
    getContactsMock.mockResolvedValue({ statusCode: 200, data: { items: remoteContacts } });

    const result = await repo.refreshRemote();
    expect(result.length).toBe(2);
    const allLocal = await db.getAll("contacts");
    expect(allLocal.length).toBe(2);
    expect(allLocal[0]).toHaveProperty("phoneHash", "hash_+123");
  });

  it("addMany inserts contacts locally and queues for sync", async () => {
    const created = await repo.addMany([
      { name: "Charlie", phone: "+789", email: "c@b.com" },
    ]);
    expect(created[0].id).toMatch(/^contact_/);
    const stored = await db.get("contacts", created[0].id as string);
    expect(stored).toBeTruthy();

    // There should be exactly one item in syncQueue
    const queued = await db.getAll("syncQueue");
    expect(queued.length).toBe(1);
    expect(queued[0].operation).toBe("create");
  });

  it("updateMany merges fields and queues update", async () => {
    // seed
    const [seed] = await repo.addMany([{ name: "Dana", phone: "+000", email: "d@b.com" }]);

    const updated = await repo.updateMany([{ id: seed.id, fields: { phone: "+111" } }]);
    expect(updated[0].phone).toBe("+111");

    const stored = await db.get("contacts", seed.id);
    expect(stored.phone).toBe("+111");

    const queue = await db.getAll("syncQueue");
    expect(queue.some((q: any) => q.operation === "update" && q.data[0].id === seed.id)).toBe(true);
  });

  it("removeMany deletes contacts and queues delete", async () => {
    const [seed] = await repo.addMany([{ name: "Eve", phone: "+222", email: "e@b.com" }]);
    await repo.removeMany([seed.id]);
    const stored = await db.get("contacts", seed.id);
    expect(stored).toBeUndefined();

    const queue = await db.getAll("syncQueue");
    expect(queue.some((q: any) => q.operation === "delete" && q.data.includes(seed.id))).toBe(true);
  });
});
