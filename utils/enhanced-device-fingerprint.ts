/**
 * enhanced-device-fingerprint.ts
 * 
 * Extends the basic device fingerprinting with additional security-related
 * information to enhance MFA and authentication protection.
 */
import { getDeviceInfo, DeviceInfo } from './device-fingerprint';
import { info, warn } from '@/utils/logger';
import { loadPlatform } from '@/platform';

/**
 * Enhanced device information for authentication purposes
 */
export interface EnhancedDeviceInfo extends DeviceInfo {
  // Browser/client information
  userAgent?: string;
  language?: string;
  timeZone?: string;
  screenSize?: {
    width: number;
    height: number;
    colorDepth: number;
  };
  
  // Network information
  networkType?: string;
  effectiveType?: string;
  
  // Additional security information
  hasTouch?: boolean;
  hasWebGL?: boolean;
  canvasFingerprint?: string;
  
  // Session information
  lastSeen?: number;
  isKnownDevice?: boolean;
  
  // Capacitor-specific when available
  batteryLevel?: number;
}

/**
 * Generate a canvas fingerprint for additional browser identification
 * This technique is used to identify browsers even when cookies are cleared
 */
function generateCanvasFingerprint(): string {
  try {
    if (typeof document === 'undefined') return '';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Set canvas dimensions
    canvas.width = 200;
    canvas.height = 50;
    
    // Draw background
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text with custom styling
    ctx.fillStyle = 'rgb(0, 0, 255)';
    ctx.font = '18px Arial';
    ctx.textBaseline = 'top';
    ctx.fillText('7awel Wallet Fingerprint', 5, 5);
    
    // Add a gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "blue");
    gradient.addColorStop(1, "red");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 30, canvas.width, 20);
    
    // Convert to data URL and hash
    return canvas.toDataURL().substring(0, 64);
  } catch (err) {
    warn('Failed to generate canvas fingerprint:', err);
    return '';
  }
}

/**
 * Gets extended information about the current device for enhanced security
 */
export async function getEnhancedDeviceInfo(): Promise<EnhancedDeviceInfo> {
  // Get base device info from the platform-specific implementation
  const baseDeviceInfo = await getDeviceInfo();
  const platform = await loadPlatform();
  
  const enhanced: EnhancedDeviceInfo = {
    ...baseDeviceInfo,
    lastSeen: Date.now()
  };
  
  // Add browser-specific information when in browser context
  if (typeof window !== 'undefined') {
    const { navigator } = window;
    
    enhanced.userAgent = navigator.userAgent;
    enhanced.language = navigator.language;
    enhanced.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    enhanced.hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    enhanced.hasWebGL = !!document.createElement('canvas').getContext('webgl');
    enhanced.canvasFingerprint = generateCanvasFingerprint();
    
    // Screen information
    if (window.screen) {
      enhanced.screenSize = {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      };
    }
    
    // Network information (modern browsers)
    const connection = (navigator as any).connection;
    if (connection) {
      enhanced.networkType = connection.type;
      enhanced.effectiveType = connection.effectiveType;
    }
  }
  
  // Get additional Capacitor-specific information
  try {
    // Only available in native context with the appropriate plugin
    const batteryInfo = await platform.getBatteryInfo?.();
    if (batteryInfo) {
      enhanced.batteryLevel = batteryInfo.batteryLevel;
    }
  } catch (err) {
    // Silently fail as this is optional enhancement
  }
  
  return enhanced;
}

/**
 * Compare two device fingerprints and return a similarity score (0-1)
 * Used to detect potentially suspicious logins from new devices
 */
export function compareDeviceFingerprints(
  device1: EnhancedDeviceInfo,
  device2: EnhancedDeviceInfo
): number {
  let matchCount = 0;
  let totalChecks = 0;
  
  // Check core device identifiers
  if (device1.id === device2.id) matchCount += 3;
  totalChecks += 3; // Heavily weighted
  
  // Check platform characteristics
  if (device1.platform === device2.platform) matchCount++;
  totalChecks++;
  
  if (device1.model === device2.model) matchCount++;
  totalChecks++;
  
  if (device1.osVersion === device2.osVersion) matchCount++;
  totalChecks++;
  
  // Check browser characteristics
  if (device1.userAgent === device2.userAgent) matchCount += 2;
  totalChecks += 2;
  
  if (device1.language === device2.language) matchCount++;
  totalChecks++;
  
  if (device1.timeZone === device2.timeZone) matchCount++;
  totalChecks++;
  
  // Check screen characteristics
  if (device1.screenSize && device2.screenSize) {
    if (device1.screenSize.width === device2.screenSize.width &&
        device1.screenSize.height === device2.screenSize.height) {
      matchCount++;
    }
    totalChecks++;
  }
  
  // Return similarity score (0-1)
  return totalChecks > 0 ? matchCount / totalChecks : 0;
}
