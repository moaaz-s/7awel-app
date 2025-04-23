"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CopyIcon, CheckIcon } from "@/components/icons"

interface CopyButtonProps {
  value: string
  className?: string
}

export function CopyButton({ value, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)

      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 transition-all ${className} ${copied ? "bg-green-100 text-green-600" : ""}`}
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
    </Button>
  )
}
