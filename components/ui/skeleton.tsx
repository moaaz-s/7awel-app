import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("h-5 w-full rounded-md bg-gray-200 animate-pulse", className)} />
}
