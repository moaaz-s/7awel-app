import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionContainerProps {
  children: ReactNode
  title?: string
  description?: string
  action?: ReactNode
  className?: string
  contentClassName?: string
  noDivider?: boolean
}

export function SectionContainer({
  children,
  title,
  description,
  action,
  className = "",
  contentClassName = "",
  noDivider = false,
}: SectionContainerProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && <h2 className="text-lg font-medium">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      {!noDivider && (title || action) && <div className="border-t" />}

      <div className={contentClassName}>{children}</div>
    </section>
  )
}
