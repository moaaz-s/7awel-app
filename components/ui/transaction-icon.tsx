"use client"

import { patterns } from "@/components/ui-config"
import type { TransactionType } from "@/context/AppContext"
import { useLanguage } from "@/context/LanguageContext"

// Standardized transaction icons
export const SendIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizeClass}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

export const ReceiveIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizeClass}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

export const PaymentIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizeClass}
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
}

export const CashOutIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizeClass}
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  )
}

export const ScanIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizeClass}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  )
}

export const HomeIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizeClass}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

export const PointsIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizeClass}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export const ShareIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizeClass}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

export const ChevronLeftIcon = () => {
  const { isRTL } = useLanguage()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export const ChevronRightIcon = () => {
  const { isRTL } = useLanguage()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

interface TransactionIconProps {
  type: TransactionType
  size?: "sm" | "md" | "lg"
  className?: string
}

export function TransactionIcon({ type, size = "md", className = "" }: TransactionIconProps) {
  const getIcon = () => {
    switch (type) {
      case "send":
        return <SendIcon size={size} />
      case "receive":
        return <ReceiveIcon size={size} />
      case "payment":
        return <PaymentIcon size={size} />
      case "cash_out":
        return <CashOutIcon size={size} />
    }
  }

  const getIconBgColor = () => {
    switch (type) {
      case "send":
        return "bg-red-100"
      case "receive":
        return "bg-green-100"
      case "payment":
        return "bg-gray-100"
      case "cash_out":
        return "bg-blue-100"
    }
  }

  const getIconColor = () => {
    switch (type) {
      case "send":
        return "text-red-500"
      case "receive":
        return "text-green-500"
      case "payment":
        return "text-gray-500"
      case "cash_out":
        return "text-blue-500"
    }
  }

  const containerSize =
    size === "sm" ? patterns.iconContainer.sm : size === "lg" ? patterns.iconContainer.lg : patterns.iconContainer.md

  return <div className={`${containerSize} ${getIconBgColor()} ${getIconColor()} ${className}`}>{getIcon()}</div>
}
