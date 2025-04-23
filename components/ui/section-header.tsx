import type { ReactNode } from "react"
import { typography } from "@/components/ui-config"

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, description, action, className = "" }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h2 className={typography.h2}>{title}</h2>
        {description && <p className={`${typography.small} ${typography.muted}`}>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
