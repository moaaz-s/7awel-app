"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { ErrorIcon } from "./error-icon"
import { spacing } from "../ui-config"
import { useEffect, useRef } from 'react'
import { useHaptic } from '@/context/HapticContext'

export function Toaster() {
  const { toasts } = useToast()
  const { trigger: hapticTrigger } = useHaptic()
  const prevCountRef = useRef(toasts.length)

  useEffect(() => {
    if (toasts.length > prevCountRef.current) {
      hapticTrigger('medium')
    }
    prevCountRef.current = toasts.length
  }, [toasts, hapticTrigger])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, icon, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            {/* Custom icon if provided */}
            <div className={`flex flex-col items-center justify-center ${spacing.stack_sm}`}>
              {icon && <div className="mb-2">{icon}</div>}
              {variant === "destructive" && (
                <div className="mr-2">
                  <ErrorIcon />
                </div>
              )}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
            </div>
            {/* <ToastClose /> */}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
