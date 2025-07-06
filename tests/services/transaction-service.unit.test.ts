import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { transactionService } from "@/services/transaction-service";
import { privateHttpClient } from "@/services/httpClients/private";
import type { ApiResponse, Contact, Transaction } from "@/types";

// Mock privateHttpClient
vi.mock("@/services/httpClients/private", () => ({
  privateHttpClient: {
    sendMoney: vi.fn(),
    listTransactions: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock logger
vi.mock("@/utils/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock API utils
vi.mock("@/utils/api-utils", () => ({
  isApiSuccess: vi.fn((response) => response.statusCode >= 200 && response.statusCode < 300),
  handleError: vi.fn((message, code) => ({ statusCode: 500, message, error: message, errorCode: code, traceId: 'test' })),
  respondOk: vi.fn((data) => ({ statusCode: 200, message: 'OK', data, traceId: 'test' })),
}));

// Mock ContactResolver
vi.mock("@/platform/local-db/local-db-common", () => ({
  contactResolver: {
    resolveDisplayName: vi.fn((phoneHash: string, fallback: string = "") => {
      if (phoneHash === "sender-hash") return "Resolved Sender";
      if (phoneHash === "recipient-hash") return "Resolved Recipient";
      return fallback;
    }),
  },
}));

// Helpers
const success = <T>(data?: T): ApiResponse<T> => ({
  statusCode: 200,
  message: "OK",
  data,
  traceId: "unit-tx",
});

const dummyContact: Contact = {
  id: "c1",
  name: "Alice",
  phone: "+123",
  phoneHash: "hash",
  avatar: undefined,
  isFavorite: false,
  initial: "A",
  syncedAt: Date.now(),
};

const dummyTx: Transaction = {
  id: "1",
  reference: "TXN123",
  type: "transfer",
  status: "completed",
  amount: 100,
  assetSymbol: "USD",
  createdAt: "2023-06-01T12:00:00Z",
  updatedAt: "2023-06-01T12:00:00Z",
  syncedAt: Date.now(),
  senderId: "sender1",
  recipientId: "recipient1",
  senderPhoneHash: "sender-hash",
  recipientPhoneHash: "recipient-hash",
};

describe("transactionService core utils", () => {
  it("validateAmount should handle invalid amounts", () => {
    expect(transactionService.validateAmount(-1, 10)).toEqual({ isValid: false, error: "INVALID_AMOUNT" });
    expect(transactionService.validateAmount(20, 10)).toEqual({ isValid: false, error: "INSUFFICIENT_FUNDS" });
    expect(transactionService.validateAmount(5, 10)).toEqual({ isValid: true });
  });

  it("calculateFee should calculate correctly", () => {
    expect(transactionService.calculateFee(200, 1)).toBe("2.00");
  });

  it("calculateTotal should include fee", () => {
    expect(transactionService.calculateTotal(100, 2)).toBe("102.00");
  });

  it("generatePaymentQR should return valid QR data", () => {
    const { qrData, qrString } = transactionService.generatePaymentQR("user123", 50);
    expect(JSON.parse(qrString)).toEqual(qrData);
    expect(qrData.amount).toBe(50);
    expect(qrData.userId).toBe("user123");
  });

  it("formatDate should format correctly", () => {
    const formatted = transactionService.formatDate(new Date("2023-01-01"));
    expect(formatted).toMatch(/2023/);
  });

  it("groupTransactionsByDate should group correctly", () => {
    const txs = [
      { ...dummyTx, id: "1", createdAt: "2023-06-01T12:00:00Z" },
      { ...dummyTx, id: "2", createdAt: "2023-06-01T13:00:00Z" },
      { ...dummyTx, id: "3", createdAt: "2023-05-31T12:00:00Z" },
    ];
    const groups = transactionService.groupTransactionsByDate(txs, (d) => d.split("T")[0]);
    expect(groups).toHaveLength(2);
    expect(groups[0].transactions).toHaveLength(2);
  });
});

describe("transactionService.sendMoney", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("aborts when amount invalid", async () => {
    const res = await transactionService.sendMoney(dummyContact, -1, 100);
    expect(res.success).toBe(false);
  });

  it("returns success with transaction on API success", async () => {
    vi.spyOn(privateHttpClient, "sendMoney").mockResolvedValue(success(dummyTx));
    const res = await transactionService.sendMoney(dummyContact, 50, 100);
    expect(res.success).toBe(true);
    expect(res.transaction).toEqual(dummyTx);
  });

  it("returns failure on API error", async () => {
    vi.spyOn(privateHttpClient, "sendMoney").mockResolvedValue({ statusCode: 400, message: "bad", error: "bad", traceId: "x" });
    const res = await transactionService.sendMoney(dummyContact, 50, 100);
    expect(res.success).toBe(false);
  });
});

describe("transactionService.augmentTransaction", () => {
  it("should add resolved names to transaction using ContactResolver", async () => {
    const baseTransaction: Transaction = {
      id: "tx-1",
      reference: "TXN-001",
      type: "transfer",
      status: "completed",
      amount: 100,
      assetSymbol: "USD",
      createdAt: "2023-06-01T12:00:00Z",
      updatedAt: "2023-06-01T12:00:00Z",
      syncedAt: Date.now(),
      senderPhoneHash: "sender-hash",
      recipientPhoneHash: "recipient-hash",
    };

    const augmentedTx = await transactionService.augmentTransaction(baseTransaction);

    expect(augmentedTx.senderName).toBe("Resolved Sender");
    expect(augmentedTx.recipientName).toBe("Resolved Recipient");
    expect(augmentedTx.id).toBe("tx-1"); // Original fields preserved
    expect(augmentedTx.amount).toBe(100); // Original fields preserved
  });

  it("should handle transactions without phone hashes", async () => {
    const baseTransaction: Transaction = {
      id: "tx-2",
      reference: "TXN-002",
      type: "deposit",
      status: "completed",
      amount: 50,
      assetSymbol: "USD",
      createdAt: "2023-06-01T12:00:00Z",
      updatedAt: "2023-06-01T12:00:00Z",
      syncedAt: Date.now(),
      // No phone hashes
    };

    const augmentedTx = await transactionService.augmentTransaction(baseTransaction);

    expect(augmentedTx.senderName).toBe(""); // Empty fallback
    expect(augmentedTx.recipientName).toBe(""); // Empty fallback
    expect(augmentedTx.id).toBe("tx-2"); // Original fields preserved
  });
});
