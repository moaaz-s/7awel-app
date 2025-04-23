"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { PageContainer } from "@/components/ui/page-container"

export default function RTLTestPage() {
  const { language, setLanguage, t, isRTL } = useLanguage()
  const [switchValue, setSwitchValue] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [phoneValue, setPhoneValue] = useState("+1 (555) 123-4567")

  return (
    <PageContainer title="RTL Test Page" backHref="/home">
      <div className="space-y-8 p-4">
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <h2 className="text-lg font-medium">Language Controls</h2>
          <div className="flex gap-4">
            <Button onClick={() => setLanguage("en")} variant={language === "en" ? "default" : "outline"}>
              English
            </Button>
            <Button onClick={() => setLanguage("ar")} variant={language === "ar" ? "default" : "outline"}>
              العربية
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">Current direction: {isRTL ? "RTL" : "LTR"}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border space-y-4">
          <h2 className="text-lg font-medium">UI Components Test</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">Switch Component</label>
            <div className="flex items-center justify-between">
              <span>Toggle me</span>
              <Switch checked={switchValue} onCheckedChange={setSwitchValue} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Regular Input</label>
            <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type something..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Input</label>
            <Input
              value={phoneValue}
              onChange={(e) => setPhoneValue(e.target.value)}
              placeholder="Phone number"
              className="ltr-phone-number"
            />
          </div>

          <div className="flex justify-between items-center border-t pt-4">
            <span>Left/Start aligned text</span>
            <span>Right/End aligned text</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm">
              Back
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
