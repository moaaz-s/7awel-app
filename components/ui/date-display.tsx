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
 * Uses proper locale while ensuring Arabic uses Gregorian calendar.
 */
export function DateDisplay({ date, format = 'long', className = '' }: DateDisplayProps) {
  const { locale } = useLanguage()
  
  // Convert string date to Date object if necessary
  const dateObj = typeof date === "string" ? new Date(date) : date
  
  // Define date format options based on the requested format
  let formattedDate = ''
  
  // For Arabic, force Gregorian calendar using explicit approach
  const formatWithGregorian = (options: Intl.DateTimeFormatOptions, isTime = false) => {
    if (locale === 'ar') {
      try {
        // Try with explicit calendar first
        const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
          ...options,
          calendar: 'gregory'
        })
        return formatter.format(dateObj)
      } catch {
        // Fallback to English if Gregorian calendar fails
        const formatter = new Intl.DateTimeFormat('en-US', options)
        return formatter.format(dateObj)
      }
    } else {
      return dateObj[isTime ? 'toLocaleTimeString' : 'toLocaleDateString'](locale, options)
    }
  }

  switch (format) {
    case 'long': {
      formattedDate = formatWithGregorian({ 
        month: "long", 
        day: "numeric", 
        year: "numeric" 
      })
      break
    }
    case 'short': {
      formattedDate = formatWithGregorian({ 
        month: "short", 
        day: "numeric" 
      })
      break
    }
    case 'datetime': {
      const dateString = formatWithGregorian({ 
        month: "short", 
        day: "numeric" 
      })
      const timeString = formatWithGregorian({ 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true
      }, true)
      formattedDate = `${dateString}, ${timeString}`
      break
    }
    case 'time': {
      formattedDate = formatWithGregorian({ 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true
      }, true)
      break
    }
  }

  // Return the formatted date in a span with dir="ltr" to ensure correct display in RTL contexts
  return (
    <span className={className} dir="ltr">
      {formattedDate}
    </span>
  )
}
