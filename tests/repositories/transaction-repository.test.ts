import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransactionRepository } from "@/platform/data-layer/repositories/transaction-repository";
import type { LocalDatabaseManager, StoreName } from "@/platform/local-db/local-db-types";
import type { Transaction } from "@/types";
import { StorageManagerV2 } from "@/platform/storage/storage-manager-v2";

// ---------------------------
// Minimal in-memory DB manager
// ---------------------------
class MemoryDB implements LocalDatabaseManager {
  private stores = new Map<StoreName, Map<string, any>>();

  async init() {}

  private ensure<T extends StoreName>(name: T) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    return this.stores.get(name)!;
  }

  async get<T extends StoreName>(store: T, key: string) {
    return this.ensure(store).get(key);
  }
  async getAll<T extends StoreName>(store: T) {
    return Array.from(this.ensure(store).values());
  }
  async set<T extends StoreName>(store: T, value: any) {
    const key = (value.id ?? `${Date.now()}`) as string;
    this.ensure(store).set(key, value);
  }
  async delete<T extends StoreName>(store: T, key: string) {
    this.ensure(store).delete(key);
  }
  async clear<T extends StoreName>(store: T) {
    this.ensure(store).clear();
  }
  // Minimal stub satisfying signature
  async query<T extends StoreName>(_store: T, _index: string, _value: any): Promise<any[]> {
    return [];
  }
  async transaction<T>(storeNames: StoreName[], _mode: any, cb: any): Promise<T> {
    // naive: no real transaction
    return cb({
      get: this.get.bind(this),
      getAll: this.getAll.bind(this),
      set: this.set.bind(this),
      delete: this.delete.bind(this),
    });
  }
}

// ---------------------------
// Mocks with hoist-safe pattern --------------------------------
vi.mock("@/services/transaction-service", () => {
  const listTransactionsMock = vi.fn();
  const getTransactionByIdMock = vi.fn();
  return {
    transactionService: {
      listTransactions: listTransactionsMock,
      getTransactionById: getTransactionByIdMock,
    },
  };
});

// Import after mock declaration
// eslint-disable-next-line import/first
import * as TxSvcModule from "@/services/transaction-service";
const { transactionService } = TxSvcModule as any;
const listTransactionsMock = transactionService.listTransactions as any;
const getTransactionByIdMock = transactionService.getTransactionById as any;


describe("TransactionRepository integration", () => {
  let repo: TransactionRepository;
  let db: MemoryDB;

  beforeEach(() => {
    db = new MemoryDB();
    const sm = new StorageManagerV2(db as any, {
      user: {} as any,
      transaction: transactionService as any,
      wallet: {} as any,
      contact: {} as any,
    });
    repo = new TransactionRepository(sm as any);
    listTransactionsMock.mockReset();
    getTransactionByIdMock.mockReset();
  });

  it("listLocal returns sorted transactions", async () => {
    const now = Date.now();
    const unsorted: Transaction[] = [
      { 
        id: "1", 
        reference: "TXN001",
        amount: 10, 
        type: "transfer", 
        status: "pending", 
        assetSymbol: "USD", 
        createdAt: new Date(now - 1000).toISOString(),
        updatedAt: new Date(now - 1000).toISOString(),
        syncedAt: now
      } as any,
      { 
        id: "2", 
        reference: "TXN002",
        amount: 20, 
        type: "payment", 
        status: "completed", 
        assetSymbol: "USD", 
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        syncedAt: now
      } as any,
    ];
    for (const tx of unsorted) {
      await db.set("recentTransactions", { ...tx });
    }
    const list = await repo.listLocal();
    expect(list[0].id).toBe("2");
    expect(list[1].id).toBe("1");
  });

  it("listRemote returns items and caches top 10 to local", async () => {
    const sample = Array.from({ length: 12 }).map((_, i) => ({ 
      id: `r${i}`, 
      reference: `TXN${i.toString().padStart(3, '0')}`,
      amount: i + 1, 
      type: "transfer", 
      status: "pending", 
      assetSymbol: "USD", 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedAt: Date.now()
    } as any));
    listTransactionsMock.mockResolvedValue({ statusCode: 200, data: { items: sample, nextCursor: null } });

    const resp = await repo.listRemote(20);
    expect(resp.items).toHaveLength(12);
    expect(listTransactionsMock).toHaveBeenCalled();

    const cached = await db.getAll("recentTransactions");
    expect(cached).toHaveLength(10);
  });

  it("getTransaction falls back to remote and caches minimal subset", async () => {
    getTransactionByIdMock.mockResolvedValue({ 
      statusCode: 200, 
      data: { 
        id: "tx9", 
        reference: "TXN009",
        amount: 99, 
        type: "transfer", 
        status: "pending", 
        assetSymbol: "USD", 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now()
      } 
    });

    const tx = await repo.getTransaction("tx9");
    expect(tx?.id).toBe("tx9");
    expect(getTransactionByIdMock).toHaveBeenCalledWith("tx9");

    const cached = await db.get("recentTransactions", "tx9");
    expect(cached).toBeTruthy();
    expect(cached?.amount).toBe(99);
  });

  describe("toCore validation", () => {
    it("should throw error for missing id", async () => {
      const invalidTx = {
        // Missing id
        amount: 100,
        type: "transfer",
        status: "completed",
        assetSymbol: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now()
      };
      
      await db.set("recentTransactions", invalidTx);
      
      // This should throw when trying to convert the invalid transaction
      await expect(async () => {
        await repo.listLocal();
      }).rejects.toThrow("missing required field 'id'");
    });

    it("should throw error for missing createdAt", async () => {
      const invalidTx = {
        id: "invalid-tx",
        // Missing createdAt
        amount: 100,
        type: "transfer",
        status: "completed",
        assetSymbol: "USD",
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now()
      };
      
      await db.set("recentTransactions", invalidTx);
      
      await expect(async () => {
        await repo.listLocal();
      }).rejects.toThrow("missing required field 'createdAt'");
    });

    it("should throw error for missing status", async () => {
      const invalidTx = {
        id: "invalid-tx",
        amount: 100,
        type: "transfer",
        // Missing status
        assetSymbol: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now()
      };
      
      await db.set("recentTransactions", invalidTx);
      
      await expect(async () => {
        await repo.listLocal();
      }).rejects.toThrow("missing required field 'status'");
    });

    it("should throw error for invalid amount", async () => {
      const invalidTx = {
        id: "invalid-tx",
        amount: -100, // Invalid negative amount
        type: "transfer",
        status: "completed",
        assetSymbol: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now()
      };
      
      await db.set("recentTransactions", invalidTx);
      
      await expect(async () => {
        await repo.listLocal();
      }).rejects.toThrow("invalid amount");
    });

    it("should handle valid transaction with all required fields", async () => {
      const validTx = {
        id: "valid-tx",
        reference: "TXN-valid",
        amount: 100,
        type: "transfer",
        status: "completed",
        assetSymbol: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now(),
        fee: 1.5
      };
      
      await db.set("recentTransactions", validTx);
      
      const transactions = await repo.listLocal();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].id).toBe("valid-tx");
      expect(transactions[0].amount).toBe(100);
      expect(transactions[0].fee).toBe(1.5);
    });

    it("should set default reference if missing", async () => {
      const txWithoutRef = {
        id: "no-ref-tx",
        // No reference field
        amount: 100,
        type: "transfer",
        status: "completed",
        assetSymbol: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now()
      };
      
      await db.set("recentTransactions", txWithoutRef);
      
      const transactions = await repo.listLocal();
      expect(transactions[0].reference).toBe("TXN-no-ref-tx");
    });

    it("should set default fee to 0 if missing", async () => {
      const txWithoutFee = {
        id: "no-fee-tx",
        reference: "TXN-no-fee",
        amount: 100,
        type: "transfer",
        status: "completed",
        assetSymbol: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now()
        // No fee field
      };
      
      await db.set("recentTransactions", txWithoutFee);
      
      const transactions = await repo.listLocal();
      expect(transactions[0].fee).toBe(0);
    });
  });
});
