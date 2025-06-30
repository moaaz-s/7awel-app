import React, { JSX } from "react";
import type { Transaction } from "@/types";
import { SendIcon, ReceiveIcon, CashOutIcon } from "@/components/icons/finance-icons";

export type TxDirection = "incoming" | "outgoing";

/**
 * Determine transaction direction relative to the current user.
 */
function getDirection(tx: Transaction, currentUserId?: string): TxDirection {
  switch (tx.type) {
    case "deposit":
      return "incoming";
    case "withdraw":
      return "outgoing";
    case "transfer": {
      if (!currentUserId) return "incoming"; // default when unknown
      if (tx.senderId === currentUserId) return "outgoing";
      if (tx.recipientId === currentUserId) return "incoming";
      return "incoming";
    }
  }

  return "incoming"; // TODO: dangerou default | revise
}

/**
 * Format amount with sign based on direction.
 */
export function formatAmount(
  tx: Transaction,
  direction: TxDirection,
  locale = "en-US",
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: tx.assetSymbol || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = direction === "outgoing" ? "-" : "+";
  return `${prefix}${formatter.format(tx.amount)}`;
}

/**
 * Choose icon according to type + direction.
 */
export function formatDateGeneric(date: Date | string | number | undefined, locale = "en-US"): string {
  if (!date) return "";
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return dateObj.toLocaleDateString(locale);
}

/**
 * Choose icon according to type + direction.
 */
function getIcon(tx: Transaction, direction: TxDirection): JSX.Element {
  switch (tx.type) {
    case "deposit":
      return <ReceiveIcon className="h-4 w-4" />;
    case "withdraw":
      return <CashOutIcon className="h-4 w-4" />;
    case "transfer":
      return direction === "outgoing" ? (
        <SendIcon className="h-4 w-4" />
      ) : (
        <ReceiveIcon className="h-4 w-4" />
      );
    default:
      return <></>;
  }
}

/**
 * Tailwind colour classes for background and icon.
 */

function getColourClasses(
  direction: TxDirection,
  darkMode = false,
): { bg: string; icon: string } {
  if (direction === "outgoing") {
    return {
      bg: darkMode ? "bg-red-900" : "bg-red-100",
      icon: darkMode ? "text-red-400" : "text-red-500",
    };
  }
  return {
    bg: darkMode ? "bg-green-900" : "bg-green-100",
    icon: darkMode ? "text-green-400" : "text-green-500",
  };
}

/**
 * Convenience helper returning all UI-derived props for a transaction so that
 * callers don't need to invoke four helpers every time.
 */
export function getDisplayProps(
  tx: Transaction,
  options: {
    currentUserId?: string;
    locale?: string;
    dateLocale?: string;
    darkMode?: boolean;
  } = {},
): {
  direction: TxDirection;
  amountStr: string;
  icon: JSX.Element;
  dateStr: string;
  colour: { bg: string; icon: string };
} {
  const { currentUserId, locale = "en-US", dateLocale = locale, darkMode = false } = options;
  const direction = getDirection(tx, currentUserId);
  const amountStr = formatAmount(tx, direction, locale);
  const icon = getIcon(tx, direction);
  const colour = getColourClasses(direction, darkMode);
  const dateInput = (tx as any).createdAt;
  const dateStr = formatDateGeneric(dateInput, dateLocale);
  return { direction, amountStr, icon, dateStr, colour };
}
