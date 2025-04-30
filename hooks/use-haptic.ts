import { useEffect, useState } from 'react';

type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface HapticOptions {
  /**
   * Controls whether haptic feedback is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook for using haptic feedback in a Capacitor app
 * Will gracefully do nothing in web browsers that don't support vibration
 */
export function useHaptic(options: HapticOptions = {}) {
  const { enabled = true } = options;
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if the device supports vibration
    const checkHapticSupport = async () => {
      // For Capacitor, we would check if the Haptics plugin is available
      // For web browsers, we check if the Vibration API is available
      const hasVibration = 'navigator' in window && 'vibrate' in navigator;
      
      // In a real implementation, we'd check for Capacitor's Haptics plugin
      // const hasCapacitorHaptics = window?.Capacitor?.isPluginAvailable('Haptics');
      
      setIsAvailable(hasVibration /* || hasCapacitorHaptics */);
    };
    
    checkHapticSupport();
  }, []);
  
  /**
   * Triggers haptic feedback of the specified type
   * @param type Type of haptic feedback to trigger
   */
  const trigger = (type: HapticFeedbackType = 'light') => {
    if (!enabled || !isAvailable) return;
    
    try {
      // In a Capacitor app, we would use the Haptics plugin:
      // if (window?.Capacitor?.isPluginAvailable('Haptics')) {
      //   const { Haptics, HapticsImpactStyle } = Plugins;
      //   
      //   switch (type) {
      //     case 'light':
      //       await Haptics.impact({ style: HapticsImpactStyle.Light });
      //       break;
      //     case 'medium':
      //       await Haptics.impact({ style: HapticsImpactStyle.Medium });
      //       break;
      //     case 'heavy':
      //       await Haptics.impact({ style: HapticsImpactStyle.Heavy });
      //       break;
      //     case 'success':
      //       await Haptics.notification({ type: HapticsNotificationType.Success });
      //       break;
      //     case 'warning':
      //       await Haptics.notification({ type: HapticsNotificationType.Warning });
      //       break;
      //     case 'error':
      //       await Haptics.notification({ type: HapticsNotificationType.Error });
      //       break;
      //   }
      // }
      
      // For web browsers, we can use the Vibration API as fallback
      if ('navigator' in window && 'vibrate' in navigator) {
        switch (type) {
          case 'light':
            navigator.vibrate(10); // Short vibration
            break;
          case 'medium':
            navigator.vibrate(20); // Medium vibration
            break;
          case 'heavy':
            navigator.vibrate(30); // Stronger vibration
            break;
          case 'success':
            navigator.vibrate([10, 30, 10]); // Pattern: short, pause, short
            break;
          case 'warning':
            navigator.vibrate([20, 40, 20]); // Pattern: medium, pause, medium
            break;
          case 'error':
            navigator.vibrate([30, 20, 30, 20, 30]); // Pattern for error
            break;
        }
      }
    } catch (error) {
      console.error('Error triggering haptic feedback:', error);
    }
  };
  
  return {
    isAvailable,
    trigger
  };
}
