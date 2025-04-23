"use client"

import { useCallback } from "react"
import { useData } from "@/context/DataContext"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout, verifyOtp } = useData()
  const router = useRouter()

  const handleLogin = useCallback(
    async (phone: string, pin: string) => {
      const result = await login(phone, pin)

      if (result.success) {
        router.push("/home")
      }

      return result
    },
    [login, router],
  )

  const handleLogout = useCallback(() => {
    logout()
    router.push("/")
  }, [logout, router])

  const handleVerifyOtp = useCallback(
    async (phone: string, otp: string) => {
      return await verifyOtp(phone, otp)
    },
    [verifyOtp],
  )

  return {
    user,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    verifyOtp: handleVerifyOtp,
  }
}
