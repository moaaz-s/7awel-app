import { BaseLocalDatabaseManager } from "@/platform/local-db/local-db-common";
import type { LocalDatabase, StoreName } from "@/platform/local-db/local-db-types";

/**
 * Lightweight in-memory implementation of LocalDatabaseManager for fast unit tests.
 * Provides minimal functionality required by helper tests (get/set/clear/query/transaction).
 */
export class MemoryDB extends BaseLocalDatabaseManager {
  private stores: Record<string, Map<string, any>> = {};

  async init() {
    this.isInitialized = true;
  }

  private s<T extends StoreName>(name: T) {
    if (!this.stores[name]) this.stores[name] = new Map<string, any>();
    return this.stores[name] as Map<string, LocalDatabase[T]>;
  }

  async get<T extends StoreName>(store: T, key: string) {
    return this.s(store).get(key);
  }

  async getAll<T extends StoreName>(store: T) {
    return Array.from(this.s(store).values());
  }

  async set<T extends StoreName>(store: T, value: LocalDatabase[T]) {
    this.s(store).set((value as any).id, value);
  }

  async delete<T extends StoreName>(store: T, key: string) {
    this.s(store).delete(key);
  }

  async clear<T extends StoreName>(store: T) {
    this.s(store).clear();
  }

  async query<T extends StoreName>(_store: T, _index: string, _value: any): Promise<LocalDatabase[T][]> {
    return [];
  }

  async transaction<R>(
    _stores: StoreName[],
    _mode: "readonly" | "readwrite",
    callback: (tx: any) => Promise<R>
  ): Promise<R> {
    const txCtx = {
      get: async () => undefined,
      getAll: async () => [],
      set: async () => {},
      delete: async () => {},
    };
    return callback(txCtx);
  }
}
