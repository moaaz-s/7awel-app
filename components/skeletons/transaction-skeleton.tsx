import { cn } from "@/lib/utils"

interface TransactionSkeletonProps {
  className?: string
  count?: number
}

export function TransactionSkeleton({ className = "", count = 1 }: TransactionSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 rounded-lg border animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-200" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="h-5 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  )
}
