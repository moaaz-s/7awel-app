"use client"

import { useLanguage } from "@/context/LanguageContext"

export type DateFormat = 'short' | 'long' | 'datetime' | 'time' | 'relative'

export interface DateFormatOptions {
  format?: DateFormat
  locale?: string
  showTime?: boolean
  is24Hour?: boolean
}

/**
 * Centralized date formatting utility with locale support
 * Ensures consistent date display across the application
 */
export class DateFormatter {
  private static getLocale(locale?: string): string {
    // Always use 'en-US' for dates to maintain consistency
    // This prevents RTL languages from affecting date display order
    return 'en-US'
  }

  /**
   * Format date with consistent styling
   */
  static format(
    date: Date | string | number | undefined,
    options: DateFormatOptions = {}
  ): string {
    if (!date) return "";
    
    const { format = 'long', locale: providedLocale, showTime = false, is24Hour = false } = options;
    const locale = this.getLocale(providedLocale);
    
    const dateObj = typeof date === "string" || typeof date === "number" 
      ? new Date(date) 
      : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      return "";
    }

    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString(locale, {
          month: "short",
          day: "numeric"
        });

      case 'long':
        return dateObj.toLocaleDateString(locale, {
          month: "long",
          day: "numeric",
          year: "numeric"
        });

      case 'datetime':
        const dateString = dateObj.toLocaleDateString(locale, {
          month: "short",
          day: "numeric"
        });
        const timeString = dateObj.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: !is24Hour
        });
        return `${dateString}, ${timeString}`;

      case 'time':
        return dateObj.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: !is24Hour
        });

      case 'relative':
        return this.formatRelative(dateObj, locale);

      default:
        return dateObj.toLocaleDateString(locale);
    }
  }

  /**
   * Format relative date (Today, Yesterday, or date)
   */
  static formatRelative(
    date: Date,
    locale: string = 'en-US',
    t?: (key: string) => string
  ): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.toDateString() === d2.toDateString();

    if (isSameDay(date, today)) {
      return t?.("transaction.today_label") || "Today";
    }
    
    if (isSameDay(date, yesterday)) {
      return t?.("transaction.yesterday_label") || "Yesterday";
    }

    // For older dates, show month and day
    return date.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  }

  /**
   * Format for transaction grouping (with translation support)
   */
  static formatForTransactionGrouping(
    date: Date | string,
    t?: (key: string) => string
  ): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return this.formatRelative(dateObj, 'en-US', t);
  }
}

/**
 * React hook for date formatting with automatic locale detection
 */
export function useDateFormatter() {
  const { t, language } = useLanguage();

  const formatDate = (
    date: Date | string | number | undefined,
    options: DateFormatOptions = {}
  ): string => {
    return DateFormatter.format(date, {
      ...options,
      locale: language === "ar" ? "ar" : "en-US"
    });
  };

  const formatRelative = (date: Date | string): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return DateFormatter.formatRelative(dateObj, 'en-US', t);
  };

  const formatForGrouping = (date: Date | string): string => {
    return DateFormatter.formatForTransactionGrouping(date, t);
  };

  return {
    formatDate,
    formatRelative,
    formatForGrouping,
    DateFormatter
  };
} 