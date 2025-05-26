"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

export type AvatarSize = "sm" | "md" | "lg" | "xl"

// Create a context to share the size between Avatar and its children
type AvatarContextValue = {
  size: AvatarSize
}

const AvatarContext = React.createContext<AvatarContextValue>({ size: "md" })

type AvatarProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
  size?: AvatarSize
  border?: boolean
  initials?: string
  fallbackClassName?: string
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size = "md", border = false, initials, fallbackClassName, children, ...props }, ref) => {
  // Store the size in context to share with children
  const contextValue = React.useMemo(() => ({ size }), [size])

  return (
    <AvatarContext.Provider value={contextValue}>
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full",
          // Size variants
          size === "sm" && "h-8 w-8",
          size === "md" && "h-10 w-10",
          size === "lg" && "h-16 w-16",
          size === "xl" && "h-24 w-24",
          // Border
          border && "border-2 border-background",
          className
        )}
        {...props}
      >
        {children}
        {/* If initials are provided, automatically render the fallback */}
        {initials && !children && (
          <AvatarFallback className={fallbackClassName}>
            {initials}
          </AvatarFallback>
        )}
      </AvatarPrimitive.Root>
    </AvatarContext.Provider>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

type AvatarFallbackProps = Omit<React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>, 'size'>

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, ...props }, ref) => {
  // Get the size from context
  const { size } = React.useContext(AvatarContext)
  
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full",
        // Default styling that can be overridden
        "bg-blue-500 text-white font-bold",
        // Text size based on avatar size
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-xl",
        size === "xl" && "text-3xl",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
