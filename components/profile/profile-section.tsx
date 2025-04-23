"use client"

import React from "react"

interface ProfileSectionProps {
  title: string
  children: React.ReactNode
}

export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {
        title && (
          <div className="p-4 border-b">
            <h2 className="font-medium">{title}</h2>
          </div>
        )
      }
      <div className="divide-y">
        {children}
      </div>
    </div>
  )
}
