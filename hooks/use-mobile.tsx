"use client"

import { useState, useEffect } from "react"

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isCapacitor, setIsCapacitor] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    // Check if running in a mobile browser
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

      // Check if mobile browser
      const isMobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      setIsMobile(isMobileCheck)

      // Check platform
      const isIOSCheck = /iPhone|iPad|iPod/i.test(userAgent)
      const isAndroidCheck = /Android/i.test(userAgent)

      setIsIOS(isIOSCheck)
      setIsAndroid(isAndroidCheck)
    }

    // Check if running in Capacitor
    const checkCapacitor = () => {
      const isCapacitorCheck =
        typeof window !== "undefined" &&
        window.hasOwnProperty("Capacitor") &&
        (window as any).Capacitor?.isNative === true

      setIsCapacitor(isCapacitorCheck)
    }

    checkMobile()
    checkCapacitor()

    // Add resize listener to update on orientation change
    const handleResize = () => {
      checkMobile()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return {
    isMobile,
    isCapacitor,
    isIOS,
    isAndroid,
    isNative: isCapacitor,
  }
}
