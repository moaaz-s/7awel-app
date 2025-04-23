"use client"

import type { ReactNode } from "react"
import { layouts, radius, shadows } from "@/components/ui-config"

interface CardContainerProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  header?: ReactNode
  footer?: ReactNode
  noPadding?: boolean
  bordered?: boolean
  hoverable?: boolean
}

export function CardContainer({
  children,
  className = "",
  onClick,
  header,
  footer,
  noPadding = false,
  bordered = true,
  hoverable = false,
}: CardContainerProps) {
  return (
    <div
      className={`
        ${radius.lg}
        ${bordered ? "border" : ""}
        ${shadows.sm}
        bg-white overflow-hidden
        ${hoverable ? "hover:bg-gray-50 cursor-pointer" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {header && <div className={`${layouts.cardHeader}`}>{header}</div>}
      <div className={noPadding ? "" : layouts.cardContent}>{children}</div>
      {footer && <div className={`${layouts.cardFooter}`}>{footer}</div>}
    </div>
  )
}
