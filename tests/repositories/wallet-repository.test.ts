import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { StorageManagerV2 } from "@/platform/storage/storage-manager-v2";
import { WalletRepository } from "@/platform/data-layer/repositories/wallet-repository";
import type { LocalDatabaseManager, StoreName } from "@/platform/local-db/local-db-types";
import type { AssetBalance } from "@/types";

// ---------------------------------------------------------------------------
// Memory DB harness (reused)
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
  async transaction<T>(_stores: StoreName[], _mode: any, cb: any): Promise<T> {
    return cb(this);
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/services/wallet-service", () => {
  const getBalanceMock = vi.fn();
  const getBalancesMock = vi.fn();
  return {
    walletService: {
      getBalance: getBalanceMock,
      getBalances: getBalancesMock,
    },
    __m: { getBalanceMock, getBalancesMock },
  } as any;
});

// eslint-disable-next-line import/first
import * as WalletSvcModule from "@/services/wallet-service";
const { getBalanceMock, getBalancesMock } = (WalletSvcModule as any).__m;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WalletRepository integration", () => {
  let db: MemoryDB;
  let storage: StorageManagerV2;
  let repo: WalletRepository;

  beforeEach(() => {
    db = new MemoryDB();
    storage = new StorageManagerV2(db as any, {
      user: {} as any,
      transaction: {} as any,
      wallet: {} as any,
      contact: {} as any,
    });
    repo = new WalletRepository(storage as any);
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getPrimaryBalance returns local cache when available", async () => {
    await db.set("balance", { id: "primary", symbol: "BTC", amount: 1, lastUpdated: Date.now() });
    const bal = await repo.getPrimaryBalance();
    expect(bal?.symbol).toBe("BTC");
    expect(getBalanceMock).not.toHaveBeenCalled();
  });

  it("getPrimaryBalance fetches remote and caches when missing locally", async () => {
    getBalanceMock.mockResolvedValue({ statusCode: 200, data: { symbol: "ETH", amount: 2 } });
    const bal = await repo.getPrimaryBalance();
    expect(bal?.symbol).toBe("ETH");
    const cached = await db.get("balance", "primary");
    expect(cached.symbol).toBe("ETH");
  });

  it("getAllBalances returns locals first", async () => {
    await db.set("balance", { id: "BTC", symbol: "BTC", amount: 1, lastUpdated: Date.now() });
    const list = await repo.getAllBalances();
    expect(list.length).toBe(1);
    expect(getBalancesMock).not.toHaveBeenCalled();
  });

  it("getAllBalances fetches remote when no locals and caches", async () => {
    const remote: AssetBalance[] = [
      { symbol: "BTC", amount: 1 },
      { symbol: "ETH", amount: 2 },
    ] as any;
    getBalancesMock.mockResolvedValue({ statusCode: 200, data: remote });

    const list = await repo.getAllBalances();
    expect(list.length).toBe(2);
    const cachedAll = await db.getAll("balance");
    expect(cachedAll.length).toBe(2);
  });

  it("refreshBalances force-updates cache", async () => {
    const remote: AssetBalance[] = [
      { symbol: "SOL", amount: 5 },
    ] as any;
    getBalancesMock.mockResolvedValue({ statusCode: 200, data: remote });

    await repo.refreshBalances();
    const cached = await db.get("balance", "SOL");
    expect(cached).toBeTruthy();
    expect(cached.amount).toBe(5);
  });
});
