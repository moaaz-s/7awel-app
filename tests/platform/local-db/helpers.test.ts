import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { ContactHelpers, TransactionHelpers } from "@/platform/local-db/local-db-common";
import { MemoryDB } from "../../utils/memory-db";

import { createHash } from 'crypto';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    // @ts-ignore
    globalThis.crypto = {
      // @ts-ignore
      subtle: {
        async digest(_alg: string, data: ArrayBuffer) {
          const hash = createHash('sha256');
          hash.update(Buffer.from(data));
          return new Uint8Array(hash.digest()).buffer;
        },
      },
    };
  }
});

const db = new MemoryDB();

beforeEach(async () => {
  await db.clear("contacts");
  await db.clear("recentTransactions");
});

describe("ContactHelpers", () => {
  it("normalizePhoneNumber returns E.164", () => {
    const num = ContactHelpers.normalizePhoneNumber("(415) 555-2671", "US");
    expect(num).toBe("+14155552671");
  });

  it("hashPhoneNumber produces deterministic hex", async () => {
    const hash1 = await ContactHelpers.hashPhoneNumber("+14155552671");
    const hash2 = await ContactHelpers.hashPhoneNumber("+14155552671");
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).toBe(hash2);
  });

  it("matchContacts stores matched contacts and flags hasAccount", async () => {
    const remote = new Set<string>();
    const ph = await ContactHelpers.hashPhoneNumber("+14155552671");
    remote.add(ph);

    const matched = await ContactHelpers.matchContacts(
      db,
      [{ name: "Alice", phoneNumbers: ["+1 415-555-2671"] }],
      remote,
    );

    expect(matched.length).toBe(1);
    const stored = await db.get("contacts", matched[0].id);
    expect(stored?.hasAccount).toBe(true);
  });
});

describe("TransactionHelpers", () => {
  it("getRecentTransactions returns newest first and limits", async () => {
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      await TransactionHelpers.addTransaction(db, {
        id: `tx${i}`,
        type: "transfer",
        amount: 10,
        assetSymbol: "USD",
        status: "completed",
        createdAt: new Date(now - i * 1000).toISOString(),
        syncedAt: now,
      } as any);
    }
    const list = await TransactionHelpers.getRecentTransactions(db, 2);
    expect(list.length).toBe(2);
    expect(list[0].id).toBe("tx0");
    expect(list[1].id).toBe("tx1");
  });
});
