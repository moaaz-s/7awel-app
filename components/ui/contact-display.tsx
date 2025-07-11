"use client"

import { useLanguage } from "@/context/LanguageContext"
import { cn } from "@/lib/utils"
import type { TransactionContact, TransactionDirection } from "@/platform/validators/schemas-zod"
import { contactResolver, ContactHelpers } from "@/platform/local-db/local-db-common"

export interface ContactDisplayProps {
  contact?: TransactionContact
  direction?: TransactionDirection
  variant?: 'full' | 'compact' | 'name-only'
  className?: string
  onClick?: () => void
  isClickable?: boolean
}

/**
 * Intelligent contact display component that handles:
 * - Unknown contacts with directional context ("From/To unknown contact")
 * - Formatted phone numbers when name is unavailable
 * - Proper name display when available
 * - RTL/LTR formatting
 * - Localized text
 * - Real-time contact resolution from phoneHash
 */
export function ContactDisplay({ 
  contact, 
  direction = 'incoming',
  variant = 'full',
  className = '',
  onClick,
  isClickable = false
}: ContactDisplayProps) {
  const { t } = useLanguage()

  // Determine what to display with real-time resolution
  const getDisplayContent = () => {
    // Case 1: Contact has pre-resolved name (legacy)
    if (contact?.name && contact.name.trim()) {
      return {
        text: contact.name,
        isUnknown: false,
        isPhone: false
      }
    }

    // Case 2: Contact has pre-resolved phone (legacy)
    if (contact?.phone && contact.phone.trim()) {
      return {
        text: contact.phone,
        isUnknown: false,
        isPhone: true
      }
    }

    // Case 3: Resolve from phoneHash (new approach)
    if (contact?.phoneHash) {
      const resolvedName = contactResolver.resolveDisplayName(contact.phoneHash, "");
      if (resolvedName) {
        return {
          text: resolvedName,
          isUnknown: false,
          isPhone: false
        }
      }

      const resolvedPhone = contactResolver.lookupPhone(contact.phoneHash);
      if (resolvedPhone) {
        return {
          text: ContactHelpers.formatPhoneForDisplay(resolvedPhone),
          isUnknown: false,
          isPhone: true
        }
      }
    }

    // Case 4: Unknown contact - use directional context for full variant
    const unknownText = variant === 'full' 
      ? (direction === 'outgoing' ? t("contact.unknownRecipient") : t("contact.unknownSender"))
      : t("contact.unknown")

    return {
      text: unknownText,
      isUnknown: true,
      isPhone: false
    }
  }

  const { text, isUnknown, isPhone } = getDisplayContent()

  // Handle compact variant - just show the name/phone without directional context
  if (variant === 'compact' && isUnknown) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {t("contact.unknown")}
      </span>
    )
  }

  // Handle name-only variant
  if (variant === 'name-only') {
    if (isUnknown) {
      return (
        <span className={cn("text-muted-foreground", className)}>
          {t("contact.unknown")}
        </span>
      )
    }
    return (
      <span className={className}>
        {text}
      </span>
    )
  }

  // Styling based on content type
  const getTextStyling = () => {
    if (isUnknown) {
      return "text-muted-foreground italic"
    }
    if (isPhone) {
      return "text-foreground font-mono"
    }
    return "text-foreground"
  }

  // Main component
  const content = (
    <span 
      className={cn(
        getTextStyling(),
        isClickable && "cursor-pointer hover:underline",
        // Ensure phone numbers display LTR even in RTL context
        isPhone && "ltr-phone-number",
        className
      )}
      dir={isPhone ? "ltr" : undefined}
    >
      {text}
    </span>
  )

  // Make clickable if needed
  if (isClickable && onClick) {
    return (
      <button 
        type="button"
        onClick={onClick}
        className={cn(
          "text-left hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded",
          !isUnknown && "text-primary"
        )}
      >
        {content}
      </button>
    )
  }

  return content
} 