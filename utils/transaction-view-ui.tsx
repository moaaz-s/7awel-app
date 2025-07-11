import React, { JSX } from "react";
import type { Transaction, Contact } from "@/types";
import type { TransactionDirection } from "@/platform/validators/schemas-zod";
import { SendIcon, ReceiveIcon, CashOutIcon } from "@/components/icons/finance-icons";
import { contactResolver } from "@/platform/local-db/local-db-common";

export type TxDirection = TransactionDirection;

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

  return "incoming"; // Safe default
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
 * Format date for display
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
 * Get display name for transaction counterparty
 * Uses already-resolved names first, then falls back to ContactResolver
 */
function getDisplayName(
  tx: Transaction, 
  direction: TxDirection,
  fallback: string = "Unknown"
): string {
  // First: Check if transaction already has resolved names (from augmentTransaction)
  const resolvedName = direction === "outgoing" ? tx.recipientName : tx.senderName;
  if (resolvedName) {
    return resolvedName;
  }
  
  // Second: Fall back to ContactResolver for phone hash resolution
  const phoneHash = direction === "outgoing" ? tx.recipientPhoneHash : tx.senderPhoneHash;
  if (phoneHash) {
    return contactResolver.resolveDisplayName(phoneHash, fallback);
  }
  
  // Third: Final fallback
  return fallback;
}

/**
 * Create formatted amount component with proper styling
 * This eliminates style discrepancy across transaction display panels
 */
function createAmountComponent(
  amountStr: string,
  direction: TxDirection,
  darkMode = false,
  className = ""
): JSX.Element {
  const colorClass = direction === "outgoing" 
    ? (darkMode ? "text-red-400" : "text-red-500")
    : (darkMode ? "text-green-400" : "text-green-500");
  
  return (
    <span className={`${colorClass} ${className}`}>
      {amountStr}
    </span>
  );
}

/**
 * Convenience helper returning all UI-derived props for a transaction
 * Enhanced with automatic locale detection and component return options
 */
export function getDisplayProps(
  tx: Transaction,
  options: {
    currentUserId?: string;
    locale?: string;  // If not provided, will try to get from LanguageContext
    dateLocale?: string;
    darkMode?: boolean;
    returnComponents?: boolean;  // New option to return formatted components
    amountComponentClassName?: string;  // Additional CSS classes for components
    iconComponentClassName?: string;  // Additional CSS classes for components
    iconComponentSize?: number;
  } = {},
): {
  direction: TxDirection;
  amountStr: string;
  icon: JSX.Element;
  dateStr: string;
  colour: { bg: string; icon: string };
  displayName: string;
  // New component returns (when returnComponents: true)
  amountComponent?: JSX.Element;
  iconComponent?: JSX.Element;
} {
  const { 
    currentUserId, 
    locale: providedLocale,
    dateLocale: providedDateLocale, 
    darkMode = false,
    returnComponents = false,
    amountComponentClassName = "",
    iconComponentClassName = "",
    iconComponentSize = 4
  } = options;
  
  // Try to get locale from LanguageContext if not provided
  let locale = providedLocale;
  if (!locale)
    locale = "en-US";

  
  const dateLocale = providedDateLocale || locale;
  const direction = getDirection(tx, currentUserId);
  const amountStr = formatAmount(tx, direction, locale);
  const icon = getIcon(tx, direction);
  const colour = getColourClasses(direction, darkMode);
  const dateInput = tx.createdAt;
  const dateStr = formatDateGeneric(dateInput, dateLocale);
  const displayName = getDisplayName(tx, direction, currentUserId);
  
  // Base return object
  const result = { 
    direction, 
    amountStr, 
    icon, 
    dateStr, 
    colour, 
    displayName 
  };
  
  // Add components if requested
  if (returnComponents) {
    return {
      ...result,
      amountComponent: createAmountComponent(amountStr, direction, darkMode, amountComponentClassName),
      iconComponent: (
        <div className={`flex h-${iconComponentSize} w-${iconComponentSize} items-center justify-center rounded-full ${colour.bg} ${iconComponentClassName}`}>
          <div className={colour.icon}>{icon}</div>
        </div>
      )
    };
  }
  
  return result;
}
