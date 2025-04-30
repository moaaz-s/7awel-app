"use client"

import React from "react"
import Link from "next/link"
import { ChevronRightIcon } from "@/components/icons"
import { useLanguage } from "@/context/LanguageContext"

interface ProfileLinkItemProps {
  href: string
  label: string
  description: string
  icon?: React.ReactNode
  onClick?: () => void
}

export function ProfileLinkItem({
  href,
  label,
  description,
  icon,
  onClick
}: ProfileLinkItemProps) {
  const { isRTL } = useLanguage()

  // Use the correct chevron based on RTL/LTR
  const Chevron = isRTL ? (props: any) => <ChevronRightIcon {...props} className="rotate-180 h-5 w-5 text-muted-foreground" /> : ChevronRightIcon

  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4"
      onClick={onClick}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">

          {icon && (
              icon
          )}

          <span className="font-medium">{label}</span>

        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Chevron className="h-5 w-5 text-muted-foreground" />
    </Link>
  )
}
