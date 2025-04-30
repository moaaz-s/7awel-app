import type { ReactNode } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { BottomNavigation } from "@/components/navigation/BottomNavigation"

interface MainLayoutProps {
  children: ReactNode
  backHref?: string
  action?: ReactNode
  showBottomNav?: boolean
}

export function MainLayout({ children, backHref, action, showBottomNav = true }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader backHref={backHref} action={action} />

      <main className="flex-1 p-4 pb-20">{children}</main>

      {showBottomNav && (
        <BottomNavigation />
      )}
    </div>
  )
}
