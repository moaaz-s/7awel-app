// hooks/use-deeplink.ts
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { loadPlatform } from "@/platform"

export function useDeepLinks() {
  const router = useRouter()

  useEffect(() => {
    let disposer: () => void = () => {}

    loadPlatform().then(async (p) => {
      disposer = await p.addDeepLinkListener((url: string) => {
        try {
          const parsed = new URL(url)
          // Example: myapp://pay/<id>
          if (parsed.pathname.startsWith("/pay/")) {
            const id = parsed.pathname.split("/pay/")[1]
            router.push(`/receive/${id}`)
          }
        } catch {
          /* ignore */
        }
      })
    })

    return () => disposer()
  }, [router])
}
