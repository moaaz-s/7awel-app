import { describe, it, expect } from "vitest";
import { getDisplayProps, TxDirection } from "@/utils/transaction-view-ui";
import type { Transaction } from "@/types";
import { JSX } from "react";

// Dummy icon components return their name as displayName so we can assert easily
function getElementName(el: JSX.Element) {
  return (el.type as any).displayName || (el.type as any).name || "unknown";
}

describe("utils/transaction-view-ui", () => {
  const baseTx: Omit<Transaction, "id"> = {
    type: "deposit",
    amount: 100,
    assetSymbol: "USD",
    senderId: "alice",
    recipientId: "bob",
    createdAt: Date.now(),
  } as any;

  describe("getDisplayProps.direction", () => {
    const matrix: Array<[
      Partial<Transaction>,
      string | undefined,
      TxDirection,
    ]> = [
      // Deposit is always incoming
      [{ type: "deposit" }, "any", "incoming"],
      // Withdraw always outgoing
      [{ type: "withdraw" }, "any", "outgoing"],
      // Transfer where current user is sender => outgoing
      [
        { type: "transfer", senderId: "me", recipientId: "other" },
        "me",
        "outgoing",
      ],
      // Transfer where current user is recipient => incoming
      [
        { type: "transfer", senderId: "other", recipientId: "me" },
        "me",
        "incoming",
      ],
      // Transfer when user unknown defaults to incoming
      [
        { type: "transfer", senderId: "alice", recipientId: "bob" },
        undefined,
        "incoming",
      ],
    ];

    it.each(matrix)(
      "returns %s for %p currentUser=%s",
      (partial, currentUserId, expected) => {
        const tx = { ...baseTx, ...partial } as Transaction;
        expect(getDisplayProps(tx, { currentUserId }).direction).toBe(expected);
      },
    );
  });

  describe("getDisplayProps.amountStr", () => {
    it("prefixes '-' for outgoing and '+' for incoming", () => {
      const deposit = { ...baseTx, type: "deposit" } as Transaction;
      const withdraw = { ...baseTx, type: "withdraw" } as Transaction;
      expect(getDisplayProps(deposit).amountStr).toBe(
        `+${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(100)}`,
      );
      expect(getDisplayProps(withdraw).amountStr).toBe(
        `-${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(100)}`,
      );
    });
  });

  describe("getDisplayProps.icon", () => {
    it.each([
      [{ type: "deposit" }, "incoming", "ReceiveIcon"],
      [{ type: "withdraw" }, "outgoing", "CashOutIcon"],
      [{ type: "transfer", senderId: "me", recipientId: "other" }, "outgoing", "SendIcon"],
      [{ type: "transfer", senderId: "other", recipientId: "me" }, "incoming", "ReceiveIcon"],
    ] as const)("%p returns %s", (partial, direction, expectedName) => {
      const tx = { ...baseTx, ...partial } as Transaction;
      const { icon: el } = getDisplayProps(tx, { currentUserId: "me" });
      expect(getElementName(el)).toBe(expectedName);
    });
  });

  describe("getDisplayProps.dateStr", () => {
    it("formats ISO date to locale string", () => {
      const date = new Date("2025-01-02T10:11:12Z").toISOString();
      const tx = { ...baseTx, createdAt: date } as Transaction;
      expect(getDisplayProps(tx, { dateLocale: "en-GB" }).dateStr).toBe(new Date(date).toLocaleDateString("en-GB"));
    });
  });

  describe("getDisplayProps.colour", () => {
    it("returns red classes for outgoing light mode", () => {
      expect(getDisplayProps({ ...baseTx, type: "withdraw" } as Transaction).colour).toEqual({
        bg: "bg-red-100",
        icon: "text-red-500",
      });
    });
    it("returns green classes for incoming in dark mode", () => {
      expect(getDisplayProps({ ...baseTx, type: "deposit" } as Transaction, { darkMode: true }).colour).toEqual({
        bg: "bg-green-900",
        icon: "text-green-400",
      });
    });
  });
});
