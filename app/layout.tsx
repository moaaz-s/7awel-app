"use client";

import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/context/LanguageContext"
import { Suspense, useEffect } from "react"
import InnerLayout from './InnerLayout';
import { AuthProvider } from "@/context/auth/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { SessionProvider } from "@/context/SessionContext";
import AppInitializer from "@/components/auth/AppInitializer";
import { ProfileSettingsProvider } from "@/context/ProfileSettingsContext"; 
import { HapticProvider } from "@/context/HapticContext";
import { Poppins } from 'next/font/google'
import { colors } from "@/components/ui-config"
import { httpClient, httpClientUnauthenticated } from "@/services/http-client"

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
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  
  useEffect(() => {    
    httpClient.init()
    httpClientUnauthenticated.init()
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
                <SessionProvider>
                  <DataProvider>
                    <ProfileSettingsProvider>
                      <AppInitializer>
                        <Suspense fallback={<LoadingFallback />}>
                          <InnerLayout>{children}</InnerLayout>
                        </Suspense>
                      </AppInitializer>
                    </ProfileSettingsProvider>
                  </DataProvider>
                </SessionProvider>
              </AuthProvider>
            </HapticProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
