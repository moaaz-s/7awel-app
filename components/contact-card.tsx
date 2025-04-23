"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CardContainer } from "@/components/ui/card-container"
import { typography } from "@/components/ui-config"
import { PhoneNumber } from "@/components/ui/phone-number"
import type { Contact } from "@/types"
import type { ReactNode } from "react"

interface ContactCardProps {
  contact: Contact
  onSelect?: () => void
  className?: string
  showEmail?: boolean
  avatarFallback?: React.ReactNode
  children?: React.ReactNode
  renderContent?: (contact: Contact) => React.ReactNode
}

export function ContactCard({
  contact,
  onSelect,
  className = "",
  showEmail = false,
  avatarFallback,
  children,
  renderContent,
}: ContactCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onSelect && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onSelect()
    }
  }

  // CardContainer does not support tabIndex, role, aria-pressed, or onKeyDown directly.
  // Wrap CardContainer in a div for accessibility props if onSelect is provided.
  const card = (
    <CardContainer
      className={`flex items-center gap-3 p-3 ${className}`}
      hoverable={!!onSelect}
      onClick={onSelect}
    >
      <Avatar>
        <AvatarFallback className="bg-gradient-to-r from-violet-500 to-blue-500 text-white">
          {avatarFallback ? avatarFallback : contact.initial}
        </AvatarFallback>
      </Avatar>
      <div>
        {renderContent ? (
          renderContent(contact)
        ) : (
          <>
            <p className="font-medium">{contact.name}</p>
            <PhoneNumber value={contact.phone} className={`${typography.small} ${typography.muted}`} />
            {showEmail && contact.email && (
              <p className={`${typography.small} ${typography.muted}`}>{contact.email}</p>
            )}
          </>
        )}
        {children}
      </div>
    </CardContainer>
  )

  return onSelect ? (
    <div
      tabIndex={0}
      role="button"
      aria-pressed={false}
      onKeyDown={handleKeyDown}
      style={{ outline: "none" }}
    >
      {card}
    </div>
  ) : (
    card
  )
}
