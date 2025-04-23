"use client"

import * as React from "react"
import {
  useForm as useReactHookForm,
  type UseFormProps,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { cn } from "@/lib/utils"

// Form context
interface FormContextValue<TFieldValues extends FieldValues = FieldValues, TContext = any> {
  form: UseFormReturn<TFieldValues, TContext>
}

const FormContext = React.createContext<FormContextValue | undefined>(undefined)

// Form provider
function FormProvider<TFieldValues extends FieldValues = FieldValues, TContext = any>({
  children,
  form,
}: {
  children: React.ReactNode
  form: UseFormReturn<TFieldValues, TContext>
}) {
  return <FormContext.Provider value={{ form }}>{children}</FormContext.Provider>
}

// Hook to use form context
function useFormContext<TFieldValues extends FieldValues = FieldValues>() {
  const context = React.useContext(FormContext)
  if (!context) {
    throw new Error("useFormContext must be used within a FormProvider")
  }
  return context.form as UseFormReturn<TFieldValues>
}

// Form component
interface FormProps<TFieldValues extends FieldValues = FieldValues, TContext = any>
  extends React.FormHTMLAttributes<HTMLFormElement> {
  form: UseFormReturn<TFieldValues, TContext>
  onSubmit: SubmitHandler<TFieldValues>
  className?: string
}

function Form<TFieldValues extends FieldValues = FieldValues, TContext = any>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<TFieldValues, TContext>) {
  return (
    <FormProvider form={form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)} {...props}>
        {children}
      </form>
    </FormProvider>
  )
}

// Form field component
interface FormFieldProps {
  name: string
  label?: string
  description?: string
  className?: string
  children: React.ReactNode
  error?: string
}

function FormField({ name, label, description, className, children, error }: FormFieldProps) {
  const form = useFormContext()
  const fieldError = error || (form.formState.errors[name]?.message as string | undefined)

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          htmlFor={name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
    </div>
  )
}

// Custom hook to create a form with zod validation
function useForm<TSchema extends z.ZodType>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver">,
) {
  return useReactHookForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    ...options,
  })
}

export { Form, FormField, useForm, useFormContext, FormProvider }
