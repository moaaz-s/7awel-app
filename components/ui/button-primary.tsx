"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
  variant?: "solid" | "outline" | "ghost" | "link" | "gradient"
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
  // Map sizes to Button component sizes
  const sizeMap = {
    sm: "sm",
    md: "default",
    lg: "lg",
    xl: "lg", // Use lg for xl, with custom class adjustments
  } as const;

  // Map variants to Button component variants
  const variantMap = {
    solid: "default",
    outline: "outline",
    ghost: "ghost",
    link: "link",
    gradient: "gradient",
  } as const;
  
  const buttonSize = sizeMap[size];
  const buttonVariant = variantMap[variant];
  
  // Handle size="xl" special case
  const xlClassAdjustment = size === "xl" ? "py-6 text-lg" : "";
  
  // Combine classes
  const combinedClassName = cn(
    fullWidth ? "w-full" : "",
    xlClassAdjustment,
    className
  );

  // Loading indicator
  const content = loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {children}
    </>
  ) : (
    <>
      {icon && iconPosition === "left" && <span className="mr-2">{icon}</span>}
      {children}
      {icon && iconPosition === "right" && <span className="ml-2">{icon}</span>}
    </>
  );

  if (href) {
    return (
      <Button
        asChild
        variant={buttonVariant}
        size={buttonSize}
        className={combinedClassName}
        disabled={disabled || loading}
      >
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type={type}
      variant={buttonVariant}
      size={buttonSize}
      className={combinedClassName}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {content}
    </Button>
  );
}
