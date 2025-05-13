"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ContentCardRowItemProps {
  children: ReactNode
  className?: string
  label: string
}

/**
 * ContentCardRowItem - A reusable row item to use within @content-card component with standard styling
 */
export function ContentCardRowItem({
  children,
  className,
  label,
}: ContentCardRowItemProps) {
  return (
    <div
      className={cn(
        "flex justify-between items-center",
        className
      )}
    >
      <span className="text-muted-foreground font-bold">{label}</span>
      <span className="font-normal">{children}</span>
    </div>
  )
}
