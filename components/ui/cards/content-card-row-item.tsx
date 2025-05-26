"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { spacing } from "@/components/ui-config"

interface ContentCardRowItemProps {
  children: ReactNode
  className?: string
  label: string
  boldLabel?: boolean
  labelClassName?: string
  labelProps?: any
  description?: string
}

/**
 * ContentCardRowItem - A reusable row item to use within @content-card component with standard styling
 */
export function ContentCardRowItem({
  children,
  className,
  label,
  boldLabel=true,
  labelClassName,
  labelProps,
  description
}: ContentCardRowItemProps) {

  const labelOnly = (
    <span {...labelProps} className={cn(
      boldLabel ? "font-bold" : "", 
      description ? "" : "text-muted-foreground", 
      labelClassName
    )}>{label}</span>
  );

  const labelWithDescription = (
    <div className="flex flex-col">
      {labelOnly}
      <span className="text-muted-foreground">{description}</span>
    </div>
  );

  const noChildren = (
    description ? labelWithDescription : labelOnly
  );

  const withChildren = (
    <div
      className={cn(
        "flex justify-between items-start",
        className
      )}
    >
      {noChildren}
      <span className="font-normal">{children}</span>
    </div>
  )

  return (
    <div className={spacing.card}>
      {children ? withChildren : noChildren}
    </div>
  )
}
