"use client"

import type React from "react"

import { useState } from "react"
import { loadPlatform } from "@/platform"
import { Button } from "@/components/ui/button"
import { ShareIcon } from "@/components/icons"
import { toast } from "@/components/ui/use-toast"
import { useLanguage } from "@/context/LanguageContext"

interface ShareButtonProps {
  title?: string
  text?: string
  url?: string
  className?: string
  variant?: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive" | "gradient"
  size?: "default" | "sm" | "lg" | "icon"
  fullWidth?: boolean
  onShareSuccess?: () => void
  onShareError?: (error: any) => void
  children?: React.ReactNode
  disabled?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
  // Pass through any additional props for Button
  [key: string]: any
}

/**
 * Generic Share Button for sharing content via Web Share API or clipboard fallback.
 *
 * Props:
 * - children: custom label (button text)
 * - title, text, url: content to share
 * - icon: optional icon (defaults to ShareIcon)
 * - All Button props supported
 */
export function ShareButton({
  title = "Check this out!",
  text = "I thought you might find this interesting",
  url,
  className = "",
  variant = "default",
  size = "default",
  fullWidth = false,
  onShareSuccess,
  onShareError,
  children,
  disabled = false,
  icon,
  iconPosition = "left",
  ...rest // Pass through any additional props for Button
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)
  const { t } = useLanguage()

  const handleShare = async () => {
    setIsSharing(true)

    try {
      // Use abstracted platform share
      const platform = await loadPlatform()
      const success = await platform.share({
        title,
        text,
        url: url || window.location.href,
      })

      if (success) {
        toast({
          title: t("share.successTitle"),
          description: t("share.successDescription"),
        })
        onShareSuccess?.()
      } else {
        toast({
          title: t("share.failTitle"),
          description: t("share.failDescription"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sharing:", error)

      if (onShareError && error instanceof Error) {
        onShareError(error)
      }

      toast({
        title: t("share.failTitle"),
        description: t("share.failDescription"),
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`${fullWidth ? "w-full" : ""} ${className}`}
      onClick={handleShare}
      disabled={disabled || isSharing}
      {...rest}
    >
      {isSharing ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {t("common.loading")}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {icon || <ShareIcon className="h-4 w-4" />}
          {children || "Share"}
        </span>
      )}
    </Button>
  )
}
