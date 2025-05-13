import * as React from "react"
import { cn } from "@/lib/utils"
import { CloseIcon } from "@/components/icons"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
  icon?: React.ReactElement<{ className?: string }>
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onClear, icon, ...props }, ref) => {
    const hasValue = props.value && String(props.value).length > 0

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-2 top-1/2 flex -translate-y-1/2 items-center justify-center">
            {React.cloneElement(icon, {
              className: cn('w-4 h-4 text-muted-foreground', icon.props.className)
            })}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-2xl bg-gray-200 dark:bg-gray-800/60 px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground/60",
            "border-0 shadow-none outline-none",
            "focus:bg-gray-200/70 dark:focus:bg-gray-800/80", 
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-200",
            className
          )}
          ref={ref}
          {...props}
        />
        {onClear && hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 bg-muted-foreground/30 text-muted-foreground/70 hover:text-foreground transition-colors rounded-full"
            aria-label="Clear input"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
