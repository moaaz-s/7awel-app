"use client"

import Link from "next/link"
import { ChevronRightIcon, SearchIcon, MessageCircleIcon, FileTextIcon, HelpCircleIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProfileLayout } from "@/components/layouts/ProfileLayout"
import { useLanguage } from "@/context/LanguageContext"
import { ProfileSection } from "@/components/profile/profile-section"
import { ProfileLinkItem } from "@/components/profile/profile-link-item"

export default function HelpCenterPage() {
  const { t } = useLanguage()

  const faqCategories = [
    {
      label: t("profilePages.help.categoryAccount"),
      link: "/profile/help/account",
      description: t("profilePages.help.categoryAccountDesc")
    },
    {
      label: t("profilePages.help.categoryPayments"),
      link: "/profile/help/payments",
      description: t("profilePages.help.categoryPaymentsDesc")
    },
    {
      label: t("profilePages.help.categorySecurity"),
      link: "/profile/help/security",
      description: t("profilePages.help.categorySecurityDesc")
    },
  ]

  const popularQuestions = [
    {
      question: t("profilePages.help.questionResetPin"),
      link: "/profile/help/reset-pin",
    },
    {
      question: t("profilePages.help.questionDeclined"),
      link: "/profile/help/declined-transactions",
    },
    {
      question: t("profilePages.help.questionTransferTime"),
      link: "/profile/help/transfer-times",
    },
    {
      question: t("profilePages.help.questionCashOut"),
      link: "/profile/help/cash-out",
    },
  ]

  return (
    <ProfileLayout title={t("profilePages.help.title")} backHref="/profile">
      <div className="space-y-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("profilePages.help.search")} className="pl-9" />
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-medium">{t("profilePages.help.popular")}</h2>
          </div>

          <div className="divide-y">
            {popularQuestions.map((item, index) => (
              <Link key={index} href={item.link} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <span>{item.question}</span>
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        <ProfileSection title={t("profilePages.help.browse")}>
          {faqCategories.map((category, index) => (
            <ProfileLinkItem
              key={index}
              href={category.link}
              label={category.label}
              description={category.description}
            />
          ))}
        </ProfileSection>

        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="flex flex-col items-center space-y-2">
            <HelpCircleIcon className="h-8 w-8 text-violet-600" />
            <h3 className="font-medium">{t("profilePages.help.needMore")}</h3>
            <p className="text-sm text-muted-foreground">{t("profilePages.help.supportReady")}</p>
            <Button variant="gradient" className="mt-2 gap-2">
              <MessageCircleIcon className="h-4 w-4" />
              {t("profilePages.help.contact")}
            </Button>
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}
