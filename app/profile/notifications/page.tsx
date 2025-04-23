"use client"

import { ProfileLayout } from "@/components/layouts/ProfileLayout"
import { useLanguage } from "@/context/LanguageContext"
import { useProfileSettings } from "@/context/ProfileSettingsContext"
import { ProfileSection } from "@/components/profile/profile-section"
import { ProfileSwitchItem } from "@/components/profile/profile-switch-item"

export default function NotificationsPage() {
  const { t } = useLanguage()
  const { 
    notificationSettings,
    updateNotificationSetting,
  } = useProfileSettings()

  return (
    <ProfileLayout title={t("profilePages.notifications.title")} backHref="/profile">
      <div className="space-y-6">
        <ProfileSection title={t("profilePages.notifications.push")}>
          <ProfileSwitchItem
            id="push-notifications"
            label={t("profilePages.notifications.enable")}
            description={t("profilePages.notifications.enableDesc")}
            checked={notificationSettings.pushEnabled}
            onCheckedChange={(checked) => updateNotificationSetting("pushEnabled", checked)}
          />

          <ProfileSwitchItem
            id="transaction-alerts"
            label={t("profilePages.notifications.transaction")}
            description={t("profilePages.notifications.transactionDesc")}
            checked={notificationSettings.transactionAlerts}
            onCheckedChange={(checked) => updateNotificationSetting("transactionAlerts", checked)}
            disabled={!notificationSettings.pushEnabled}
          />

          <ProfileSwitchItem
            id="security-alerts"
            label={t("profilePages.notifications.security")}
            description={t("profilePages.notifications.securityDesc")}
            checked={notificationSettings.securityAlerts}
            onCheckedChange={(checked) => updateNotificationSetting("securityAlerts", checked)}
            disabled={!notificationSettings.pushEnabled}
          />

          <ProfileSwitchItem
            id="promotions"
            label={t("profilePages.notifications.promotions")}
            description={t("profilePages.notifications.promotionsDesc")}
            checked={notificationSettings.promotions}
            onCheckedChange={(checked) => updateNotificationSetting("promotions", checked)}
            disabled={!notificationSettings.pushEnabled}
          />
        </ProfileSection>

        <ProfileSection title={t("profilePages.notifications.other")}>
          <ProfileSwitchItem
            id="email-notifications"
            label={t("profilePages.notifications.email")}
            description={t("profilePages.notifications.emailDesc")}
            checked={notificationSettings.emailNotifications}
            onCheckedChange={(checked) => updateNotificationSetting("emailNotifications", checked)}
          />

          <ProfileSwitchItem
            id="sms-notifications"
            label={t("profilePages.notifications.sms")}
            description={t("profilePages.notifications.smsDesc")}
            checked={notificationSettings.smsNotifications}
            onCheckedChange={(checked) => updateNotificationSetting("smsNotifications", checked)}
          />
        </ProfileSection>
      </div>
    </ProfileLayout>
  )
}
