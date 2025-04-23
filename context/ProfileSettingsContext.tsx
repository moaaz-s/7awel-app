"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { useApp } from "@/context/AppContext"
import { toast } from "sonner"
import { useLanguage } from "@/context/LanguageContext"

interface NotificationSettings {
  pushEnabled: boolean
  transactionAlerts: boolean
  securityAlerts: boolean
  promotions: boolean
  emailNotifications: boolean
  smsNotifications: boolean
}

interface SecuritySettings {
  biometricEnabled: boolean
  twoFactorEnabled: boolean
  transactionPin: boolean
}

interface ProfileSettingsContextType {
  notificationSettings: NotificationSettings
  updateNotificationSetting: (key: keyof NotificationSettings, value: boolean) => Promise<void>
  securitySettings: SecuritySettings
  updateSecuritySetting: (key: keyof SecuritySettings, value: boolean) => Promise<void>
}

const ProfileSettingsContext = createContext<ProfileSettingsContextType | undefined>(undefined)

export function ProfileSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useApp()
  const { t } = useLanguage()

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    transactionAlerts: true,
    securityAlerts: true,
    promotions: false,
    emailNotifications: true,
    smsNotifications: true
  })

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    biometricEnabled: true,
    twoFactorEnabled: false,
    transactionPin: true
  })

  const updateNotificationSetting = useCallback(async (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    const originalSettings = { ...notificationSettings };
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }))

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`API: Updated notification setting ${key} to ${value}`);
      toast.success(t("profilePages.settings.saveSuccess"));
    } catch (error) {
      console.error(`Failed to update notification setting ${key}:`, error);
      setNotificationSettings(originalSettings);
      toast.error(t("profilePages.settings.saveError"));
      throw error;
    }
  }, [notificationSettings, t])

  const updateSecuritySetting = useCallback(async (
    key: keyof SecuritySettings,
    value: boolean
  ) => {
    const originalSettings = { ...securitySettings };
    setSecuritySettings(prev => ({
      ...prev,
      [key]: value
    }))

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`API: Updated security setting ${key} to ${value}`);
      toast.success(t("profilePages.settings.saveSuccess"));
    } catch (error) {
      console.error(`Failed to update security setting ${key}:`, error);
      setSecuritySettings(originalSettings);
      toast.error(t("profilePages.settings.saveError"));
      throw error;
    }
  }, [securitySettings, t])

  const value = {
    notificationSettings,
    updateNotificationSetting,
    securitySettings,
    updateSecuritySetting,
  }

  return (
    <ProfileSettingsContext.Provider value={value}>
      {children}
    </ProfileSettingsContext.Provider>
  )
}

export const useProfileSettings = () => {
  const context = useContext(ProfileSettingsContext)
  if (context === undefined) {
    throw new Error("useProfileSettings must be used within a ProfileSettingsProvider")
  }
  return context
}
