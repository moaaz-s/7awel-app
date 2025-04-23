"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { z } from "zod"

interface FormState<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

interface FormOptions<T> {
  initialValues: T
  validationSchema?: z.ZodType<T>
  onSubmit?: (values: T) => void | Promise<void>
}

export function useFormState<T extends Record<string, any>>(options: FormOptions<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: options.initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
  })

  const validate = useCallback(
    (values: T) => {
      if (!options.validationSchema) return {}

      try {
        options.validationSchema.parse(values)
        return {}
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Partial<Record<keyof T, string>> = {}

          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              const key = err.path[0] as keyof T
              errors[key] = err.message
            }
          })

          return errors
        }

        return {}
      }
    },
    [options.validationSchema],
  )

  const setFieldValue = useCallback(
    (name: keyof T, value: any) => {
      setState((prev) => {
        const newValues = { ...prev.values, [name]: value }
        const errors = validate(newValues)

        return {
          ...prev,
          values: newValues,
          errors,
          isValid: Object.keys(errors).length === 0,
        }
      })
    },
    [validate],
  )

  const setFieldTouched = useCallback((name: keyof T, isTouched = true) => {
    setState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [name]: isTouched },
    }))
  }, [])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault()
      }

      setState((prev) => ({ ...prev, isSubmitting: true }))

      const errors = validate(state.values)
      const isValid = Object.keys(errors).length === 0

      setState((prev) => ({
        ...prev,
        errors,
        isValid,
        isSubmitting: false,
      }))

      if (isValid && options.onSubmit) {
        await options.onSubmit(state.values)
      }
    },
    [state.values, validate, options.onSubmit],
  )

  const resetForm = useCallback(() => {
    setState({
      values: options.initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
    })
  }, [options.initialValues])

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValid: state.isValid,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    resetForm,
  }
}
