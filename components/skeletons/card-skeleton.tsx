import { cn } from "@/lib/utils"

interface CardSkeletonProps {
  className?: string
  hasHeader?: boolean
  hasFooter?: boolean
  lines?: number
}

export function CardSkeleton({ className = "", hasHeader = true, hasFooter = false, lines = 3 }: CardSkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-white overflow-hidden", className)}>
      {hasHeader && (
        <div className="p-4 border-b">
          <div className="h-5 w-1/3 bg-gray-200 rounded animate-pulse" />
        </div>
      )}

      <div className="p-4 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 bg-gray-200 rounded animate-pulse",
              i === 0 ? "w-3/4" : i === lines - 1 ? "w-1/2" : "w-full",
            )}
          />
        ))}
      </div>

      {hasFooter && (
        <div className="p-4 border-t">
          <div className="h-8 w-full bg-gray-200 rounded animate-pulse" />
        </div>
      )}
    </div>
  )
}
