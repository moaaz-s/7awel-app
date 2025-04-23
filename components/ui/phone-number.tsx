"use client"

import { cn } from "@/lib/utils"

interface PhoneNumberProps {
  value: string
  className?: string
}

/**
 * PhoneNumber component ensures proper display of phone numbers
 * regardless of the current language direction (RTL/LTR)
 */
export function PhoneNumber({ value, className }: PhoneNumberProps) {
  return (
    <span
      className={cn("font-mono", className)}
      dir="ltr" // Always display phone numbers in LTR
      style={{ direction: "ltr", unicodeBidi: "embed" }}
    >
      {value}
    </span>
  )
}
