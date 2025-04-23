import { cn } from "@/lib/utils"

interface ProfileSkeletonProps {
  className?: string
  withAvatar?: boolean
  withDetails?: boolean
}

export function ProfileSkeleton({ className = "", withAvatar = true, withDetails = true }: ProfileSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {withAvatar && (
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      )}

      {withDetails && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      )}
    </div>
  )
}
