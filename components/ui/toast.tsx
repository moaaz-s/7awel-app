"use client"

import * as React from "react"
import { useRef, useEffect } from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { CloseIcon } from "@/components/icons"
import { useMobile } from "@/hooks/use-mobile"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 z-[100] flex max-h-screen w-full flex-col-reverse items-center p-4 gap-2 left-1/2 -translate-x-1/2",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full max-w-[400px] flex-col items-center justify-center overflow-hidden rounded-2xl border shadow-lg transition-all data-[swipe=cancel]:translate-y-0 data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)] data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full hover:scale-[1.01] transition-transform",
  {
    variants: {
      variant: {
        default: "bg-white text-foreground border-0 shadow-xl pt-8 pb-6 px-6",
        destructive: "bg-[#161616] text-white border-0 shadow-xl pt-8 pb-6 px-6",
        info: "bg-white text-foreground border-0 shadow-xl pt-8 pb-6 px-6",
        success: "bg-white text-green-600 border-green-100 shadow-xl pt-8 pb-6 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  const { isMobile } = useMobile()
  const toastRef = useRef<HTMLLIElement>(null)
  const swipeStartY = useRef<number | null>(null)
  const swipeEndY = useRef<number | null>(null)
  
  useEffect(() => {
    const toastElement = toastRef.current
    if (!toastElement || !isMobile) return
    
    const handleTouchStart = (e: TouchEvent) => {
      // Store starting position
      swipeStartY.current = e.touches[0].clientY
    }
    
    const handleTouchMove = (e: TouchEvent) => {
      if (swipeStartY.current === null) return
      
      // Get current touch position
      const currentY = e.touches[0].clientY
      const diff = currentY - swipeStartY.current
      
      // Only allow downward swipes
      if (diff > 0) {
        // Apply transform to follow finger
        toastElement.style.transform = `translateY(${diff}px)`
        toastElement.style.opacity = `${1 - (diff / 200)}`
        e.preventDefault() // Prevent scroll
      }
    }
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (swipeStartY.current === null) return
      
      swipeEndY.current = e.changedTouches[0].clientY
      const diff = swipeEndY.current - swipeStartY.current
      
      // If swiped down more than 100px, dismiss the toast
      if (diff > 100) {
        // Get the toast id from the data-toast-id attribute
        const toastId = toastElement.closest('[data-toast-id]')?.getAttribute('data-toast-id')
        
        if (toastId) {
          // Close toast using the proper hook method
          // This requires a custom attribute we'll add to our Toast
          window.dispatchEvent(new CustomEvent('toast-dismiss', { detail: { id: toastId } }))
        }
      } else {
        // Reset position if not dismissed
        toastElement.style.transform = ''
        toastElement.style.opacity = ''
      }
      
      // Reset tracking
      swipeStartY.current = null
      swipeEndY.current = null
    }
    
    toastElement.addEventListener('touchstart', handleTouchStart, { passive: false })
    toastElement.addEventListener('touchmove', handleTouchMove, { passive: false })
    toastElement.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      toastElement.removeEventListener('touchstart', handleTouchStart)
      toastElement.removeEventListener('touchmove', handleTouchMove)
      toastElement.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile])

  // Extract the id from props for use with our gesture handling
  const { id, ...otherProps } = props
  
  return (
    <ToastPrimitives.Root
      ref={(node) => {
        // Forward the ref to both our local ref and the one passed in props
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
        toastRef.current = node
      }}
      className={cn(
        toastVariants({ variant }), 
        className, 
        "transition-all duration-200 touch-none"
      )}
      data-toast-id={id}
      id={id as string}
      {...otherProps}
    >
      {/* Gesture bar */}
      <div className="absolute top-3 left-0 right-0 flex justify-center">
        <div className="w-12 h-1 bg-gray-300 rounded-full animate-pulse"></div>
      </div>
      {props.children}
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-2xl border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-white/80 opacity-0 transition-opacity hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <CloseIcon className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-lg font-semibold text-center mb-1", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-80 text-center", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
