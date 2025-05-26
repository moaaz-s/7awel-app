"use client"

import { SearchIcon, MessageCircleIcon, FileTextIcon, HelpCircleIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/context/LanguageContext"
import { ContentCard } from "@/components/ui/cards/content-card"
import { ContentCardItem } from "@/components/ui/cards/content-card-item"
import { spacing } from "@/components/ui-config"
import { PageContainer } from "@/components/layouts/page-container"

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
    <PageContainer title={t("profilePages.help.title")} backHref="/profile">
      <div className="space-y-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("profilePages.help.search")} className="pl-9" />
        </div>

        <ContentCard title={t("profilePages.help.popular")} elevated={true} padding="sm">
          {popularQuestions.map((item, index) => (
            <ContentCardItem
              key={index}
              href={item.link}
              label={item.question}
            />
          ))}
        </ContentCard>

        <ContentCard title={t("profilePages.help.browse")} elevated={true} padding="sm">
          {faqCategories.map((category, index) => (
            <ContentCardItem
              key={index}
              href={category.link}
              label={category.label}
              description={category.description}
            />
          ))}
        </ContentCard>

        <ContentCard elevated={true} padding="md">
          <div className={`flex flex-col items-center text-center ${spacing.stack}`}>
            <div>
              <h3 className="font-medium">{t("profilePages.help.needMore")}</h3>
              <p className="text-sm text-muted-foreground">{t("profilePages.help.supportReady")}</p>
            </div>
            <Button 
              variant="gradient" 
              className="mt-2 gap-2"
              fullWidth
              icon={<MessageCircleIcon className="h-4 w-4" />}
            >
              {t("profilePages.help.contact")}
            </Button>
          </div>
        </ContentCard>
      </div>
    </PageContainer>
  )
}
