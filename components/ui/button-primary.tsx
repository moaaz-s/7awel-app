"use client"

import type { ReactNode } from "react"
import Link from "next/link"

interface ButtonPrimaryProps {
  children: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  loading?: boolean
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  fullWidth?: boolean
  type?: "button" | "submit" | "reset"
  variant?: "solid" | "outline" | "ghost" | "link"
  icon?: ReactNode
  iconPosition?: "left" | "right"
}

export function ButtonPrimary({
  children,
  onClick,
  href,
  disabled = false,
  loading = false,
  className = "",
  size = "md",
  fullWidth = false,
  type = "button",
  variant = "solid",
  icon,
  iconPosition = "left",
}: ButtonPrimaryProps) {
  // Define size classes
  const sizeClasses = {
    sm: "py-2 px-3 text-sm",
    md: "py-2 px-4",
    lg: "py-3 px-6",
    xl: "py-4 px-8 text-lg",
  }

  // Define variant classes
  const variantClasses = {
    solid: `bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700`,
    outline: `border-2 border-violet-600 text-violet-600 bg-transparent hover:bg-violet-50`,
    ghost: `text-violet-600 hover:bg-violet-50 bg-transparent`,
    link: `text-violet-600 underline-offset-4 hover:underline`
  }

  // Combine classes
  const buttonClasses = `
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${fullWidth ? "w-full" : ""}
    transition-all duration-200
    flex items-center justify-center gap-2
    font-medium rounded-md
    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
    ${className}
  `

  // Loading state
  const content = loading ? (
    <>
      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      <span>Loading...</span>
    </>
  ) : (
    <>
      {icon && iconPosition === "left" && <span>{icon}</span>}
      {children}
      {icon && iconPosition === "right" && <span>{icon}</span>}
    </>
  )

  // Render as link or button
  if (href) {
    return (
      <Link href={href} className={`inline-block ${fullWidth ? "w-full" : ""}`}>
        <button className={buttonClasses} disabled={disabled || loading} type={type}>
          {content}
        </button>
      </Link>
    )
  }

  return (
    <button type={type} className={buttonClasses} onClick={onClick} disabled={disabled || loading}>
      {content}
    </button>
  )
}
