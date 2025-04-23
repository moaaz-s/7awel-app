"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/context/LanguageContext"

interface UserProfileFormProps {
  onSubmit: () => void
}

export function UserProfileForm({ onSubmit }: UserProfileFormProps) {
  const { t } = useLanguage()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t("profile.firstName")}</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">{t("profile.lastName")}</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            {t("profile.email")} ({t("common.optional")})
          </Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-violet-600 to-blue-600 py-6"
        disabled={!firstName || !lastName}
      >
        {t("common.continue")}
      </Button>
    </form>
  )
}
