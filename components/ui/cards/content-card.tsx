"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { colors, radius, shadows, spacing, typography } from "@/components/ui-config"

interface ContentCardProps {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
  padding?: "none" | "sm" | "md" | "lg"
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
  padding = "md",
  elevated = false,
}: ContentCardProps) {
  let card = (
    <div
      className={cn(
        colors.neutral.card,
        radius.baseline,
        elevated && shadows.sm,
        "w-full overflow-hidden",
        className
      )}
    >
      <div className={cn({
        "": padding === "none",
        "p-1": padding === "sm",
        "p-4": padding === "md",
        "p-6": padding === "lg"
      })}>
        {children}
      </div>
    </div>
  )

  if (title || action) 
    return (
      <div className={spacing.stack_sm}>
        <div className="flex items-center justify-between">
          <h3 className={`${typography.small} ${typography.muted} px-1 font-medium`}>{title ? title : ""}</h3>
          {action && <div className="ml-auto">{action}</div>}
        </div>
        {card}
      </div>
    )

  return card;
}
