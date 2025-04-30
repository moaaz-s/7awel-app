"use client"

import { createContext, useContext, ReactNode, useEffect, useState } from "react"
import { useMobile } from "@/hooks/use-mobile"

type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

interface HapticContextType {
  /**
   * Triggers haptic feedback of the specified type
   */
  trigger: (type?: HapticFeedbackType) => void
  
  /**
   * Whether haptic feedback is available on this device
   */
  isAvailable: boolean
  
  /**
   * Whether haptic feedback is enabled in user preferences
   */
  isEnabled: boolean
  
  /**
   * Toggle haptic feedback on/off
   */
  setEnabled: (enabled: boolean) => void
}

const HapticContext = createContext<HapticContextType>({
  trigger: () => {},
  isAvailable: false,
  isEnabled: true,
  setEnabled: () => {},
})

interface HapticProviderProps {
  children: ReactNode
  initialEnabled?: boolean
}

export function HapticProvider({
  children,
  initialEnabled = true,
}: HapticProviderProps) {
  const { isMobile, isCapacitor } = useMobile()
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [isAvailable, setIsAvailable] = useState(false)
  
  useEffect(() => {
    // Check if the device supports vibration
    const checkHapticSupport = async () => {
      // For web browsers, check if the Vibration API is available
      const hasVibration = 'navigator' in window && 'vibrate' in navigator
      
      // In a real implementation, we'd check for Capacitor's Haptics plugin
      // Use type assertion to handle Capacitor property
      const hasCapacitorHaptics = isCapacitor && 
        typeof (window as any)?.Capacitor !== 'undefined' && 
        (window as any)?.Capacitor?.isPluginAvailable?.('Haptics')
      
      setIsAvailable(hasVibration || !!hasCapacitorHaptics)
    }
    
    checkHapticSupport()
  }, [isCapacitor])
  
  const trigger = (type: HapticFeedbackType = 'light') => {
    if (!isEnabled || !isAvailable) return
    
    try {
      // In a Capacitor app, we would use the Haptics plugin
      if (isCapacitor && 
          typeof (window as any)?.Capacitor !== 'undefined' && 
          (window as any)?.Capacitor?.isPluginAvailable?.('Haptics')) {
        // Capacitor implementation would go here
        // This is placeholder code, you would need to import the actual plugins
        // const { Haptics, HapticsImpactStyle, HapticsNotificationType } = Plugins
        
        // switch (type) {
        //   case 'light':
        //     Haptics.impact({ style: HapticsImpactStyle.Light })
        //     break
        //   case 'medium':
        //     Haptics.impact({ style: HapticsImpactStyle.Medium })
        //     break
        //   case 'heavy':
        //     Haptics.impact({ style: HapticsImpactStyle.Heavy })
        //     break
        //   case 'success':
        //     Haptics.notification({ type: HapticsNotificationType.Success })
        //     break
        //   case 'warning':
        //     Haptics.notification({ type: HapticsNotificationType.Warning })
        //     break
        //   case 'error':
        //     Haptics.notification({ type: HapticsNotificationType.Error })
        //     break
        // }
      }
      
      // For web browsers, we can use the Vibration API as fallback
      if ('navigator' in window && 'vibrate' in navigator) {
        switch (type) {
          case 'light':
            navigator.vibrate(10) // Short vibration
            break
          case 'medium':
            navigator.vibrate(20) // Medium vibration
            break
          case 'heavy':
            navigator.vibrate(30) // Stronger vibration
            break
          case 'success':
            navigator.vibrate([10, 30, 10]) // Pattern: short, pause, short
            break
          case 'warning':
            navigator.vibrate([20, 40, 20]) // Pattern: medium, pause, medium
            break
          case 'error':
            navigator.vibrate([30, 20, 30, 20, 30]) // Pattern for error
            break
        }
      }
    } catch (error) {
      console.error('Error triggering haptic feedback:', error)
    }
  }
  
  return (
    <HapticContext.Provider
      value={{
        trigger,
        isAvailable,
        isEnabled,
        setEnabled: setIsEnabled,
      }}
    >
      {children}
    </HapticContext.Provider>
  )
}

export const useHaptic = () => useContext(HapticContext)
