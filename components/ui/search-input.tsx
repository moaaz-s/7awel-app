"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { SearchIcon, FilterIcon } from "@/components/icons"

interface SearchInputProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  onFilterClick?: () => void
  showFilterButton?: boolean
  className?: string
}

export function SearchInput({
  placeholder,
  value,
  onChange,
  onFilterClick,
  showFilterButton = false,
  className = "",
}: SearchInputProps) {
  const { isRTL } = useLanguage()

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <div className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-muted-foreground`}>
          <SearchIcon className="h-4 w-4" />
        </div>
        <Input
          placeholder={placeholder}
          className={`h-8 rounded-full ${isRTL ? "pr-9" : "pl-9"}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {showFilterButton && (
        <Button variant="white" size="icon" shadow="none" onClick={onFilterClick} className="h-8 w-8 rounded-full">
          <FilterIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
