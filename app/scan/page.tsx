"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"
import { ChevronLeftIcon, ScanLineIcon, ImageIcon } from "@/components/icons"

export default function ScanPage() {
  const [flashlight, setFlashlight] = useState(false)
  const { t, isRTL } = useLanguage()

  // Use the appropriate direction icon based on RTL
  const BackIcon = isRTL ? <ChevronLeftIcon className="h-5 w-5 rotate-180" /> : <ChevronLeftIcon className="h-5 w-5" />

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <header className="flex items-center p-4">
        <Button variant="ghost" size="icon" asChild className="mr-2 text-white">
          <Link href="/home">{BackIcon}</Link>
        </Button>
        <h1 className="text-lg font-medium text-white">{t("qr.scanToPay")}</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative">
        {/* Camera viewfinder */}
        <div className="w-full h-full absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-sm aspect-square">
            {/* Corners for QR code scanning area */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-white"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-white"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-white"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-white"></div>

            {/* Scan line animation */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-500 animate-scan"></div>
          </div>
        </div>

        {/* Instruction text */}
        <div className="absolute top-1/4 left-0 right-0 text-center">
          <p className="text-white text-sm">{t("qr.positionQr")}</p>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8">
          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full ${
              flashlight ? "bg-white text-black" : "bg-black/50 text-white border-white/30"
            }`}
            onClick={() => setFlashlight(!flashlight)}
          >
            <ScanLineIcon className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/50 text-white border-white/30"
          >
            <ImageIcon className="h-6 w-6" />
          </Button>
        </div>
      </main>

      <style jsx global>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0;
          }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
