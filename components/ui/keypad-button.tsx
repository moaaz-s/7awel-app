"use client"

import * as React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface KeypadButtonProps extends Omit<ButtonProps, 'size'> {
  /**
   * Keypad buttons have standardized sizes
   */
  size?: 'default' | 'large'
  /**
   * Children to render inside the button
   */
  children?: React.ReactNode
  /**
   * Optional active state for key presses - adds visual feedback
   */
  active?: boolean
  /**
   * Whether this is a main action button (uses primary color)
   */
  action?: boolean
  /**
   * Icon to display inside the button
   */
  icon?: React.ReactNode
}

/**
 * KeypadButton component for PIN entry and numeric keypads
 * Provides consistent styling for numeric keypad interfaces
 */
export const KeypadButton = React.forwardRef<HTMLButtonElement, KeypadButtonProps>(
  ({ className, icon, variant = "ghost", active = false, action = false, size = "default", haptic = "light", children, ...props }, ref) => {
    // Keypad buttons are always rounded
    const sizeClasses = {
      default: "w-16 h-16 text-2xl font-normal",
      large: "w-20 h-20 text-3xl font-normal"
    }
    
    // Use primary color for action buttons
    const variantToUse = action ? "default" : variant
    
    // Active state adds a slight scaling effect
    const activeClass = active ? "scale-95" : ""
    
    return (
      <Button
        className={cn(
          sizeClasses[size],
          "rounded-full transition-all duration-150 shadow-none",
          action ? "bg-primary text-primary-foreground hover:bg-primary/90" : "",
          !action && "hover:bg-muted",
          activeClass,
          className
        )}
        variant={variantToUse}
        isIconOnly={!!icon && !children}
        haptic={haptic}
        ref={ref}
        {...props}
      >
        {icon ? <span>{icon}</span> : children}
      </Button>
    )
  }
)

KeypadButton.displayName = "KeypadButton"
