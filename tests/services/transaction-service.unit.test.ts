import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { transactionService } from "@/services/transaction-service";
import { privateHttpClient } from "@/services/httpClients/private";
import type { ApiResponse, Contact, Transaction } from "@/types";

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
  id: "tx1",
  type: "transfer",
  amount: 100,
  assetSymbol: "USD",
  status: "completed",
  createdAt: new Date().toISOString(),
  syncedAt: Date.now(),
};

describe("transactionService core utils", () => {
  it("validateAmount detects invalid, insufficient and valid amounts", () => {
    expect(transactionService.validateAmount(-1, 10)).toEqual({ isValid: false, error: "INVALID_AMOUNT" });
    expect(transactionService.validateAmount(20, 10)).toEqual({ isValid: false, error: "INSUFFICIENT_FUNDS" });
    expect(transactionService.validateAmount(5, 10)).toEqual({ isValid: true });
  });

  it("calculateFee returns fixed 2-dec string", () => {
    expect(transactionService.calculateFee(200, 1)).toBe("2.00");
  });

  it("calculateTotal returns amount+fee", () => {
    expect(transactionService.calculateTotal(200, 1)).toBe("202.00");
  });

  it("formatDate formats ISO dates", () => {
    const iso = "2025-01-15T12:00:00Z";
    expect(transactionService.formatDate(iso)).toMatch(/January 15, 2025/);
  });

  it("generatePaymentQR embeds user and amount", () => {
    const { qrData, qrString } = transactionService.generatePaymentQR("u1", 50);
    expect(qrData.userId).toBe("u1");
    expect(qrData.amount).toBe(50);
    expect(typeof qrString).toBe("string");
    expect(JSON.parse(qrString)).toMatchObject(qrData);
  });
});

describe("transactionService.sendMoney", () => {
  afterEach(() => vi.restoreAllMocks());

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
