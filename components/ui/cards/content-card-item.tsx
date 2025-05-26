"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { radius, spacing, typography } from "@/components/ui-config"

// Omit HTML attributes that will be handled specifically
export interface ContentCardItemProps 
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** Icon to display on the left side */
  icon?: React.ReactNode
  /** Main label/title of the item */
  label?: React.ReactNode
  /** Optional description text */
  description?: React.ReactNode
  /** Optional right side content (e.g., chevron, badge, amount) */
  rightContent?: React.ReactNode
  /** If provided, wraps the item in a Link */
  href?: string
  /** If provided, executes when the item is clicked */
  onClick?: () => void
  /** Makes the entire item clickable with hover/active states */
  interactive?: boolean
  /** Custom content renderer (overrides default layout) */
  renderContent?: () => React.ReactNode
  /** Additional className for the container */
  className?: string
  /** Additional className for the content wrapper */
  contentClassName?: string
}

/**
 * ContentCardItem - A versatile container for items within ContentCard
 * 
 * Can be used as a link, button, or static container with consistent styling
 */
export function ContentCardItem({
  icon,
  label,
  description,
  rightContent,
  href,
  onClick,
  interactive = true,
  renderContent,
  className,
  contentClassName,
  children,
  ...props
}: ContentCardItemProps) {
  // Base container classes
  const containerClasses = cn(
    radius.baseline,
    spacing.card,
    "block",
    interactive && "transition-all duration-200 hover:bg-gray-50 active:bg-gray-100",
    className
  )
  
  // Content wrapper classes
  const contentWrapperClasses = cn(
    "flex items-center justify-between",
    contentClassName
  )

  // Default content renderer
  const defaultContent = (
    <div className={contentWrapperClasses}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="space-y-0.5">
          {label && <div className={typography.body}>{label}</div>}
          {description && (
            <div className={`${typography.small} ${typography.muted}`}>{description}</div>
          )}
          {children}
        </div>
      </div>
      {rightContent && (
        <div className="flex-shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  )

  // Content to render (custom or default)
  const content = renderContent ? renderContent() : defaultContent

  // If href is provided, wrap in Link
  if (href) {
    return (
      <Link 
        href={href} 
        className={containerClasses} 
        onClick={onClick ? (e: React.MouseEvent<HTMLAnchorElement>) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        } : undefined}
      >
        {content}
      </Link>
    )
  }

  // If onClick is provided but no href, use a div with role="button" for accessibility
  if (onClick) {
    return (
      <div 
        className={containerClasses} 
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          // Handle keyboard accessibility - trigger click on Enter or Space
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        {...props}
      >
        {content}
      </div>
    )
  }

  // Otherwise, render as a div
  return (
    <div className={containerClasses} {...props}>
      {content}
    </div>
  )
}
