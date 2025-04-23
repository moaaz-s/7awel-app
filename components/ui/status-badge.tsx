import { colors, radius, typography } from "@/components/ui-config"

type StatusType = "success" | "error" | "warning" | "info" | "pending" | "completed" | "failed"

interface StatusBadgeProps {
  status: StatusType
  text?: string
  className?: string
}

export function StatusBadge({ status, text, className = "" }: StatusBadgeProps) {
  // Define status styles
  const statusStyles = {
    success: `${colors.success.light} ${colors.success.text}`,
    error: `${colors.error.light} ${colors.error.text}`,
    warning: `${colors.warning.light} ${colors.warning.text}`,
    info: `bg-blue-50 text-blue-500`,
    pending: `bg-amber-50 text-amber-500`,
    completed: `${colors.success.light} ${colors.success.text}`,
    failed: `${colors.error.light} ${colors.error.text}`,
  }

  // Default text based on status
  const defaultText = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
    pending: "Pending",
    completed: "Completed",
    failed: "Failed",
  }

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        ${typography.tiny} font-medium
        ${radius.full}
        ${statusStyles[status]}
        ${className}
      `}
    >
      {text || defaultText[status]}
    </span>
  )
}
