// platform/capacitor.ts
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { info, warn, error as logError } from "@/utils/logger";
import type { LocalDatabase, StoreName, TransactionContext } from './local-db/local-db-types'
import { BaseLocalDatabaseManager } from './local-db/local-db-common'
import { APP_CONFIG } from '@/constants/app-config';



// Platform type export
export const platformType = "capacitor" as const

// Platform utilities
export async function getDeviceInfo() {
  const { Device } = await import('@capacitor/device');
  return Device.getInfo();
}

// Secure storage using Preferences
export async function getSecureStorageItem(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value;
}

export async function setSecureStorageItem(key: string, value: string): Promise<void> {
  await Preferences.set({ key, value });
}

export async function removeSecureStorageItem(key: string): Promise<void> {
  await Preferences.remove({ key });
}

// Backward compatibility aliases
export const secureStoreGet = getSecureStorageItem;
export const secureStoreSet = setSecureStorageItem;
export const secureStoreRemove = removeSecureStorageItem;

// SQLite Local Database for Capacitor
class SQLiteManager extends BaseLocalDatabaseManager {
  private db: any = null;
  
  async init(): Promise<void> {
    const DB_NAME = APP_CONFIG.STORAGE.DB_NAME;
    const DB_VERSION = APP_CONFIG.STORAGE.DB_VERSION;

    if (this.isInitialized) return;
    
    try {
      const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      
      // Create and open database
      this.db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
      await this.db.open();
      
      // Create tables
      await this.createTables();
      
      info('[SQLiteManager] Database initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      logError('[SQLiteManager] Failed to initialize database:', error);
      throw error;
    }
  }
  
  private async createTables(): Promise<void> {
    // TODO: Create a sustainable process to creating & updating local database tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS userProfile (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        avatar TEXT,
        country TEXT,
        address TEXT,
        dob TEXT,
        gender TEXT,
        walletAddress TEXT,
        lastUpdated INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        phoneHash TEXT NOT NULL,
        email TEXT,
        avatar TEXT,
        walletAddress TEXT,
        initial TEXT NOT NULL,
        lastInteraction INTEGER,
        isFavorite INTEGER DEFAULT 0,
        syncedAt INTEGER NOT NULL,
        hasAccount INTEGER DEFAULT 0,
        linkedUserId TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS recentTransactions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        assetSymbol TEXT DEFAULT 'USD',
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        recipientId TEXT,
        senderId TEXT,
        note TEXT,
        syncedAt INTEGER NOT NULL,
        localOnly INTEGER DEFAULT 0,
        network TEXT,
        rawBlockchainData TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS balance (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        amount REAL NOT NULL,
        fiatValue REAL,
        total REAL,
        available REAL,
        pending REAL,
        mint TEXT,
        decimals INTEGER,
        lastUpdated INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS syncMetadata (
        id TEXT PRIMARY KEY,
        lastSync INTEGER NOT NULL,
        status TEXT NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS syncQueue (
        id TEXT PRIMARY KEY,
        storeName TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retryCount INTEGER DEFAULT 0,
        lastRetryAt INTEGER,
        error TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS failedSyncs (
        id TEXT PRIMARY KEY,
        storeName TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retryCount INTEGER NOT NULL,
        lastRetryAt INTEGER NOT NULL,
        error TEXT NOT NULL,
        movedToFailedAt INTEGER NOT NULL
      )`
    ];
    
    for (const sql of tables) {
      await this.db.execute(sql);
    }
    
    // Create indexes
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_contacts_phoneHash ON contacts(phoneHash)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_contacts_isFavorite ON contacts(isFavorite)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_contacts_hasAccount ON contacts(hasAccount)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_createdAt ON recentTransactions(createdAt)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_recipientId ON recentTransactions(recipientId)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_transactions_senderId ON recentTransactions(senderId)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_balance_symbol ON balance(symbol)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_syncQueue_storeName ON syncQueue(storeName)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_syncQueue_timestamp ON syncQueue(timestamp)');
    await this.db.execute('CREATE INDEX IF NOT EXISTS idx_failedSyncs_storeName ON failedSyncs(storeName)');
  }
  
  async get<T extends StoreName>(
    storeName: T,
    key: string
  ): Promise<LocalDatabase[T] | undefined> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const query = `SELECT * FROM ${storeName} WHERE ${this.getPrimaryKey(storeName)} = ?`;
      const result = await this.db.query(query, [key]);
      
      if (result.values && result.values.length > 0) {
        const row = result.values[0];
        return this.deserializeRow(storeName, row);
      }
      
      return undefined;
    } catch (error) {
      logError(`[SQLiteManager] Failed to get from ${storeName}:`, error);
      throw error;
    }
  }
  
  async getAll<T extends StoreName>(storeName: T): Promise<LocalDatabase[T][]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db.query(`SELECT * FROM ${storeName}`);
      if (result.values) {
        return result.values.map((row: any) => this.deserializeRow(storeName, row));
      }
      return [];
    } catch (error) {
      logError(`[SQLiteManager] Failed to getAll from ${storeName}:`, error);
      return [];
    }
  }
  
  async set<T extends StoreName>(storeName: T, value: LocalDatabase[T]): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const columns = this.getColumns(storeName);
      const placeholders = columns.map(() => '?').join(', ');
      const updatePlaceholders = columns.map(col => `${col} = ?`).join(', ');
      const primaryKey = this.getPrimaryKey(storeName);
      
      const values = this.serializeRow(storeName, value);
      
      // Try update first, then insert if needed
      const sql = `
        INSERT INTO ${storeName} (${columns.join(', ')}) VALUES (${placeholders})
        ON CONFLICT(${primaryKey}) DO UPDATE SET ${updatePlaceholders}
      `;
      
      await this.db.run(sql, [...values, ...values]);
    } catch (error) {
      logError(`[SQLiteManager] Failed to set in ${storeName}:`, error);
      throw error;
    }
  }
  
  async delete<T extends StoreName>(storeName: T, key: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const primaryKey = this.getPrimaryKey(storeName);
      await this.db.run(
        `DELETE FROM ${storeName} WHERE ${primaryKey} = ?`,
        [key]
      );
    } catch (error) {
      logError(`[SQLiteManager] Failed to delete from ${storeName}:`, error);
      throw error;
    }
  }
  
  async clear<T extends StoreName>(storeName: T): Promise<void> {
    await this.ensureInitialized();
    
    try {
      await this.db.run(`DELETE FROM ${storeName}`);
    } catch (error) {
      logError(`[SQLiteManager] Failed to clear ${storeName}:`, error);
      throw error;
    }
  }
  
  async query<T extends StoreName>(storeName: T, index: string, value: any): Promise<LocalDatabase[T][]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.db.query(
        `SELECT * FROM ${storeName} WHERE ${index} = ?`,
        [value]
      );
      
      if (result.values) {
        return result.values.map((row: any) => this.deserializeRow(storeName, row));
      }
      return [];
    } catch (error) {
      logError(`[SQLiteManager] Failed to query ${storeName}.${index}:`, error);
      return [];
    }
  }
  
  async transaction<T>(
    storeNames: StoreName[],
    mode: 'readonly' | 'readwrite',
    callback: (tx: TransactionContext) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // SQLite doesn't have the same transaction model as IndexedDB
    // We'll implement a simple transaction wrapper
    const context: TransactionContext = {
      get: async <K extends StoreName>(storeName: K, key: string) => {
        return this.get(storeName, key);
      },
      getAll: async <K extends StoreName>(storeName: K) => {
        return this.getAll(storeName);
      },
      set: async <K extends StoreName>(storeName: K, value: LocalDatabase[K]) => {
        await this.set(storeName, value);
      },
      delete: async <K extends StoreName>(storeName: K, key: string) => {
        await this.delete(storeName, key);
      }
    };
    
    // Execute callback with our transaction context
    try {
      await this.db.beginTransaction();
      const result = await callback(context);
      await this.db.commitTransaction();
      return result;
    } catch (error) {
      await this.db.rollbackTransaction();
      throw error;
    }
  }
  
  private getPrimaryKey(storeName: StoreName): string {
    switch (storeName) {
      case 'userProfile':
      case 'contacts':
      case 'recentTransactions':
        return 'id';
      case 'syncMetadata':
        return 'id';
      default:
        return 'id';
    }
  }
  
  private getColumns(storeName: StoreName): string[] {
    switch (storeName) {
      case 'userProfile':
        return ['id', 'firstName', 'lastName', 'email', 'phone', 'avatar', 'country', 'lastUpdated'];
      case 'contacts':
        return ['id', 'name', 'phone', 'phoneHash', 'email', 'avatar', 'lastInteraction', 'isFavorite', 'syncedAt', 'hasAccount'];
      case 'recentTransactions':
        return ['id', 'type', 'amount', 'currency', 'status', 'timestamp', 'recipientId', 'senderId', 'note'];
      case 'syncMetadata':
        return ['entity', 'lastSyncTime', 'syncVersion'];
      default:
        return [];
    }
  }
  
  private serializeRow(storeName: StoreName, value: any): any[] {
    const columns = this.getColumns(storeName);
    return columns.map(col => {
      if (col === 'isFavorite' || col === 'hasAccount') {
        return value[col] ? 1 : 0;
      }
      return value[col] ?? null;
    });
  }
  
  private deserializeRow(storeName: StoreName, row: any): any {
    const parsed = { ...row };
    
    // Convert SQLite boolean values
    if ('isFavorite' in parsed) {
      parsed.isFavorite = parsed.isFavorite === 1;
    }
    if ('hasAccount' in parsed) {
      parsed.hasAccount = parsed.hasAccount === 1;
    }
    
    return parsed;
  }
}

// Singleton instance
let dbManager: SQLiteManager | null = null;

export async function getLocalDB(): Promise<SQLiteManager> {
  if (!dbManager) {
    dbManager = new SQLiteManager();
    await dbManager.init();
  }
  return dbManager;
}

// Re-export helper functions from common
export { ContactHelpers, ProfileHelpers, TransactionHelpers, SyncHelpers } from './local-db/local-db-common';

// Export types
export type { LocalDatabase, StoreName } from './local-db/local-db-types';

// Legacy helper functions for backward compatibility
export async function getRecentContacts(limit: number = 10): Promise<LocalDatabase['contacts'][]> {
  const db = await getLocalDB();
  const allContacts = await db.getAll('contacts');
  
  return allContacts
    .filter(c => c.lastInteraction)
    .sort((a, b) => (b.lastInteraction || 0) - (a.lastInteraction || 0))
    .slice(0, limit);
}

export async function getFavoriteContacts(): Promise<LocalDatabase['contacts'][]> {
  const db = await getLocalDB();
  return db.query('contacts', 'isFavorite', 1);
}

export async function updateContactInteraction(contactId: string): Promise<void> {
  const db = await getLocalDB();
  const contact = await db.get('contacts', contactId);
  
  if (contact) {
    contact.lastInteraction = Date.now();
    await db.set('contacts', contact);
  }
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

/**
 * Get battery information on Capacitor platform
 * Uses the Device plugin to get battery information
 * @returns Battery information or null if not available
 */
export async function getBatteryInfo(): Promise<{ batteryLevel?: number; charging?: boolean } | null> {
  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getBatteryInfo();
    
    return {
      batteryLevel: Math.round((info.batteryLevel || 0) * 100), // Convert to percentage
      charging: info.isCharging || false
    };
  } catch (error) {
    warn('[platform/capacitor] Battery info not available:', error);
    return null;
  }
}
