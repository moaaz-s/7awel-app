// platform/web.ts
// Web implementation stubs for platform‑specific functionality. These will be replaced by
// real Capacitor implementations on mobile builds.

export async function getDeviceInfo() {
  return {
    platform: "web",
  }
}

export async function secureStoreSet(key: string, value: string) {
  localStorage.setItem(key, value)
}

export async function secureStoreGet(key: string) {
  return localStorage.getItem(key)
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
  console.log(`[platform/web] scanQRCode called. containerId: ${containerId}`);
  try {
    const { Html5Qrcode } = await import("html5-qrcode")

    // Use provided container ID or throw error if not provided for web
    if (!containerId) {
      console.error("[platform/web] scanQRCode requires a containerId for web platform.");
      return null;
    }
    const scannerElement = document.getElementById(containerId);
    if (!scannerElement) {
      console.error(`[platform/web] scanQRCode container element with ID '${containerId}' not found.`);
      return null;
    }

    // Check if a scanner video is already present in the container
    if (scannerElement.querySelector('video')) {
      console.warn(`[platform/web] Video element already found in container '${containerId}'. Assuming scanner is already initialized. Aborting duplicate start.`);
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
          console.log(`[platform/web] QR Code detected: ${text}`);
          // Don't stop here, let the calling component handle cleanup
          // Don't remove the container element, it's part of the page UI
          resolve(text)
        },
        () => {} // Ignore non-matches
      ).catch((err) => {
        console.error("[platform/web] Scanner start error:", err);
        resolve(null)
      })
    });

    return { scanner, result: resultPromise };
  } catch (err) {
    console.error("[platform/web] Error loading/starting scanner:", err);
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
