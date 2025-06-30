import { describe, it, expect } from "vitest";
import { BaseRepository } from "@/platform/data-layer/repositories/base-repository";
import type { StoreName, LocalDatabase } from "@/platform/local-db/local-db-types";

// ---------------------------------------------------------------------------
// In-memory transactional DB implementation
// ---------------------------------------------------------------------------
class TxMemoryDB {
  private store = new Map<string, any>();

  // Helpers
  private key(s: StoreName, id: string) { return `${String(s)}:${id}`; }

  async init() {}

  async get<T extends StoreName>(s: T, id: string) {
    return this.store.get(this.key(s, id)) as LocalDatabase[T] | undefined;
  }
  async getAll<T extends StoreName>(s: T) {
    const results: LocalDatabase[T][] = [];
    for (const [k, v] of this.store.entries()) if (k.startsWith(`${String(s)}:`)) results.push(v);
    return results;
  }
  async set<T extends StoreName>(s: T, v: LocalDatabase[T]) {
    // @ts-ignore id exists on every record by design
    this.store.set(this.key(s, v.id), v);
  }
  async delete<T extends StoreName>(s: T, id: string) {
    this.store.delete(this.key(s, id));
  }
  async clear<T extends StoreName>(s: T) {
    for (const k of [...this.store.keys()]) if (k.startsWith(`${String(s)}:`)) this.store.delete(k);
  }

  /** Very naive transactional wrapper good enough for tests */
  async transaction<R>(stores: StoreName[], _mode: 'readonly' | 'readwrite', cb: (tx: any) => Promise<R>): Promise<R> {
    const snapshot = new Map(this.store);

    // Minimal tx context proxies to snapshot
    const txCtx = {
      get: async <T extends StoreName>(s: T, id: string) => snapshot.get(this.key(s, id)) as LocalDatabase[T] | undefined,
      getAll: async <T extends StoreName>(s: T) => {
        const res: LocalDatabase[T][] = [];
        for (const [k, v] of snapshot.entries()) if (k.startsWith(`${String(s)}:`)) res.push(v);
        return res;
      },
      set: async <T extends StoreName>(s: T, v: LocalDatabase[T]) => {
        // @ts-ignore
        snapshot.set(this.key(s, v.id), v);
      },
      delete: async <T extends StoreName>(s: T, id: string) => {
        snapshot.delete(this.key(s, id));
      },
    };

    try {
      const result = await cb(txCtx);
      // commit
      this.store = snapshot;
      return result;
    } catch (err) {
      // rollback by not applying snapshot
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Stub StorageManager providing queueForSync batching
// ---------------------------------------------------------------------------
class StubStorageManager {
  local = new TxMemoryDB();
  public queued: any[] = [];
  async queueForSync(storeName: string, operation: string, data: any) {
    this.queued.push({ storeName, operation, data });
  }
}

// Dummy repository that exposes executeInTransaction and queueForSync
class Repo extends BaseRepository<'contacts'> {
  public addTwoContacts() {
    return this.executeInTransaction(async (tx) => {
      await tx.set('contacts', { id: 'c1', name: 'Alice', phone: '+1', phoneHash: 'h', initial: 'A', syncedAt: 0, isFavorite: false } as any);
      await tx.set('contacts', { id: 'c2', name: 'Bob', phone: '+2', phoneHash: 'h2', initial: 'B', syncedAt: 0, isFavorite: false } as any);
    });
  }
  public failingBatch() {
    return this.executeInTransaction(async (tx) => {
      await tx.set('contacts', { id: 'bad', name: 'Eve', phone: '+3', phoneHash: 'h3', initial: 'E', syncedAt: 0, isFavorite: false } as any);
      throw new Error('boom');
    });
  }
  public enqueue(data: any) {
    return this.queueForSync('create', data);
  }
  constructor(sm: StubStorageManager) { super(sm as any, 'contacts'); }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Data-layer batching & queue', () => {
  const sm = new StubStorageManager();
  const repo = new Repo(sm);

  it('commits all operations atomically', async () => {
    await repo.addTwoContacts();
    const all = await sm.local.getAll('contacts');
    expect(all.length).toBe(2);
  });

  it('rolls back when error is thrown', async () => {
    try { await repo.failingBatch(); } catch {}
    const all = await sm.local.getAll('contacts');
    // still the 2 from previous test; failing batch should not persist
    expect(all.length).toBe(2);
    expect(all.find(c => (c as any).id === 'bad')).toBeUndefined();
  });

  it('queues a single sync entry for batch', async () => {
    await repo.enqueue([{ id: 'c99' }]);
    expect(sm.queued.length).toBe(1);
    expect(sm.queued[0].storeName).toBe('contacts');
  });
});
