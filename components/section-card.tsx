// components/section-card.tsx
"use client"

import React from "react"

interface SectionCardProps {
  title?: string | React.ReactNode
  children: React.ReactNode
  className?: string
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <div className={"bg-white rounded-lg border overflow-hidden " + (className ?? "")}>
      {title && (
        <div className="p-4 border-b">
          {typeof title === "string" ? <h2 className="font-medium">{title}</h2> : title}
        </div>
      )}
      <div className="divide-y">{children}</div>
    </div>
  )
}
