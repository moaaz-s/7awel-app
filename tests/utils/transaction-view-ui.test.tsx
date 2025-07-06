import { getDisplayProps, TxDirection } from "@/utils/transaction-view-ui";
import type { Transaction, Contact } from "@/types";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { JSX } from "react";

// Mock ContactResolver
vi.mock("@/platform/local-db/local-db-common", () => {
  const mockContacts: Contact[] = [
    {
      id: "contact1",
      name: "John Doe",
      phone: "+1234567890",
      phoneHash: "hash123",
      isFavorite: false,
      initial: "J",
      syncedAt: Date.now(),
    },
    {
      id: "contact2", 
      name: "Jane Smith",
      phone: "+1987654321",
      phoneHash: "hash456",
      isFavorite: false,
      initial: "J",
      syncedAt: Date.now(),
    },
    {
      id: "contact3",
      name: "", // Empty name should fallback to phone
      phone: "+1555123456",
      phoneHash: "hash789",
      isFavorite: false,
      initial: "U",
      syncedAt: Date.now(),
    },
  ];

  return {
    contactResolver: {
      resolveDisplayName: (phoneHash: string | undefined, fallback: string = "Unknown") => {
        if (!phoneHash) return fallback;
        
        const contact = mockContacts.find(c => c.phoneHash === phoneHash);
        if (contact) {
          return contact.name || contact.phone || fallback;
        }
        return fallback;
      },
      initialize: vi.fn(),
      isInitialized: () => true,
    }
  };
});

function getReactElementName(el: JSX.Element): string {
  if (typeof el.type === "string") return el.type;
  if (typeof el.type === "function") return el.type.name || "Function";
  return (el.type as any).displayName || (el.type as any).name || "unknown";
}

describe("utils/transaction-view-ui", () => {
  const baseTx: Omit<Transaction, "id"> = {
    reference: "TXN123",
    type: "deposit",
    amount: 100,
    assetSymbol: "USD",
    status: "completed",
    createdAt: "2023-06-01T12:00:00Z",
    updatedAt: "2023-06-01T12:00:00Z",
    syncedAt: Date.now(),
    senderPhoneHash: "hash123",
    recipientPhoneHash: "hash456",
  };

  describe("getDirection", () => {
    const directionCases: [
      Partial<Transaction>,
      string,
      TxDirection,
    ][] = [
      [{ type: "deposit" }, "any", "incoming"],
      [{ type: "transfer", senderId: "user1", recipientId: "user2" }, "user1", "outgoing"],
      [{ type: "withdraw" }, "any", "outgoing"],
      [{ type: "transfer", senderId: "user1", recipientId: "user2" }, "user2", "incoming"],
    ];

    directionCases.forEach(([partial, userId, expected]) => {
      it(`should return ${expected} for transaction type ${partial.type} with userId ${userId}`, () => {
        const tx = { ...baseTx, ...partial } as Transaction;
        const currentUserId = userId === "any" ? undefined : userId;
        const result = getDisplayProps(tx, { currentUserId });
        expect(result.direction).toBe(expected);
      });
    });
  });

  describe("getIcon", () => {
    const deposit = { ...baseTx, type: "deposit" } as Transaction;
    const withdraw = { ...baseTx, type: "withdraw" } as Transaction;
    
    it("should return ReceiveIcon for deposit", () => {
      const result = getDisplayProps(deposit);
      expect(getReactElementName(result.icon)).toBe("ReceiveIcon");
    });

    it("should return CashOutIcon for withdraw", () => {
      const result = getDisplayProps(withdraw);
      expect(getReactElementName(result.icon)).toBe("CashOutIcon");
    });

    const iconCases: [
      Partial<Transaction>,
      TxDirection,
      string,
    ][] = [
      [{ type: "deposit" }, "incoming", "ReceiveIcon"],
      [{ type: "withdraw" }, "outgoing", "CashOutIcon"],
      [{ type: "transfer", senderId: "user1" }, "outgoing", "SendIcon"],
      [{ type: "transfer", recipientId: "user1" }, "incoming", "ReceiveIcon"],
    ];

    iconCases.forEach(([partial, direction, expectedIcon]) => {
      it(`should return ${expectedIcon} for ${partial.type} transaction in ${direction} direction`, () => {
        const tx = { ...baseTx, ...partial } as Transaction;
        const result = getDisplayProps(tx);
        expect(getReactElementName(result.icon)).toBe(expectedIcon);
      });
    });
  });

  describe("getDisplayName with resolved names and ContactResolver fallback", () => {
    it("should prioritize resolved senderName over phone hash resolution", () => {
      const tx = { 
        ...baseTx, 
        type: "deposit", 
        senderName: "Already Resolved Name",
        senderPhoneHash: "hash123" 
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("Already Resolved Name");
    });

    it("should prioritize resolved recipientName over phone hash resolution", () => {
      const tx = { 
        ...baseTx, 
        type: "withdraw", 
        recipientName: "Already Resolved Recipient",
        recipientPhoneHash: "hash456" 
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("Already Resolved Recipient");
    });

    it("should fall back to ContactResolver when resolved name is missing", () => {
      const tx = { 
        ...baseTx, 
        type: "deposit", 
        // No senderName
        senderPhoneHash: "hash123" 
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("John Doe");
    });

    it("should fall back to ContactResolver for outgoing transaction when resolved name is missing", () => {
      const tx = { 
        ...baseTx, 
        type: "withdraw", 
        // No recipientName
        recipientPhoneHash: "hash456" 
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("Jane Smith");
    });

    it("should fallback to phone number when contact name is empty", () => {
      const tx = { 
        ...baseTx, 
        type: "deposit", 
        senderPhoneHash: "hash789" // Empty name, should return phone
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("+1555123456");
    });

    it("should fallback to user ID when no phone hash available", () => {
      const tx = { 
        ...baseTx, 
        type: "deposit", 
        senderId: "user123"
        // No senderPhoneHash
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("user123");
    });

    it("should return 'Unknown' when contact not found and no user ID", () => {
      const tx = { 
        ...baseTx, 
        type: "deposit",
        senderPhoneHash: "unknown_hash"
        // No senderId
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("Unknown");
    });

    it("should prioritize contact name over phone number", () => {
      const tx = { 
        ...baseTx, 
        type: "deposit", 
        senderPhoneHash: "hash123" // This hash corresponds to "John Doe"
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("John Doe");
    });
  });

  describe("formatDateGeneric", () => {
    it("should format date correctly", () => {
      const date = "2023-01-01T00:00:00Z";
      const tx = { ...baseTx, createdAt: date } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.dateStr).toMatch(/2023/);
    });
  });

  describe("getColourClasses", () => {
    it("should return red colors for outgoing transactions", () => {
      expect(getDisplayProps({ ...baseTx, type: "withdraw" } as Transaction).colour).toEqual({
        bg: "bg-red-100",
        icon: "text-red-500",
      });
    });

    it("should return green colors for incoming transactions in dark mode", () => {
      expect(getDisplayProps({ ...baseTx, type: "deposit" } as Transaction, { darkMode: true }).colour).toEqual({
        bg: "bg-green-900",
        icon: "text-green-400",
      });
    });
  });

  describe("locale formatting", () => {
    it("should use provided locale for amount formatting", () => {
      const tx = { ...baseTx, amount: 1234.56 } as Transaction;
      const result = getDisplayProps(tx, { locale: "ar-SA" });
      expect(result.amountStr).toContain("1234.56"); // Should contain the amount
    });

    it("should fall back to en-US when no locale provided", () => {
      const tx = { ...baseTx, amount: 1234.56 } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.amountStr).toMatch(/[+-].*1.*234.*56/); // Should format with commas/periods
    });

    it("should use provided dateLocale for date formatting", () => {
      const tx = { ...baseTx, createdAt: "2023-06-15T12:00:00Z" } as Transaction;
      const result = getDisplayProps(tx, { locale: "en-US", dateLocale: "ar-SA" });
      expect(result.dateStr).toBeTruthy();
    });
  });

  describe("component return options", () => {
    it("should return basic props when returnComponents is false", () => {
      const tx = { ...baseTx } as Transaction;
      const result = getDisplayProps(tx, { returnComponents: false });
      
      expect(result.amountStr).toBeTruthy();
      expect(result.icon).toBeTruthy();
      expect(result.amountComponent).toBeUndefined();
      expect(result.iconComponent).toBeUndefined();
    });

    it("should return component props when returnComponents is true", () => {
      const tx = { ...baseTx } as Transaction;
      const result = getDisplayProps(tx, { returnComponents: true });
      
      expect(result.amountStr).toBeTruthy();
      expect(result.icon).toBeTruthy();
      expect(result.amountComponent).toBeTruthy();
      expect(result.iconComponent).toBeTruthy();
      
      // Check that components are JSX elements
      expect(typeof result.amountComponent!.type).toBeTruthy();
      expect(typeof result.iconComponent!.type).toBeTruthy();
    });

    it("should apply custom className to amount component", () => {
      const tx = { ...baseTx } as Transaction;
      const result = getDisplayProps(tx, { 
        returnComponents: true,
        amountComponentClassName: "custom-class"
      });
      
      expect(result.amountComponent?.props.className).toContain("custom-class");
    });

    it("should apply custom size to icon component", () => {
      const tx = { ...baseTx } as Transaction;
      const result = getDisplayProps(tx, { 
        returnComponents: true,
        iconComponentSize: 8
      });
      
      expect(result.iconComponent?.props.className).toContain("h-8");
      expect(result.iconComponent?.props.className).toContain("w-8");
    });

    it("should apply custom className to icon component", () => {
      const tx = { ...baseTx } as Transaction;
      const result = getDisplayProps(tx, { 
        returnComponents: true,
        iconComponentClassName: "icon-custom"
      });
      
      expect(result.iconComponent?.props.className).toContain("icon-custom");
    });
  });

  describe("fallback handling", () => {
    it("should use custom fallback for unknown contacts", () => {
      const tx = { 
        ...baseTx, 
        type: "deposit",
        senderPhoneHash: "unknown_hash"
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("Unknown");
    });

    it("should handle missing phone hash gracefully", () => {
      const tx = { 
        ...baseTx, 
        type: "deposit"
        // No senderPhoneHash or senderId
      } as Transaction;
      const result = getDisplayProps(tx);
      expect(result.displayName).toBe("Unknown");
    });
  });

  describe("parameter validation", () => {
    it("should handle invalid iconComponentSize gracefully", () => {
      const tx = { ...baseTx } as Transaction;
      const result = getDisplayProps(tx, { 
        returnComponents: true,
        iconComponentSize: 0
      });
      
      expect(result.iconComponent?.props.className).toContain("h-0");
      expect(result.iconComponent?.props.className).toContain("w-0");
    });

    it("should handle empty amountComponentClassName", () => {
      const tx = { ...baseTx } as Transaction;
      const result = getDisplayProps(tx, { 
        returnComponents: true,
        amountComponentClassName: ""
      });
      
      expect(result.amountComponent).toBeTruthy();
    });
  });
});
