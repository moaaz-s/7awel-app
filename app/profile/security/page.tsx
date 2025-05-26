"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { useProfileSettings } from "@/context/ProfileSettingsContext"
import { ContentCardSwitchItem } from "@/components/ui/cards/content-card-switch-item"
import { ContentCard } from "@/components/ui/cards/content-card"
import { ContentCardItem } from "@/components/ui/cards/content-card-item"
import { PageContainer } from "@/components/layouts/page-container"

export default function SecurityPage() {
  const { t } = useLanguage()
  const { 
    securitySettings,
    updateSecuritySetting
  } = useProfileSettings()

  const handleLockAccount = async () => {
    // This would typically call an API to lock the account
    if (confirm(t("profilePages.security.confirmLock"))) {
      console.log("Locking account...")
      // Call API to lock account
    }
  }

  return (
    <PageContainer title={t("profilePages.security.title")} backHref="/profile">
      <div className="space-y-6">
        <ContentCard title={t("profilePages.security.authentication")}>
          {/* Added Change PIN Link Item */}
          <ContentCardItem
            href="/profile/security/change-pin"
            label={t("profilePages.security.changePin")}
            description={t("profilePages.security.changePinDesc")}
          />

          <ContentCardSwitchItem
            id="biometric-auth"
            label={t("profilePages.security.biometric")}
            description={t("profilePages.security.biometricDesc")}
            checked={securitySettings.biometricEnabled}
            onCheckedChange={(checked) => updateSecuritySetting("biometricEnabled", checked)}
          />

          <ContentCardSwitchItem
            id="two-factor"
            label={t("profilePages.security.twoFactor")}
            description={t("profilePages.security.twoFactorDesc")}
            checked={securitySettings.twoFactorEnabled}
            onCheckedChange={(checked) => updateSecuritySetting("twoFactorEnabled", checked)}
          />
        </ContentCard>

        <ContentCard title={t("profilePages.security.transaction")}>
          <ContentCardSwitchItem
            id="transaction-pin"
            label={t("profilePages.security.requirePin")}
            description={t("profilePages.security.requirePinDesc")}
            checked={securitySettings.transactionPin}
            onCheckedChange={(checked) => updateSecuritySetting("transactionPin", checked)}
          />

          <ContentCardItem
            href="/profile/security/devices"
            label={t("profilePages.security.manageDevices")}
            description={t("profilePages.security.manageDevicesDesc")}
          />
        </ContentCard>

        <Button 
          variant="destructive" 
          className="w-full"
          onClick={handleLockAccount}
        >
          {t("profilePages.security.lockAccount")}
        </Button>
      </div>
    </PageContainer>
  )
}
