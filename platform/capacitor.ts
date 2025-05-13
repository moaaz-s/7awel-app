// platform/capacitor.ts
// Capacitor‑specific implementations. Import all plugins here so that the rest
// of the code base remains platform‑agnostic.

import { Capacitor } from '@capacitor/core';
import { Device } from "@capacitor/device"
import { Preferences } from "@capacitor/preferences"

// Note: We import other plugins lazily (dynamic import) to keep bundle size small and
// to avoid TypeScript errors when the plugins are not installed for web builds.

/** Returns detailed device info (platform, model, OS version, etc.). */
export async function getDeviceInfo() {
  return await Device.getInfo()
}

/** Secure‑ish key/value store – uses Preferences on Android/iOS. */
export async function secureStoreSet(key: string, value: string) {
  await Preferences.set({ key, value })
}

export async function secureStoreGet(key: string) {
  const { value } = await Preferences.get({ key })
  return value ?? null
}

/** Utility to know if we run inside a native container. */
export const isNative = Capacitor.isNativePlatform();

// ---------------------------------------------------------------------------
// Biometrics (Fingerprint / FaceID)
// ---------------------------------------------------------------------------

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const { Biometry } = await import("@capacitor-fingerprint")
    const result: any = await (Biometry as any).isAvailable()
    return !!result?.isAvailable
  } catch {
    return false
  }
}

export async function authenticateBiometric(reason = "Authenticate"): Promise<boolean> {
  try {
    const { Biometry } = await import("@capacitor-fingerprint")
    const result: any = await (Biometry as any).verify({ reason })
    return !!result?.verified
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Contacts access
// ---------------------------------------------------------------------------

export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { Contacts } = await import("@capacitor-community/contacts")
    const perm = await (Contacts as any).requestPermissions()
    return perm?.granted ?? false
  } catch {
    return false
  }
}

export async function getContacts(): Promise<any[]> {
  try {
    const { Contacts } = await import("@capacitor-community/contacts")
    const list = await (Contacts as any).getContacts()
    return list?.contacts ?? []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Camera access
// ---------------------------------------------------------------------------

export async function takePhoto(): Promise<{ base64String?: string; webPath?: string } | null> {
  try {
    const { Camera } = await import("@capacitor/camera")
    const photo = await Camera.getPhoto({
      resultType: "base64",
      quality: 70,
    })
    return photo
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Deep links
// ---------------------------------------------------------------------------

export async function addDeepLinkListener(callback: (url: string) => void): Promise<() => void> {
  const { App } = await import("@capacitor/app")
  const handler = await App.addListener("appUrlOpen", ({ url }: any) => callback(url))
  return () => handler.remove()
}

// ---------------------------------------------------------------------------
// Native share
// ---------------------------------------------------------------------------

export async function share(options: { title?: string; text?: string; url?: string }): Promise<boolean> {
  try {
    const { Share } = await import("@capacitor/share")
    await Share.share(options)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Clipboard copy
// ---------------------------------------------------------------------------

export async function copyText(text: string): Promise<boolean> {
  try {
    const { Clipboard } = await import("@capacitor/clipboard")
    await Clipboard.write({ string: text })
    return true
  } catch {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// QR / Barcode scanning
// ---------------------------------------------------------------------------

export async function scanQRCode(containerId?: string): Promise<string | null> {
  console.log(`[platform/capacitor] scanQRCode called. containerId: ${containerId} (unused)`);
  try {
    const { BarcodeScanner } = await import("@capacitor-community/barcode-scanner")

    // Request permission & prepare
    await BarcodeScanner.prepare()

    // Hide the webview background so the camera view is visible
    BarcodeScanner.hideBackground()

    const result = await BarcodeScanner.startScan({ preferFrontCamera: false })
    console.log("[platform/capacitor] BarcodeScanner.startScan result:", result);

    // Show back the background
    BarcodeScanner.showBackground()

    if (result.hasContent) {
      return result.content || null
    }
  } catch (err) {
    console.warn("scanQRCode error", err)
  }
  return null
}

export async function cancelQRCodeScan(): Promise<void> {
  console.log("[platform/capacitor] cancelQRCodeScan called.");
  try {
    const { BarcodeScanner } = await import("@capacitor-community/barcode-scanner")
    await BarcodeScanner.stopScan()
    BarcodeScanner.showBackground()
  } catch {
    /* ignore */
  }
}

export async function toggleFlashlight(on: boolean): Promise<boolean> {
  try {
    const { BarcodeScanner } = await import("@capacitor-community/barcode-scanner")
    await BarcodeScanner.applySettings({ torchOn: on })
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Email client handling
// ---------------------------------------------------------------------------

/**
 * Opens the appropriate email client on native platforms
 * 
 * @param email The email address to use (determines which app to open)
 * @returns Promise<boolean> indicating success
 */
export async function openEmailClient(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    const { App } = await import('@capacitor/app');
    
    // Try to open specific email apps based on domain
    if (domain.includes('gmail')) {
      // Try Gmail app first
      const opened = await App.openUrl({ url: 'googlegmail://' });
      if (opened) return true;
    } else if (domain.includes('outlook') || domain.includes('hotmail')) {
      // Try Outlook app first
      const opened = await App.openUrl({ url: 'ms-outlook://' });
      if (opened) return true;
    } else if (domain.includes('yahoo')) {
      // Try Yahoo Mail app
      const opened = await App.openUrl({ url: 'ymail://' });
      if (opened) return true;
    }
    
    // Fallback to generic mailto (should open default mail app)
    return await App.openUrl({ url: `mailto:${email}` });
  } catch (err) {
    console.error('[Capacitor] Error opening email client:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Network status
// ---------------------------------------------------------------------------

export async function isOnline(): Promise<boolean> {
  try {
    const { Network } = await import("@capacitor/network")
    const status = await Network.getStatus()
    return status.connected
  } catch {
    return navigator.onLine
  }
}

export async function addNetworkListener(callback: (online: boolean) => void): Promise<() => void> {
  try {
    const { Network } = await import("@capacitor/network")
    const listener = Network.addListener("networkStatusChange", (status: any) => callback(status.connected))
    return () => listener.remove()
  } catch {
    const handler = () => callback(navigator.onLine)
    window.addEventListener("online", handler)
    window.addEventListener("offline", handler)
    return () => {
      window.removeEventListener("online", handler)
      window.removeEventListener("offline", handler)
    }
  }
}
