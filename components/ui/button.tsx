"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useHaptic } from "@/context/HapticContext"

// The updated buttonVariants with rounded pill style matching Revolut design
const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary/15 text-foreground hover:bg-secondary/25",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
        gradient: "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-sm",
      },
      size: {
        default: "h-[var(--button-height-md)] px-5 text-sm",
        sm: "h-[var(--button-height-sm)] px-4 text-xs",
        lg: "h-[var(--button-height-lg)] px-8 text-base",
        icon: "h-10 w-10",
      },
      radius: {
        default: "rounded-[var(--button-radius)]", // Pill shape (rounded-full)
        md: "rounded-md",
        sm: "rounded-sm",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  isIconOnly?: boolean
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    radius, 
    isIconOnly = false, 
    asChild = false, 
    isLoading = false, 
    haptic = false,
    onClick,
    children, 
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    const padding = isIconOnly ? "p-0" : ""
    // Auto apply rounded-full when isIconOnly is true
    const buttonRadius = isIconOnly ? "rounded-full" : ""
    const { trigger, isAvailable } = useHaptic();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback if enabled
      if (haptic && isAvailable && !props.disabled && !isLoading) {
        trigger(haptic === true ? 'light' : haptic);
      }
      // Call the original onClick handler if provided
      onClick?.(e);
    };
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, radius, className }), padding, buttonRadius)} 
        disabled={isLoading || props.disabled}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
