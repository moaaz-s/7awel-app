"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useLanguage } from "@/context/LanguageContext"
import { MainLayout } from "@/components/layouts/MainLayout"
import {
  BellIcon,
  ShieldIcon,
  GlobeIcon,
  QuestionIcon,
  SignOutIcon,
  UserIcon,
} from "@/components/icons"
import { useApp } from "@/context/AppContext"
import { ContactCard } from "@/components/contact-card"
import { PhoneNumber } from "@/components/ui/phone-number"
import { ProfileSection } from "@/components/profile/profile-section"
import { ProfileLinkItem } from "@/components/profile/profile-link-item"

export default function ProfilePage() {
  const { t, isRTL } = useLanguage()
  const { user } = useApp()

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
    <MainLayout title={t("profile.title")} backHref="/home" showBottomNav={true}>
      <div className="pb-16">
        <div className="bg-white p-6 border-b mb-4 -mx-4">
          {user && (
            <ContactCard
              contact={{
                id: user.id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                phone: user.phone,
                email: user.email,
                initial: user.firstName?.charAt(0).toUpperCase() || ''
              }}
              showEmail={true}
              className="p-0"
            />
          )}
        </div>

        <div className="space-y-6">
          {menuItems.map((section) => (
            <ProfileSection key={section.id} title="">
              {section.items.map((item, index) => (
                <ProfileLinkItem
                  key={index}
                  href={item.link}
                  label={item.label}
                  description=""
                  icon={item.icon}
                />
              ))}
            </ProfileSection>
          ))}

          <Button variant="outline" className="w-full gap-2 text-red-500 border-red-200">
            <SignOutIcon className="h-5 w-5" />
            {t("auth.signOut")}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("version", { version: "1.0.0" })}</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
