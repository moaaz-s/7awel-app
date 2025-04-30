"use client"

import type { SVGProps } from "react"
import { useLanguage } from "@/context/LanguageContext"
import {
  // Finance Icons
  Send as SendIcon,
  ArrowDownLeft as ReceiveIcon,
  CreditCard as PaymentIcon,
  DollarSign as CashOutIcon,
  Wallet as WalletIcon,
  CreditCard as CreditCardIcon,
  Banknote as MoneyIcon,
  
  // Navigation Icons
  Home as HomeIcon,
  QrCode as ScanIcon,
  Star as PointsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowLeft,
  Menu as MenuIcon,
  Scan as ScanLineIcon,
  Image as ImageIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  
  // UI Icons
  Check as CheckIcon,
  Copy as CopyIcon,
  Share2 as ShareIcon,
  Search as SearchIcon,
  SlidersHorizontal as FilterIcon,
  CheckCircle as CheckCircleIcon,
  X as CloseIcon,
  AlertTriangle as WarningIcon,
  Fingerprint as FingerprintIcon,
  User as UserIcon,
  Bell as BellIcon,
  Shield as ShieldIcon,
  Globe as GlobeIcon,
  HelpCircle as QuestionIcon,
  LogOut as SignOutIcon,
  MessageCircle as MessageCircleIcon,
  FileText as FileTextIcon,
  HelpCircle as HelpCircleIcon,
  XCircle as ErrorCircleIcon,
  Trash2 as DeleteIcon,
  Delete as BackspaceIcon,
  ArrowRight as ArrowRightIcon,
  ChevronDown as ChevronDownIcon,
} from "lucide-react"

// Create a custom BackIcon that handles RTL
function BackIcon(props: SVGProps<SVGSVGElement>) {
  const { isRTL } = useLanguage()
  return (
    <ArrowLeft
      style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}
      {...props}
    />
  )
}

// Export all the icons
export {
  // Finance Icons
  SendIcon,
  ReceiveIcon,
  PaymentIcon,
  CashOutIcon,
  WalletIcon,
  CreditCardIcon,
  MoneyIcon,

  // Navigation Icons
  HomeIcon,
  ScanIcon,
  PointsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MenuIcon,
  ScanLineIcon,
  ImageIcon,
  HistoryIcon,
  SettingsIcon,
  
  // UI Icons
  CheckIcon,
  CopyIcon,
  ShareIcon,
  SearchIcon,
  FilterIcon,
  CheckCircleIcon,
  CloseIcon,
  WarningIcon,
  FingerprintIcon,
  UserIcon,
  BellIcon,
  ShieldIcon,
  GlobeIcon,
  QuestionIcon,
  SignOutIcon,
  MessageCircleIcon,
  FileTextIcon,
  HelpCircleIcon,
  ErrorCircleIcon,
  DeleteIcon,
  BackspaceIcon,
  ArrowRightIcon,
  BackIcon,
  ChevronDownIcon,
}

// Transaction Icon Component 
import { patterns } from "@/components/ui-config"
import type { TransactionType } from "@/types/index"

interface TransactionIconProps {
  type: TransactionType
  size?: "sm" | "md" | "lg"
  className?: string
}

export function TransactionIcon({ type, size = "md", className = "" }: TransactionIconProps) {
  const getIcon = () => {
    switch (type) {
      case "send":
        return <SendIcon className={getSizeClass(size)} />
      case "receive":
        return <ReceiveIcon className={getSizeClass(size)} />
      case "payment":
        return <PaymentIcon className={getSizeClass(size)} />
      case "cash_out":
        return <CashOutIcon className={getSizeClass(size)} />
    }
  }

  const getSizeClass = (iconSize: "sm" | "md" | "lg") => {
    switch (iconSize) {
      case "sm": return "h-4 w-4"
      case "lg": return "h-6 w-6"
      default: return "h-5 w-5" // md is default
    }
  }

  const containerSize =
    size === "sm" ? patterns.iconContainer.sm : size === "lg" ? patterns.iconContainer.lg : patterns.iconContainer.md

  const iconBgColor = getIconBgColor()

  return (
    <div className={`${containerSize} ${iconBgColor} rounded-full flex items-center justify-center ${className}`}>
      {getIcon()}
    </div>
  )

  function getIconBgColor() {
    switch (type) {
      case "send":
        return "bg-red-100"
      case "receive":
        return "bg-green-100"
      case "payment":
        return "bg-blue-100"
      case "cash_out":
        return "bg-orange-100"
    }
  }
}
