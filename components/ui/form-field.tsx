import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { layouts, typography } from "@/components/ui-config"

interface FormFieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  error?: string
  description?: string
  required?: boolean
  className?: string
}

export function FormField({
  label,
  htmlFor,
  children,
  error,
  description,
  required = false,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`${layouts.formGroup} ${className}`}>
      <Label htmlFor={htmlFor} className={layouts.formLabel}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {description && <p className={`${typography.tiny} ${typography.muted}`}>{description}</p>}
      {error && <p className={layouts.formError}>{error}</p>}
    </div>
  )
}
