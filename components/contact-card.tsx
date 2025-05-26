"use client"

import { Avatar } from "@/components/ui/avatar"
import { typography } from "@/components/ui-config"
import { PhoneNumber } from "@/components/ui/phone-number"
import type { Contact } from "@/types"
import { ContentCardItem } from "@/components/ui/cards/content-card-item"

interface ContactCardProps {
  contact: Contact
  onSelect?: () => void
  className?: string
  showEmail?: boolean
  children?: React.ReactNode
  renderContent?: (contact: Contact) => React.ReactNode
}

export function ContactCard({
  contact,
  onSelect,
  className = "",
  showEmail = false,
  children,
  renderContent,
}: ContactCardProps) {
  // Create avatar component for the contact
  const contactAvatar = (
    <Avatar 
      size="md" 
      border
      initials={contact.initial}
    />
  )

  // Create custom content renderer for the contact details
  const contactContent = () => (
    <div className="flex items-center gap-3">
      {contactAvatar}
      <div>
        {renderContent ? renderContent(contact) : (
          <div>
            <p className="font-medium">{contact.name}</p>
            <PhoneNumber value={contact.phone} className={`${typography.small} ${typography.muted}`} />
            {showEmail && contact.email && (
              <p className={`${typography.small} ${typography.muted}`}>{contact.email}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )

  // Use ContentCardItem with custom content renderer
  const card = (
    <ContentCardItem
      className={className}
      onClick={onSelect}
      interactive={!!onSelect}
      renderContent={contactContent}
    />
  )

  // ContentCardItem already handles accessibility for interactive elements
  return card
}
