// platform/web.ts
import { info, warn, error as logError } from "@/utils/logger";
import type { LocalDatabase, StoreName, TransactionContext } from './local-db/local-db-types'
import { BaseLocalDatabaseManager } from './local-db/local-db-common'
import { APP_CONFIG } from '@/constants/app-config';


// Platform type export
export const platformType = "web" as const

// PIN storage (web treats this as secure)
export async function getSecureStorageItem(key: string): Promise<string | null> {
  const value = localStorage.getItem(key)
  return value || null
}

export async function setSecureStorageItem(key: string, value: string): Promise<void> {
  localStorage.setItem(key, value)
}

export async function removeSecureStorageItem(key: string): Promise<void> {
  localStorage.removeItem(key)
}

// Local database implementation for web using IndexedDB
class IndexedDBManager extends BaseLocalDatabaseManager {
  private db: IDBDatabase | null = null;
  
  async init(): Promise<void> {
    const DB_NAME = APP_CONFIG.STORAGE.DB_NAME;
    const DB_VERSION = APP_CONFIG.STORAGE.DB_VERSION;

    if (this.isInitialized) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores with updated structure
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('contacts')) {
          const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
          contactStore.createIndex('phoneHash', 'phoneHash', { unique: false });
          contactStore.createIndex('isFavorite', 'isFavorite', { unique: false });
          contactStore.createIndex('hasAccount', 'hasAccount', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('recentTransactions')) {
          const txStore = db.createObjectStore('recentTransactions', { keyPath: 'id' });
          txStore.createIndex('createdAt', 'createdAt', { unique: false });
          txStore.createIndex('recipientId', 'recipientId', { unique: false });
          txStore.createIndex('senderId', 'senderId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('balance')) {
          const balanceStore = db.createObjectStore('balance', { keyPath: 'id' });
          balanceStore.createIndex('symbol', 'symbol', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('storeName', 'storeName', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('failedSyncs')) {
          const failedStore = db.createObjectStore('failedSyncs', { keyPath: 'id' });
          failedStore.createIndex('storeName', 'storeName', { unique: false });
          failedStore.createIndex('movedToFailedAt', 'movedToFailedAt', { unique: false });
        }
      };
    });
  }
  
  async get<T extends StoreName>(storeName: T, key: string): Promise<LocalDatabase[T] | undefined> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result || undefined);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getAll<T extends StoreName>(storeName: T): Promise<LocalDatabase[T][]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  async set<T extends StoreName>(storeName: T, value: LocalDatabase[T]): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async delete<T extends StoreName>(storeName: T, key: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async clear<T extends StoreName>(storeName: T): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async query<T extends StoreName>(storeName: T, index: string, value: any): Promise<LocalDatabase[T][]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const indexObj = store.index(index);
      const request = indexObj.getAll(value);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  async transaction<R>(
    storeNames: StoreName[], 
    mode: 'readonly' | 'readwrite',
    callback: (tx: TransactionContext) => Promise<R>
  ): Promise<R> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, mode);
      
      // Create a transaction context
      const context: TransactionContext = {
        get: async <T extends StoreName>(storeName: T, key: string): Promise<LocalDatabase[T] | undefined> => {
          return new Promise((resolveGet, rejectGet) => {
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolveGet(request.result || undefined);
            request.onerror = () => rejectGet(request.error);
          });
        },
        
        getAll: async <T extends StoreName>(storeName: T): Promise<LocalDatabase[T][]> => {
          return new Promise((resolveGetAll, rejectGetAll) => {
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolveGetAll(request.result || []);
            request.onerror = () => rejectGetAll(request.error);
          });
        },
        
        set: async <T extends StoreName>(storeName: T, value: LocalDatabase[T]): Promise<void> => {
          return new Promise((resolveSet, rejectSet) => {
            const store = transaction.objectStore(storeName);
            const request = store.put(value);
            
            request.onsuccess = () => resolveSet();
            request.onerror = () => rejectSet(request.error);
          });
        },
        
        delete: async <T extends StoreName>(storeName: T, key: string): Promise<void> => {
          return new Promise((resolveDelete, rejectDelete) => {
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolveDelete();
            request.onerror = () => rejectDelete(request.error);
          });
        }
      };
      
      // Execute the callback with the transaction context
      callback(context)
        .then(result => {
          transaction.oncomplete = () => resolve(result);
        })
        .catch(error => {
          transaction.abort();
          reject(error);
        });
      
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
let dbManager: IndexedDBManager | null = null;

export async function getLocalDB(): Promise<IndexedDBManager> {
  if (!dbManager) {
    dbManager = new IndexedDBManager();
    await dbManager.init();
  }
  return dbManager;
}

// Re-export helper functions from common
export { ContactHelpers, ProfileHelpers, TransactionHelpers, SyncHelpers } from './local-db/local-db-common';

// Export types
export type { LocalDatabase, StoreName } from './local-db/local-db-types';

// Other web-specific exports (unchanged)

export async function getDeviceInfo() {
  return {
    platform: "web",
  }
}

export async function secureStoreSet(key: string, value: string) {
  info('[platform/web] secureStoreSet', key, value);
  localStorage.setItem(key, value)
}

export async function secureStoreGet(key: string) {
  const val = localStorage.getItem(key);
  info('[platform/web] secureStoreGet', key, val);
  return val;
}

export async function secureStoreRemove(key: string) {
  localStorage.removeItem(key)
}

export async function isBiometricAvailable() {
  return false
}

export async function authenticateBiometric() {
  return false
}

// ---------------------------------------------------------------------------
// Contacts access (Web)
// ---------------------------------------------------------------------------

/**
 * Request permission to access contacts using the Web Contacts Picker API.
 * Returns true if the API is available and the user selects at least one contact.
 * Falls back to false if not supported or the user denies access.
 */
export async function requestContactsPermission(): Promise<boolean> {
  // Check if the Contacts Picker API is supported
  const anyNavigator: any = navigator as any;
  if (!('contacts' in anyNavigator) || typeof anyNavigator.contacts.select !== 'function') {
    warn('[platform/web] Contacts Picker API not supported by this browser');
    return false;
  }

  try {
    // Trigger the permission prompt by attempting to select a dummy contact.
    // We request a single contact so the user is not overwhelmed.
    await anyNavigator.contacts.select(['name'], { multiple: false });
    return true;
  } catch (err) {
    // If the user cancels or denies permission, an exception is thrown.
    warn('[platform/web] Contacts permission denied or cancelled:', err);
    return false;
  }
}

/**
 * Retrieve contacts using the Web Contacts Picker API.
 * The function requests `name` and `tel` fields and returns an array of
 * `{ name: string; phoneNumbers: string[] }` objects.
 * If the API is unsupported or the user cancels, an empty array is returned.
 */
export async function getContacts(): Promise<Array<{ name: string; phoneNumbers: string[] }>> {
  const anyNavigator: any = navigator as any;
  if (!('contacts' in anyNavigator) || typeof anyNavigator.contacts.select !== 'function') {
    return [];
  }

  try {
    const contacts = await anyNavigator.contacts.select(['name', 'tel'], { multiple: true });
    return (contacts || []).map((c: any) => ({
      name: (Array.isArray(c.name) ? c.name[0] : c.name) || 'Unknown',
      phoneNumbers: Array.isArray(c.tel) ? c.tel.filter(Boolean) : (c.tel ? [c.tel] : []),
    }));
  } catch (err) {
    // User cancelled the picker or another error occurred
    warn('[platform/web] Contact selection cancelled or failed:', err);
    return [];
  }
}

export async function takePhoto() {
  return null
}

// ... (rest of the code remains the same)
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
 * Get battery information on web platform
 * Uses the Battery Status API when available
 * @returns Battery information or null if not available
 */
export async function getBatteryInfo(): Promise<{ batteryLevel?: number; charging?: boolean } | null> {
  try {
    // Check if Battery API is available
    const anyNavigator = navigator as any;
    if (!anyNavigator.getBattery) {
      return null;
    }

    const battery = await anyNavigator.getBattery();
    return {
      batteryLevel: Math.round(battery.level * 100), // Convert to percentage
      charging: battery.charging
    };
  } catch (error) {
    warn('[platform/web] Battery API not available:', error);
    return null;
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

export async function getRecentContacts(limit: number = 10): Promise<LocalDatabase['contacts'][]> {
  const db = await getLocalDB();
  const allContacts = await db.getAll('contacts');
  
  // Sort by lastInteraction descending and take limit
  return allContacts
    .filter(c => c.lastInteraction)
    .sort((a, b) => (b.lastInteraction || 0) - (a.lastInteraction || 0))
    .slice(0, limit);
}

export async function getFavoriteContacts(): Promise<LocalDatabase['contacts'][]> {
  const db = await getLocalDB();
  return db.query('contacts', 'isFavorite', true);
}

export async function updateContactInteraction(contactId: string): Promise<void> {
  const db = await getLocalDB();
  const contact = await db.get('contacts', contactId);
  
  if (contact) {
    contact.lastInteraction = Date.now();
    await db.set('contacts', contact);
  }
}
