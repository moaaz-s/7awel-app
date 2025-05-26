import type { ReactNode } from "react"
import { PageHeader } from "@/components/layouts/page-header"

interface PageContainerProps {
  children: ReactNode
  title: string
  backHref?: string
  backIconStyle?: 'arrow' | 'cross'
  action?: ReactNode
  className?: string
  contentClassName?: string
}

export function PageContainer({
  children,
  title,
  backHref,
  backIconStyle = 'arrow',
  action,
  className = "",
  contentClassName = "",
}: PageContainerProps) {
  return (
    <div className={`flex min-h-screen flex-col p-4 ${className}`}>
      <PageHeader title={title} backHref={backHref} backIconStyle={backIconStyle} action={action} />
      <main className={`flex flex-1 flex-col pb-4 ${contentClassName}`}>{children}</main>
    </div>
  )
}
