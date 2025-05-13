import { loadPlatform } from '@/platform';

// Small helper to lazily resolve the current platform module once and re-use it
const platformPromise = loadPlatform();

// SHA-256 hash helper that works in both browser (Web Crypto) and Node (crypto)
async function sha256Hex(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Browser / Deno
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback to Node 'crypto' when available (vitest / Node scripts)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createHash } = require('crypto');
    return createHash('sha256').update(data).digest('hex');
  } catch {
    // Last-resort naive hash (not cryptographically strong, but prevents crashes)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash |= 0; // Convert to 32-bit int
    }
    return (`00000000${(hash >>> 0).toString(16)}`).slice(-8);
  }
}

const DEVICE_ID_KEY = 'device_fingerprint';

// Device information for tracking purposes
export interface DeviceInfo {
  id: string;           // Unique device identifier 
  model: string;        // Device model (e.g., "iPhone 13")
  platform: string;     // OS platform (e.g., "ios", "android", "web")
  osVersion: string;    // Operating system version (e.g., "15.0")
  manufacturer?: string; // Device manufacturer (e.g., "Apple")
  webViewVersion?: string; // WebView version
  appVersion?: string;  // Client app version
  isVirtual?: boolean;  // Whether the app is running in a virtual device
}

/**
 * Gets information about the current device using the platform abstraction.
 * Falls back to simpler web info if the platform isn't available.
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const platform = await platformPromise;
  const rawInfo: any = await platform.getDeviceInfo();

  // Merge with stored/generated ID
  return {
    id: await getDeviceId(),
    model: rawInfo.model ?? 'unknown',
    platform: rawInfo.platform ?? 'unknown',
    osVersion: rawInfo.osVersion ?? 'unknown',
    manufacturer: rawInfo.manufacturer,
    webViewVersion: rawInfo.webViewVersion,
    appVersion: rawInfo.appVersion,
    isVirtual: rawInfo.isVirtual,
  };
}

/**
 * Generate a unique fingerprint based on device characteristics.
 * This helps identify the device even if the native device id changes.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const platform = await platformPromise;
  const info: any = await platform.getDeviceInfo();

  // Stringify all available properties for hashing
  const fingerprintSource = JSON.stringify(info);
  return sha256Hex(fingerprintSource);
}

/**
 * Gets the device ID, generating and storing one if it doesn't exist.
 */
export async function getDeviceId(): Promise<string> {
  const platform = await platformPromise;
  const storedId = await platform.secureStoreGet(DEVICE_ID_KEY);

  if (storedId) {
    return storedId;
  }

  // Generate a new fingerprint if none exists
  const newFingerprint = await generateDeviceFingerprint();

  // Store for future use
  await platform.secureStoreSet(DEVICE_ID_KEY, newFingerprint);

  return newFingerprint;
}

/**
 * Stores a specific device ID (useful for recovery scenarios)
 */
export async function storeDeviceId(deviceId: string): Promise<void> {
  const platform = await platformPromise;
  await platform.secureStoreSet(DEVICE_ID_KEY, deviceId);
}
