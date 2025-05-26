"use client"

import React, { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { error } from "@/utils/logger"
import { ContentCardRowItem } from "./content-card-row-item"

interface CardSwitchItemProps {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => Promise<void> | void
  disabled?: boolean
}

export function ContentCardSwitchItem({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: CardSwitchItemProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckedChange = async (newValue: boolean) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await onCheckedChange(newValue);
    } catch (e) {
      error(`ContentCardSwitchItem: Update failed for ${label}`, e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ContentCardRowItem
      label={label}
      labelProps={{ htmlFor: id }}
      description={description}
      boldLabel={false}
    >
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={handleCheckedChange}
        disabled={disabled || isLoading}
      />
    </ContentCardRowItem>
  )
}
