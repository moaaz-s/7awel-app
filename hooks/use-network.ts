// hooks/use-network.ts
"use client"

import { useEffect, useState } from "react"
import { loadPlatform } from "@/platform/index"

export function useNetwork() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let disposer: () => void = () => {}
    loadPlatform().then(async (p) => {
      setOnline(await p.isOnline())
      disposer = await p.addNetworkListener(setOnline)
    })
    return () => disposer()
  }, [])

  return online
}
