"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import {
  BellIcon,
  ShieldIcon,
  GlobeIcon,
  QuestionIcon,
  SignOutIcon,
  UserIcon,
} from "@/components/icons"
import { useData } from "@/context/DataContext";
import { spacing } from "@/components/ui-config"
import { PageContainer } from "@/components/layouts/page-container"
import { Avatar } from "@/components/ui/avatar"
import { ContentCard } from "@/components/ui/cards/content-card";
import { ContentCardItem } from "@/components/ui/cards/content-card-item";
import { useAuth } from "@/context/auth/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { ToastAction } from "@/components/ui/toast";

export default function ProfilePage() {
  const { t } = useLanguage()
  const { user } = useData()
  const { hardLogout } = useAuth()
  const { toast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    // Show confirmation toast with action
    toast({
      title: t("logout.confirmTitle"),
      description: t("logout.confirmDescription"),
      action: (
        <ToastAction asChild altText={t("logout.confirm")}>
          <Button 
            size="default" 
            variant="destructive-gradient" 
            destructive={true} 
            fullWidth 
            onClick={async () => {
              setIsLoggingOut(true)
              try {
                await hardLogout()
                toast({
                  title: t("logout.successTitle"),
                  description: t("logout.successDescription"),
                })
              } catch (error) {
                toast({
                  title: t("errors.UNKNOWN_ERROR"),
                  description: t("logout.errorDescription"),
                  variant: "destructive",
                })
              }
              setIsLoggingOut(false)
            }}
          >
            {t("logout.confirm")}
          </Button>
        </ToastAction>
      )
    })
  }

  const menuItems = [
    {
      id: "account",
      // title: t("profile.personalInfo"),
      items: [
        { icon: <UserIcon className="h-5 w-5" />, label: t("profile.personalInfo"), link: "/profile/personal", description: t("profilePages.personalInfo.description") },
        { icon: <BellIcon className="h-5 w-5" />, label: t("profile.notifications"), link: "/profile/notifications", description: t("profilePages.notifications.description") },
        { icon: <ShieldIcon className="h-5 w-5" />, label: t("profile.security"), link: "/profile/security", description: t("profilePages.security.description") },
        { icon: <GlobeIcon className="h-5 w-5" />, label: t("profile.language"), link: "/profile/language", description: t("profilePages.language.description") },
        { icon: <QuestionIcon className="h-5 w-5" />, label: t("profile.helpCenter"), link: "/profile/help", description: t("profilePages.help.description") }
      ],
    },
    // {
    //   id: "security",
    //   // title: t("auth.security"),
    //   items: [{ icon: <ShieldIcon className="h-5 w-5" />, label: t("profile.security"), link: "/profile/security", description: t("profilePages.security.description") }],
    // },
    // {
    //   id: "preferences",
    //   // title: t("profile.preferences"),
    //   items: [{ icon: <GlobeIcon className="h-5 w-5" />, label: t("profile.language"), link: "/profile/language", description: t("profilePages.language.description") }],
    // },
    // {
    //   id: "support",
    //   // title: t("profile.support"),
    //   items: [{ icon: <QuestionIcon className="h-5 w-5" />, label: t("profile.helpCenter"), link: "/profile/help", description: t("profilePages.help.description") }],
    // },
  ]

  return (
    <PageContainer title={""} backHref="/home">
      <div className="flex-1 flex flex-col justify-between lpb-16">
        <div className="p-4 -mx-4 flex flex-col items-center text-center">
          {user && (
            <div className="flex flex-col items-center space-y-4">
              <Avatar 
                size="xl" 
                border 
                initials={`${user.firstName?.charAt(0).toUpperCase() || ''}${user.lastName?.charAt(0).toUpperCase() || ''}`}
              />
              <div className="space-y-1.5">
                <h1 className="text-4xl font-bold tracking-tight">
                  {`${user.firstName} ${user.lastName}`.trim().toUpperCase()}
                </h1>
                <p className="text-gray-400 text-sm" dir="ltr">@dragonizer</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {menuItems.map((section) => (
            <ContentCard key={section.id} elevated={true} padding="sm">
              {section.items.map((item, index) => (
                <ContentCardItem
                  key={index}
                  href={item.link}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </ContentCard>
          ))}
        </div>

        <div className={`${spacing.stack_sm} flex flex-col justify-center`}>
          <Button 
            variant="destructive" 
            destructive
            fullWidth
            icon={<SignOutIcon className="h-5 w-5" />}
            iconPosition="left"
            onClick={handleLogout}
            isLoading={isLoggingOut}
          >
            {t("auth.signOut")}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("version", { version: "1.0.0" })}</p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
