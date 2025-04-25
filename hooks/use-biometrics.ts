// hooks/use-biometrics.ts
"use client"

import { useEffect, useState, useCallback } from "react"
import { loadPlatform } from "@/platform"

export function useBiometrics() {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let mounted = true
    loadPlatform().then(async (p) => {
      if (!mounted) return
      setAvailable(await p.isBiometricAvailable())
    })
    return () => {
      mounted = false
    }
  }, [])

  const authenticate = useCallback(async (reason?: string) => {
    const p = await loadPlatform()
    return await p.authenticateBiometric(reason)
  }, [])

  return { available, authenticate }
}
