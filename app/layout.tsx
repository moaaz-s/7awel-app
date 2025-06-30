"use client";

import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/context/LanguageContext"
import { Suspense, useEffect } from "react"
import InnerLayout from './InnerLayout';
import { AuthProvider } from "@/context/auth/AuthContext";
import { DataProvider } from "@/context/DataContext-v2";
import AppInitializer from "@/components/auth/AppInitializer";
import { ProfileSettingsProvider } from "@/context/ProfileSettingsContext"; 
import { HapticProvider } from "@/context/HapticContext";
import { Poppins } from 'next/font/google'
import { colors } from "@/components/ui-config"

import { Loader2 } from "lucide-react";
import { publicHttpClient } from "@/services/httpClients/public";
import { privateHttpClient } from "@/services/httpClients/private";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-poppins',
})

// export const metadata: Metadata = {
//   title: "7awel",
//   description: "Send, receive, and manage money instantly",
//   generator: 'v0.dev'
// }

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  
  useEffect(() => {    
    publicHttpClient.init();
    privateHttpClient.init()
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/brand/7awel - lettermark.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>{`
          html {
            touch-action: manipulation;
          }
        `}</style>
      </head>
      <body className={`${poppins.variable} font-sans ${colors.neutral.background}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LanguageProvider>
            <HapticProvider>
              <AuthProvider>
                <DataProvider>
                  <ProfileSettingsProvider>
                    <AppInitializer>
                      <Suspense fallback={<LoadingFallback />}>
                        <InnerLayout>{children}</InnerLayout>
                      </Suspense>
                    </AppInitializer>
                  </ProfileSettingsProvider>
                </DataProvider>
              </AuthProvider>
            </HapticProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
