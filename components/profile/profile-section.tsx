"use client"

import type React from "react"
import { SectionCard } from "../section-card"

export interface ProfileSectionProps {
  title?: string | React.ReactNode
  children: React.ReactNode
  className?: string
}

// Backwards-compatible wrapper around the new generic SectionCard
export function ProfileSection(props: ProfileSectionProps) {
  return <SectionCard {...props} />
}
