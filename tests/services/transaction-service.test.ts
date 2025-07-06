import { describe, it, expect, beforeEach } from "vitest";

import "@/tests/helpers/test-setup";
import { resetTestSpies, privateHttpClientSpies } from "@/tests/helpers/test-setup";

import { transactionService } from "@/services/transaction-service";
import { formatDateGeneric } from "@/utils/transaction-view-ui";
import { ErrorCode } from "@/types/errors";

// Default mock behaviours for this suite
beforeEach(() => {
  resetTestSpies();
  privateHttpClientSpies.sendMoney.mockResolvedValue({ data: { id: "tx1", amount: 100, date: Date.now(), type: "send" }, error: null });
});

describe("services/transaction-service – pure utils", () => {
  it("validateAmount returns insufficient funds", () => {
    const { isValid, error } = transactionService.validateAmount(150, 100);
    expect(isValid).toBe(false);
    expect(error).toBe(ErrorCode.INSUFFICIENT_FUNDS);
  });

  it("validateAmount invalid amount", () => {
    const { isValid, error } = transactionService.validateAmount(-1, 100);
    expect(isValid).toBe(false);
    expect(error).toBe(ErrorCode.INVALID_AMOUNT);
  });

  it("calculateFee / calculateTotal", () => {
    expect(transactionService.calculateFee(100, 1)).toBe("1.00");
    expect(transactionService.calculateTotal(100, 1)).toBe("101.00");
  });

  it("formatDateGeneric returns locale string", () => {
    const formatted = formatDateGeneric(new Date("2023-01-01T00:00:00Z"));
    expect(formatted).toMatch(/2023/);
  });

  it("groupTransactionsByDate groups correctly", () => {
    const txs = [
      { id: "1", createdAt: "2023-06-01T12:00:00Z" } as any,
      { id: "2", createdAt: "2023-06-01T13:00:00Z" } as any,
      { id: "3", createdAt: "2023-05-31T12:00:00Z" } as any,
    ];
    const groups = transactionService.groupTransactionsByDate(txs, (d) => d.split("T")[0]);
    expect(groups).toHaveLength(2);
    expect(groups[0].transactions).toHaveLength(2);
    
    // Verify newest first sorting
    expect(groups[0].formattedDate).toBe("2023-06-01");
    expect(groups[1].formattedDate).toBe("2023-05-31");
  });

  it("generatePaymentQR returns parsable string", () => {
    const { qrData, qrString } = transactionService.generatePaymentQR("user123", 50);
    expect(JSON.parse(qrString)).toEqual(qrData);
    expect(qrData.amount).toBe(50);
  });
});
