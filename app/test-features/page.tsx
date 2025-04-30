"use client"

import { useState } from "react"
import { PhoneInput } from "@/components/phone-input"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { ErrorCircleIcon } from "@/components/icons"

export default function TestFeaturesPage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [phoneError, setPhoneError] = useState<string | null>(null)
  
  const handlePhoneSubmit = (phone: string) => {
    setPhoneNumber(phone)
    // Simulate error for testing
    if (phone.includes("123")) {
      setPhoneError("This phone number is invalid.")
      return
    }
    toast({
      title: "Phone Number",
      description: `Successfully validated: ${phone}`,
    })
  }
  
  const showSuccessToast = () => {
    toast({
      title: "Success",
      description: "Everything is working as expected!",
    })
  }
  
  const showErrorToast = () => {
    toast({
      variant: "destructive",
      title: "Verification Failed",
      description: "The verification code, email or phone number is incorrect",
    })
  }

  return (
    <div className="container max-w-md mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Test Features</h1>
      
      {/* Phone Input Test */}
      <div className="space-y-4 border p-4 rounded-lg">
        <h2 className="text-xl font-semibold">Phone Input</h2>
        <PhoneInput
          onSubmit={handlePhoneSubmit}
          error={phoneError}
        />
        {phoneNumber && (
          <p className="text-sm mt-2">
            Phone Number: <strong>{phoneNumber}</strong>
          </p>
        )}
      </div>
      
      {/* Toast Test */}
      <div className="space-y-4 border p-4 rounded-lg">
        <h2 className="text-xl font-semibold">Toast Notifications</h2>
        <div className="flex gap-4">
          <Button onClick={showSuccessToast}>Show Success</Button>
          <Button variant="destructive" onClick={showErrorToast}>Show Error</Button>
        </div>
      </div>
    </div>
  )
}
