"use client"

import React, { useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface ProfileSwitchItemProps {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => Promise<void> | void
  disabled?: boolean
}

export function ProfileSwitchItem({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: ProfileSwitchItemProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckedChange = async (newValue: boolean) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onCheckedChange(newValue);
    } catch (error) {
      console.error("ProfileSwitchItem: Update failed", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={handleCheckedChange}
        disabled={disabled || isLoading}
      />
    </div>
  )
}
