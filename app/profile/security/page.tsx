"use client"

import { Button } from "@/components/ui/button"
import { ProfileLayout } from "@/components/layouts/ProfileLayout"
import { useLanguage } from "@/context/LanguageContext"
import { useProfileSettings } from "@/context/ProfileSettingsContext"
import { ProfileSection } from "@/components/profile/profile-section"
import { ProfileSwitchItem } from "@/components/profile/profile-switch-item"
import { ProfileLinkItem } from "@/components/profile/profile-link-item"

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
    <ProfileLayout title={t("profilePages.security.title")} backHref="/profile">
      <div className="space-y-6">
        <ProfileSection title={t("profilePages.security.authentication")}>
          {/* Added Change PIN Link Item */}
          <ProfileLinkItem
            href="/profile/security/change-pin"
            label={t("profilePages.security.changePin")}
            description={t("profilePages.security.changePinDesc")}
          />

          <ProfileSwitchItem
            id="biometric-auth"
            label={t("profilePages.security.biometric")}
            description={t("profilePages.security.biometricDesc")}
            checked={securitySettings.biometricEnabled}
            onCheckedChange={(checked) => updateSecuritySetting("biometricEnabled", checked)}
          />

          <ProfileSwitchItem
            id="two-factor"
            label={t("profilePages.security.twoFactor")}
            description={t("profilePages.security.twoFactorDesc")}
            checked={securitySettings.twoFactorEnabled}
            onCheckedChange={(checked) => updateSecuritySetting("twoFactorEnabled", checked)}
          />
        </ProfileSection>

        <ProfileSection title={t("profilePages.security.transaction")}>
          <ProfileSwitchItem
            id="transaction-pin"
            label={t("profilePages.security.requirePin")}
            description={t("profilePages.security.requirePinDesc")}
            checked={securitySettings.transactionPin}
            onCheckedChange={(checked) => updateSecuritySetting("transactionPin", checked)}
          />

          <ProfileLinkItem
            href="/profile/security/devices"
            label={t("profilePages.security.manageDevices")}
            description={t("profilePages.security.manageDevicesDesc")}
          />
        </ProfileSection>

        <Button 
          variant="destructive" 
          className="w-full"
          onClick={handleLockAccount}
        >
          {t("profilePages.security.lockAccount")}
        </Button>
      </div>
    </ProfileLayout>
  )
}
