"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { WalletIcon, HistoryIcon, SettingsIcon } from "@/components/icons" // Placeholder icons

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: ({ isActive }: { isActive: boolean }) => (
      <Image
        src="/brand/7awel - lettermark.svg"
        alt="Home"
        width={24}
        height={24}
        className={cn("h-6 w-6 transition-opacity", isActive ? "opacity-100" : "opacity-75 group-hover:opacity-100")}
      />
    ),
  },
  {
    href: "/wallet", // Placeholder path
    label: "Wallet",
    icon: ({ isActive }: { isActive: boolean }) => (
      <WalletIcon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
    ),
  },
  {
    href: "/history", // Placeholder path
    label: "History",
    icon: ({ isActive }: { isActive: boolean }) => (
      <HistoryIcon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
    ),
  },
  {
    href: "/settings", // Placeholder path
    label: "Settings",
    icon: ({ isActive }: { isActive: boolean }) => (
      <SettingsIcon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
    ),
  },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-lg">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center justify-center text-center"
            >
              <item.icon isActive={isActive} />
              <span
                className={cn(
                  "mt-1 text-xs",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
