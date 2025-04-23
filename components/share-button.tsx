"use client"

import type React from "react"

import { useState } from "react"
import { ButtonPrimary } from "@/components/ui/button-primary"
import { ShareIcon } from "@/components/icons"
import { toast } from "@/components/ui/use-toast"

interface ShareButtonProps {
  title?: string
  text?: string
  url?: string
  className?: string
  variant?: "solid" | "outline" | "ghost"
  size?: "sm" | "md" | "lg" | "xl"
  fullWidth?: boolean
  onShareSuccess?: () => void
  onShareError?: (error: Error) => void
  children?: React.ReactNode
  disabled?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
  // Pass through any additional props for ButtonPrimary
  [key: string]: any
}

// Ensure ShareButton matches ButtonPrimary styling fully and document usage
// - Inherit all ButtonPrimary props and pass through
// - Add a default icon if not provided, but allow override
// - Document in a comment that children is the label
// - Add a testID for testing if needed

/**
 * Generic Share Button for sharing content via Web Share API or clipboard fallback.
 *
 * Props:
 * - children: custom label (button text)
 * - title, text, url: content to share
 * - icon: optional icon (defaults to ShareIcon)
 * - All ButtonPrimary props supported
 */
export function ShareButton({
  title = "Check this out!",
  text = "I thought you might find this interesting",
  url,
  className = "",
  variant = "solid",
  size = "md",
  fullWidth = false,
  onShareSuccess,
  onShareError,
  children,
  disabled = false,
  icon,
  iconPosition = "left",
  ...rest // Pass through any additional props for ButtonPrimary
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)

    try {
      // Use the Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url: url || window.location.href,
        })

        if (onShareSuccess) {
          onShareSuccess()
        }

        toast({
          title: "Shared successfully",
          description: "Content has been shared",
        })
      } else {
        // Fallback for browsers that don't support the Web Share API
        // Copy to clipboard
        await navigator.clipboard.writeText(url || window.location.href)

        toast({
          title: "Link copied to clipboard",
          description: "You can now paste and share it",
        })

        if (onShareSuccess) {
          onShareSuccess()
        }
      }
    } catch (error) {
      console.error("Error sharing:", error)

      if (onShareError && error instanceof Error) {
        onShareError(error)
      }

      toast({
        title: "Sharing failed",
        description: "There was an error sharing the content",
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <ButtonPrimary
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      onClick={handleShare}
      disabled={disabled || isSharing}
      icon={isSharing ? null : icon || <ShareIcon className="h-4 w-4" />}
      iconPosition={iconPosition}
      data-testid="share-button"
      {...rest}
    >
      {isSharing ? "Sharing..." : children || "Share"}
    </ButtonPrimary>
  )
}
