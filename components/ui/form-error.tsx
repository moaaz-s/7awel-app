import { cn } from "@/lib/utils"
import { WarningIcon } from "@/components/icons/ui-icons"

interface FormErrorProps {
  message?: string
  className?: string
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null

  return (
    <div className={cn("flex items-center gap-2 text-red-500 text-sm mt-1", className)}>
      <WarningIcon className="h-4 w-4" />
      <span>{message}</span>
    </div>
  )
}
