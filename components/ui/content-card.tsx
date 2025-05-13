"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ContentCardProps {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
  noPadding?: boolean
  elevated?: boolean
}

/**
 * ContentCard - A reusable card component with standard styling
 * Used for containing content blocks like promotional items and transaction lists
 */
export function ContentCard({
  children,
  className,
  title,
  action,
  noPadding = false,
  elevated = false,
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "w-full bg-white rounded-2xl overflow-hidden",
        elevated && "shadow-sm",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-medium">{title}</h3>
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-4"}>
        {children}
      </div>
    </div>
  )
}
