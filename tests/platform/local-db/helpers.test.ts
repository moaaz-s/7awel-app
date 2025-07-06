import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { ContactHelpers, TransactionHelpers } from "@/platform/local-db/local-db-common";
import { MemoryDB } from "../../utils/memory-db";

import { createHash } from 'crypto';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    // Mocking crypto for tests
    (globalThis as any).crypto = {
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

  describe("formatPhoneForDisplay", () => {
    it("should format valid phone number using libphonenumber-js", () => {
      const formatted = ContactHelpers.formatPhoneForDisplay("+14155552671");
      expect(formatted).toBe("+1 415 555 2671"); // International format
    });

    it("should return original number for invalid phone", () => {
      const invalid = "invalid-phone";
      const formatted = ContactHelpers.formatPhoneForDisplay(invalid);
      expect(formatted).toBe(invalid);
    });

    it("should handle empty string", () => {
      const formatted = ContactHelpers.formatPhoneForDisplay("");
      expect(formatted).toBe("");
    });
  });

  describe("resolveDisplayName", () => {
    const mockContacts = [
      { phoneHash: "hash123", name: "John Doe", phone: "+14155552671" },
      { phoneHash: "hash456", name: "", phone: "+19875554321" },
      { phoneHash: "hash789", name: "Jane Smith", phone: "+15551234567" },
    ];

    it("should return contact name when found", () => {
      const result = ContactHelpers.resolveDisplayName("hash123", mockContacts);
      expect(result).toBe("John Doe");
    });

    it("should return formatted phone when name is empty", () => {
      const result = ContactHelpers.resolveDisplayName("hash456", mockContacts);
      expect(result).toBe("+1 987 555 4321"); // Formatted phone
    });

    it("should return fallback when contact not found", () => {
      const result = ContactHelpers.resolveDisplayName("unknown", mockContacts, "Custom Fallback");
      expect(result).toBe("Custom Fallback");
    });

    it("should return default fallback when contact not found and no custom fallback", () => {
      const result = ContactHelpers.resolveDisplayName("unknown", mockContacts);
      expect(result).toBe("Unknown");
    });

    it("should handle undefined phoneHash", () => {
      const result = ContactHelpers.resolveDisplayName(undefined, mockContacts);
      expect(result).toBe("Unknown");
    });

    it("should handle empty contacts array", () => {
      const result = ContactHelpers.resolveDisplayName("hash123", []);
      expect(result).toBe("Unknown");
    });
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
