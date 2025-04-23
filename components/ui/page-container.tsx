import type { ReactNode } from "react"
import { PageHeader } from "@/components/ui/page-header"

interface PageContainerProps {
  children: ReactNode
  title: string
  backHref?: string
  action?: ReactNode
  className?: string
  contentClassName?: string
}

export function PageContainer({
  children,
  title,
  backHref,
  action,
  className = "",
  contentClassName = "",
}: PageContainerProps) {
  return (
    <div className={`flex min-h-screen flex-col bg-gray-50 ${className}`}>
      <PageHeader title={title} backHref={backHref} action={action} />
      <main className={`flex-1 p-4 ${contentClassName}`}>{children}</main>
    </div>
  )
}
