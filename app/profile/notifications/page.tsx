"use client"

import { useLanguage } from "@/context/LanguageContext"
import { useProfileSettings } from "@/context/ProfileSettingsContext"
import { ContentCardSwitchItem } from "@/components/ui/cards/content-card-switch-item"
import { ContentCard } from "@/components/ui/cards/content-card"
import { spacing } from "@/components/ui-config"
import { PageContainer } from "@/components/layouts/page-container"

export default function NotificationsPage() {
  const { t } = useLanguage()
  const { 
    notificationSettings,
    updateNotificationSetting,
  } = useProfileSettings()

  return (
    <PageContainer title={t("profilePages.notifications.title")} backHref="/profile">
      <div className="space-y-6">
        <ContentCard title={t("profilePages.notifications.push")}>
          <div className={spacing.stack}>
            <ContentCardSwitchItem
              id="push-notifications"
              label={t("profilePages.notifications.enable")}
              description={t("profilePages.notifications.enableDesc")}
              checked={notificationSettings.pushEnabled}
              onCheckedChange={(checked) => updateNotificationSetting("pushEnabled", checked)}
            />

            <ContentCardSwitchItem
              id="transaction-alerts"
              label={t("profilePages.notifications.transaction")}
              description={t("profilePages.notifications.transactionDesc")}
              checked={notificationSettings.transactionAlerts}
              onCheckedChange={(checked) => updateNotificationSetting("transactionAlerts", checked)}
              disabled={!notificationSettings.pushEnabled}
            />

            <ContentCardSwitchItem
              id="security-alerts"
              label={t("profilePages.notifications.security")}
              description={t("profilePages.notifications.securityDesc")}
              checked={notificationSettings.securityAlerts}
              onCheckedChange={(checked) => updateNotificationSetting("securityAlerts", checked)}
              disabled={!notificationSettings.pushEnabled}
            />

            <ContentCardSwitchItem
              id="promotions"
              label={t("profilePages.notifications.promotions")}
              description={t("profilePages.notifications.promotionsDesc")}
              checked={notificationSettings.promotions}
              onCheckedChange={(checked) => updateNotificationSetting("promotions", checked)}
              disabled={!notificationSettings.pushEnabled}
            />
          </div>
        </ContentCard>

        <ContentCard title={t("profilePages.notifications.other")}>
          <div className={spacing.stack}>
            <ContentCardSwitchItem
              id="email-notifications"
              label={t("profilePages.notifications.email")}
              description={t("profilePages.notifications.emailDesc")}
              checked={notificationSettings.emailNotifications}
              onCheckedChange={(checked) => updateNotificationSetting("emailNotifications", checked)}
            />

            <ContentCardSwitchItem
              id="sms-notifications"
              label={t("profilePages.notifications.sms")}
              description={t("profilePages.notifications.smsDesc")}
              checked={notificationSettings.smsNotifications}
              onCheckedChange={(checked) => updateNotificationSetting("smsNotifications", checked)}
            />
          </div>
        </ContentCard>
      </div>
    </PageContainer>
  )
}
