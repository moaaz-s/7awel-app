"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/context/LanguageContext"

interface PhoneInputProps {
  phoneNumber: string
  setPhoneNumber: (value: string) => void
  onContinue: () => void
}

export function PhoneInput({ phoneNumber, setPhoneNumber, onContinue }: PhoneInputProps) {
  const { t } = useLanguage()
  const [countryCode, setCountryCode] = useState("+1")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onContinue()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="phone">{t("auth.phoneNumber")}</Label>
        <div className="flex gap-2">
          <Select value={countryCode} onValueChange={setCountryCode}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+1">+1 (US)</SelectItem>
              <SelectItem value="+44">+44 (UK)</SelectItem>
              <SelectItem value="+91">+91 (IN)</SelectItem>
              <SelectItem value="+61">+61 (AU)</SelectItem>
              <SelectItem value="+966">+966 (SA)</SelectItem>
              <SelectItem value="+971">+971 (UAE)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="flex-1 ltr-phone-number"
            required
          />
        </div>
        <p className="text-sm text-muted-foreground">{t("auth.weWillSend")}</p>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-violet-600 to-blue-600 py-6"
        disabled={!phoneNumber}
      >
        {t("common.continue")}
      </Button>
    </form>
  )
}
