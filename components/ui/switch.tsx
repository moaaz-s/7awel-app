"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/context/LanguageContext"

interface SwitchProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

const Switch = React.forwardRef<HTMLDivElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled = false, ...props }, ref) => {
    const { isRTL } = useLanguage()
    
    // Handle toggle
    const handleToggle = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked)
      }
    }

    const switchElement = (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked ? "bg-violet-600" : "bg-gray-200",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        onClick={handleToggle}
        data-state={checked ? "checked" : "unchecked"}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleToggle()
          }
        }}
        {...props}
      >
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: checked ? 'translateX(20px) translateY(-50%)' : 'translateX(0) translateY(-50%)',
            height: '20px',
            width: '20px',
            borderRadius: '9999px',
            backgroundColor: 'white',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: 'none'
          }}
          data-state={checked ? "checked" : "unchecked"}
        />
      </div>
    )

    // In RTL mode, wrap with special container that applies mirror technique
    return isRTL ? (
      <div className="switch-wrapper">{switchElement}</div>
    ) : (
      switchElement
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
