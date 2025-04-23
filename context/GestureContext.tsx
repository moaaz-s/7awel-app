"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

interface GestureState {
  isSwipeEnabled: boolean
  swipeThreshold: number
  longPressThreshold: number
  doubleTapThreshold: number
  isCapacitor: boolean
}

interface GestureContextType extends GestureState {
  enableSwipe: () => void
  disableSwipe: () => void
  setSwipeThreshold: (threshold: number) => void
  setLongPressThreshold: (threshold: number) => void
  setDoubleTapThreshold: (threshold: number) => void
}

const GestureContext = createContext<GestureContextType | undefined>(undefined)

export function GestureProvider({ children }: { children: ReactNode }) {
  // State
  const [state, setState] = useState<GestureState>({
    isSwipeEnabled: true,
    swipeThreshold: 50,
    longPressThreshold: 500,
    doubleTapThreshold: 300,
    isCapacitor: false,
  })

  // Check if running in Capacitor
  useEffect(() => {
    const checkCapacitor = () => {
      // Check if window.Capacitor exists
      const isCapacitor =
        typeof window !== "undefined" &&
        window.hasOwnProperty("Capacitor") &&
        (window as any).Capacitor?.isNative === true

      setState((prev) => ({ ...prev, isCapacitor }))
    }

    checkCapacitor()
  }, [])

  // Methods
  const enableSwipe = useCallback(() => {
    setState((prev) => ({ ...prev, isSwipeEnabled: true }))
  }, [])

  const disableSwipe = useCallback(() => {
    setState((prev) => ({ ...prev, isSwipeEnabled: false }))
  }, [])

  const setSwipeThreshold = useCallback((threshold: number) => {
    setState((prev) => ({ ...prev, swipeThreshold: threshold }))
  }, [])

  const setLongPressThreshold = useCallback((threshold: number) => {
    setState((prev) => ({ ...prev, longPressThreshold: threshold }))
  }, [])

  const setDoubleTapThreshold = useCallback((threshold: number) => {
    setState((prev) => ({ ...prev, doubleTapThreshold: threshold }))
  }, [])

  // Context value
  const value = {
    ...state,
    enableSwipe,
    disableSwipe,
    setSwipeThreshold,
    setLongPressThreshold,
    setDoubleTapThreshold,
  }

  return <GestureContext.Provider value={value}>{children}</GestureContext.Provider>
}

// Custom hook to use the gesture context
export function useGesture(): GestureContextType {
  const context = useContext(GestureContext)

  if (context === undefined) {
    throw new Error("useGesture must be used within a GestureProvider")
  }

  return context
}
