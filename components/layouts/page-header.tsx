"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { BackIcon } from "@/components/icons"
import { CloseIcon } from "@/components/icons/ui-icons"
import { motion, useScroll, useTransform } from "framer-motion"
import { colors, spacing } from "@/components/ui-config"

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backAction?: () => void
  backIconStyle?: 'arrow' | 'cross'
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, backHref, backAction, backIconStyle = 'arrow', action, className = "" }: PageHeaderProps) {
  const { scrollY } = useScroll()
  const bigOpacity = useTransform(scrollY, [0, 40], [1, 0], { clamp: true })
  const smallOpacity = useTransform(scrollY, [40, 60], [0, 1], { clamp: true })
  
  // Get the CSS variable name for the muted background color
  // For bg-muted, we need to use var(--muted)
  const bgClass = colors.neutral.background.replace('bg-', '')
  
  // Use the theme background color with opacity when scrolled
  const bgColor = useTransform(
    scrollY, 
    [40, 60], 
    ["transparent", `hsl(var(--${bgClass}) / 0.8)`], 
    { clamp: true }
  )
  
  const backdropBlur = useTransform(
    scrollY,
    [40, 60],
    ["blur(0px)", "blur(8px)"],
    { clamp: true }
  )

  // Dynamic bottom spacing that completely disappears at 0 opacity
  const pbRem = useTransform(bigOpacity, [0, 0.01, 1], [0, 0, 0.5])
  const mbRem = useTransform(bigOpacity, [0, 0.01, 1], [0, 0, 1])
  
  // Height animation to properly collapse the space
  const height = useTransform(bigOpacity, [0, 0.01, 1], ['0px', '0px', 'auto'])
  const opacity = bigOpacity

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-10 mb-4 transition-colors", 
        spacing.stack_sm,
        className
      )}
      style={{ 
        backgroundColor: bgColor,
        backdropFilter: backdropBlur 
      }}
    >
      <div className="flex items-center">
        <div className="flex items-center gap-2 flex-1">
          {(backHref || backAction) && (
            <div>
              {backHref ? (
                <Link href={backHref}>
                  {backIconStyle === 'arrow' ? (
                    <BackIcon className="h-5 w-5" />
                  ) : (
                    <CloseIcon className="h-5 w-5" />
                  )}
                </Link>
              ) : backAction && (
                backIconStyle === 'arrow' ? (
                  <BackIcon className="h-5 w-5 cursor-pointer" onClick={backAction} />
                ) : (
                  <CloseIcon className="h-5 w-5 cursor-pointer" onClick={backAction} />
                )
              )}
            </div>
          )}
          <motion.div
            style={{ opacity: smallOpacity }}
            className="text-lg font-semibold truncate max-w-[200px]"
          >
            {title}
          </motion.div>
        </div>
        {action && <div className="flex items-center">{action}</div>}
      </div>
      {(title || subtitle) && (
        <motion.div
          style={{ 
            opacity, 
            height,
            marginBottom: mbRem,
            paddingBottom: pbRem, 
            transformOrigin: 'top',
          }}
          className="flex flex-col origin-top overflow-hidden"
        >
          {title && <h1 className={cn("text-2xl font-bold")}>{title}</h1>}
          {subtitle && <p className={cn("text-muted-foreground")}>{subtitle}</p>}
        </motion.div>
      )}
    </motion.header>
  )
}
