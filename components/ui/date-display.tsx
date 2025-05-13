"use client"

import { useLanguage } from "@/context/LanguageContext"

export interface DateDisplayProps {
  /**
   * The date to display
   */
  date: Date | string
  /**
   * The format to display the date in
   */
  format?: 'long' | 'short' | 'datetime' | 'time'
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * DateDisplay component for consistent date formatting
 * 
 * This component ensures that dates are displayed consistently across the application
 * and prevents RTL languages from affecting date display order.
 */
export function DateDisplay({ date, format = 'long', className = '' }: DateDisplayProps) {
  // Always use 'en-US' locale for dates as requested
  const locale = 'en-US'
  
  // Convert string date to Date object if necessary
  const dateObj = typeof date === "string" ? new Date(date) : date
  
  // Define date format options based on the requested format
  let formattedDate = ''
  
  switch (format) {
    case 'long':
      formattedDate = dateObj.toLocaleDateString(locale, { 
        month: "long", 
        day: "numeric", 
        year: "numeric" 
      })
      break
    case 'short':
      formattedDate = dateObj.toLocaleDateString(locale, { 
        month: "short", 
        day: "numeric" 
      })
      break
    case 'datetime':
      const dateString = dateObj.toLocaleDateString(locale, { 
        month: "short", 
        day: "numeric" 
      })
      const timeString = dateObj.toLocaleTimeString(locale, { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true
      })
      formattedDate = `${dateString}, ${timeString}`
      break
    case 'time':
      formattedDate = dateObj.toLocaleTimeString(locale, { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true
      })
      break
  }

  // Return the formatted date in a span with dir="ltr" to ensure correct display in RTL contexts
  return (
    <span className={className} dir="ltr">
      {formattedDate}
    </span>
  )
}
