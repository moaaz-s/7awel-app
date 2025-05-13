// platform/web.ts
// Web implementation stubs for platform‑specific functionality. These will be replaced by
// real Capacitor implementations on mobile builds.

import { loadPlatform } from '@/platform';
import { info, warn, error as logError } from "@/utils/logger";

export async function getDeviceInfo() {
  return {
    platform: "web",
  }
}

export async function secureStoreSet(key: string, value: string) {
  console.info('[platform/web] secureStoreSet', key, value);
  localStorage.setItem(key, value)
}

export async function secureStoreGet(key: string) {
  const val = localStorage.getItem(key);
  console.info('[platform/web] secureStoreGet', key, val);
  return val;
}

export async function secureStoreRemove(key: string) {
  localStorage.removeItem(key)
}

// -------------------- additional feature fallbacks --------------------

export async function isBiometricAvailable() {
  return false
}

export async function authenticateBiometric() {
  return false
}

export async function requestContactsPermission() {
  return false
}

export async function getContacts() {
  return []
}

export async function takePhoto() {
  return null
}

export async function addDeepLinkListener() {
  // Return a noop disposer
  return () => {}
}

interface ShareOptions {
  title?: string
  text?: string
  url?: string
}

export async function share(options: ShareOptions): Promise<boolean> {
  // Prefer Web Share API when available
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share(options)
      return true
    } catch {
      // fallthrough to clipboard below
    }
  }

  // Fallback – copy URL/text to clipboard if provided
  try {
    const toCopy = options.url || options.text || ""
    if (toCopy && navigator.clipboard) {
      await navigator.clipboard.writeText(toCopy)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function scanQRCode(containerId?: string): Promise<{ scanner: any; result: Promise<string | null> } | null> {
  info(`[platform/web] scanQRCode called. containerId: ${containerId}`);
  try {
    const { Html5Qrcode } = await import("html5-qrcode")

    // Use provided container ID or throw error if not provided for web
    if (!containerId) {
      logError("[platform/web] scanQRCode requires a containerId for web platform.");
      return null;
    }
    const scannerElement = document.getElementById(containerId);
    if (!scannerElement) {
      logError(`[platform/web] scanQRCode container element with ID '${containerId}' not found.`);
      return null;
    }

    // Check if a scanner video is already present in the container
    if (scannerElement.querySelector('video')) {
      warn(`[platform/web] Video element already found in container '${containerId}'. Assuming scanner is already initialized. Aborting duplicate start.`);
      // We return null because we don't have the original scanner instance or result promise here.
      // The calling component's logic should handle this null return gracefully.
      return null;
    }

    const scanner = new Html5Qrcode(containerId)

    // Return the scanner instance and a promise for the result
    const resultPromise = new Promise<string | null>((resolve) => {
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (text: string) => {
          info(`[platform/web] QR Code detected: ${text}`);
          // Don't stop here, let the calling component handle cleanup
          // Don't remove the container element, it's part of the page UI
          resolve(text)
        },
        () => {} // Ignore non-matches
      ).catch((err) => {
        logError("[platform/web] Scanner start error:", err);
        resolve(null)
      })
    });

    return { scanner, result: resultPromise };
  } catch (err) {
    logError("[platform/web] Error loading/starting scanner:", err);
    return null
  }
}

export async function toggleFlashlight(_on: boolean): Promise<boolean> {
  // Torch not available on web fallback
  return false;
}

export async function isOnline() {
  return navigator.onLine
}

export async function addNetworkListener(callback: (online: boolean) => void) {
  const handler = () => callback(navigator.onLine)
  window.addEventListener("online", handler)
  window.addEventListener("offline", handler)
  return () => {
    window.removeEventListener("online", handler)
    window.removeEventListener("offline", handler)
  }
}

/**
 * Opens the appropriate email client on web platforms
 * 
 * @param email The email address to use (determines which webmail to open)
 * @returns Promise<boolean> indicating success
 */
export async function openEmailClient(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    let emailUrl = '';
    
    // Determine appropriate webmail URL based on email domain
    if (domain.includes('gmail')) {
      emailUrl = 'https://mail.google.com';
    } else if (domain.includes('outlook') || domain.includes('hotmail')) {
      emailUrl = 'https://outlook.live.com';
    } else if (domain.includes('yahoo')) {
      emailUrl = 'https://mail.yahoo.com';
    } else if (domain.includes('proton')) {
      emailUrl = 'https://mail.proton.me';
    } else {
      // Try a generic webmail for the domain
      emailUrl = `https://webmail.${domain}`;
    }
    
    // Open in new tab
    window.open(emailUrl, '_blank');
    
    // [DEPRECATED] In development, simulate a magic link for testing
    // if (process.env.NODE_ENV === 'development') {
    //   info('[platform/web] Development mode: simulating magic link click');
    //   setTimeout(() => {
    //     const mockToken = 'dev-test-token-' + Math.random().toString(36).substring(2);
    //     window.open(`/verify-email?t=${mockToken}`, '_blank');
    //   }, 500);
    // }
    
    return true;
  } catch (err) {
    logError('[platform/web] Error opening email client:', err);
    return false;
  }
}
