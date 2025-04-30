import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/context/LanguageContext"
import { Suspense } from "react"
import InnerLayout from './InnerLayout';
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import AppInitializer from "@/components/auth/AppInitializer";
import { ProfileSettingsProvider } from "@/context/ProfileSettingsContext"; 
import { HapticProvider } from "@/context/HapticContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: "7awel",
  description: "Send, receive, and manage money instantly",
  generator: 'v0.dev'
}

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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/brand/7awel - lettermark.svg" type="image/svg+xml" />
      </head>
      <body className={`${poppins.variable} font-sans`}>
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
