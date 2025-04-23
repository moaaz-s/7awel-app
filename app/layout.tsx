import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/context/LanguageContext"
import { Suspense } from "react"
import InnerLayout from './InnerLayout';
import { AuthProvider } from "@/context/AuthContext";
import AppInitializer from "@/components/auth/AppInitializer";
import { AppProvider } from "@/context/AppContext"; // Assuming this is where AppProvider is imported from
import { ProfileSettingsProvider } from "@/context/ProfileSettingsContext"; // Assuming this is where ProfileSettingsProvider is imported from

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PayFlow",
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
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <LanguageProvider>
            <AuthProvider>
              {/* Providers now wrap AppInitializer */}
              <AppProvider>
                <ProfileSettingsProvider>
                  <AppInitializer>
                    <Suspense fallback={<LoadingFallback />}>
                      <InnerLayout>{children}</InnerLayout>
                    </Suspense>
                  </AppInitializer>
                </ProfileSettingsProvider>
              </AppProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
