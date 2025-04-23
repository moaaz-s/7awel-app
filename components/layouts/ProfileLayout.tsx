import type { ReactNode } from "react"
import { PageHeader } from "@/components/ui/page-header"

interface ProfileLayoutProps {
  children: ReactNode
  title: string
  backHref?: string
  action?: ReactNode
}

export function ProfileLayout({ children, title, backHref = "/profile", action }: ProfileLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PageHeader title={title} backHref={backHref} action={action} />
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
