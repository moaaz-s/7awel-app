import { describe, it, expect, beforeEach } from "vitest";

import "@/tests/helpers/test-setup";
import { resetTestSpies, privateHttpClientSpies } from "@/tests/helpers/test-setup";
import { transactionService } from "@/services/transaction-service";
import { ErrorCode } from "@/types/errors";

const sampleTxs = [
  {
    id: "t1",
    type: "DEBIT",
    amount: 50,
    name: "Coffee shop",
    note: "Latte",
    reference: "INV-1",
    createdAt: "2023-06-01T10:00:00Z",
  },
  {
    id: "t2",
    type: "CREDIT",
    amount: 150,
    name: "Salary",
    note: "June",
    reference: "PAY-123",
    createdAt: "2023-06-05T09:00:00Z",
  },
  {
    id: "t3",
    type: "DEBIT",
    amount: 20,
    name: "Grocery",
    note: "Eggs",
    reference: "INV-2",
    createdAt: "2023-06-07T18:00:00Z",
  },
];

beforeEach(() => {
  resetTestSpies();
  privateHttpClientSpies.listTransactions.mockResolvedValue({
    statusCode: 200,
    data: { items: sampleTxs, nextCursor: null },
  } as any);
});

describe("services/transaction-service.listTransactions", () => {
  it("returns all transactions when no filters", async () => {
    const resp = await transactionService.listTransactions();
    expect(resp.statusCode).toBe(200);
    expect(resp.data?.items).toHaveLength(3);
    expect(privateHttpClientSpies.listTransactions).toHaveBeenCalled();
  });

  it("filters by type", async () => {
    const resp = await transactionService.listTransactions({ type: "CREDIT" });
    expect(resp.data?.items).toHaveLength(1);
    expect(resp.data?.items?.[0].id).toBe("t2");
  });

  it("filters by search term across name/note/reference", async () => {
    const resp = await transactionService.listTransactions({ search: "grocery" });
    expect(resp.data?.items).toHaveLength(1);
    expect(resp.data?.items?.[0].id).toBe("t3");
  });

  it("filters by date range", async () => {
    const resp = await transactionService.listTransactions({ startDate: "2023-06-02", endDate: "2023-06-06" });
    expect(resp.data?.items).toHaveLength(1);
    expect(resp.data?.items?.[0].id).toBe("t2");
  });

  it("handles http client failure", async () => {
    privateHttpClientSpies.listTransactions.mockResolvedValueOnce({ statusCode: 500, error: "boom" } as any);
    const resp = await transactionService.listTransactions();
    expect(resp.errorCode).toBe(ErrorCode.TRANSACTION_LIST_FAILED);
  });
});
