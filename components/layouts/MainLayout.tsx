import type { ReactNode } from "react"
import { PageHeader } from "@/components/ui/page-header"

interface MainLayoutProps {
  children: ReactNode
  title: string
  backHref?: string
  action?: ReactNode
  showBottomNav?: boolean
}

export function MainLayout({ children, title, backHref, action, showBottomNav = true }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PageHeader title={title} backHref={backHref} action={action} />

      <main className="flex-1 p-4 pb-16">{children}</main>

      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg">
          {/* Bottom navigation will be added later */}
        </div>
      )}
    </div>
  )
}
