// platform/local-db-common.ts
// Common database logic shared between platforms

import { 
  LocalDatabase, 
  LocalDatabaseManager,
  StoreName,
  TransactionContext
} from './local-db-types';
import { parsePhoneNumberWithError, CountryCode } from 'libphonenumber-js';
import { createValidators } from '../validators/schemas-zod';

// Create validators with a fallback translation function
// In production, this would use the actual translation function from context
const validators = createValidators((key: string) => key);

/**
 * Abstract base class for local database implementations
 */
export abstract class BaseLocalDatabaseManager implements LocalDatabaseManager {
  protected isInitialized = false;
  
  abstract init(): Promise<void>;
  abstract get<T extends StoreName>(storeName: T, key: string): Promise<LocalDatabase[T] | undefined>;
  abstract getAll<T extends StoreName>(storeName: T): Promise<LocalDatabase[T][]>;
  abstract set<T extends StoreName>(storeName: T, value: LocalDatabase[T]): Promise<void>;
  abstract delete<T extends StoreName>(storeName: T, key: string): Promise<void>;
  abstract clear<T extends StoreName>(storeName: T): Promise<void>;
  abstract query?<T extends StoreName>(storeName: T, index: string, value: any): Promise<LocalDatabase[T][]>;
  abstract transaction<R>(
    storeNames: StoreName[], 
    mode: 'readonly' | 'readwrite',
    callback: (tx: TransactionContext) => Promise<R>
  ): Promise<R>;
  
  protected async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}

/**
 * Common helper functions for contact management
 */
export class ContactHelpers {
  /**
   * Hash a phone number for privacy-preserving comparisons
   * Uses SHA-256 for production-grade security
   */
  static async hashPhoneNumber(phoneNumber: string): Promise<string> {
    // Use Web Crypto API for SHA-256 hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(phoneNumber);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
  
  /**
   * Normalize a phone number to E.164 format
   */
  static normalizePhoneNumber(phoneNumber: string, defaultCountry: string = 'US'): string | null {
    try {
      const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry as CountryCode);
      return parsed.format('E.164');
    } catch (error) {
      // Invalid phone number
      return null;
    }
  }

  /**
   * Resolve display name from phone hash using local contacts
   * Returns name if found, phone number if available, or fallback text
   */
  static resolveDisplayName(
    phoneHash: string | undefined, 
    contacts: Array<{ phoneHash: string; name: string; phone: string }>,
    fallbackText: string = "Unknown"
  ): string {
    if (!phoneHash || !contacts || contacts.length === 0) {
      return fallbackText;
    }
    
    const contact = contacts.find(c => c.phoneHash === phoneHash);
    if (contact) {
      // Return name if available, otherwise formatted phone number
      return contact.name || ContactHelpers.formatPhoneForDisplay(contact.phone) || fallbackText;
    }
    
    return fallbackText;
  }

  /**
   * Format phone number for display using libphonenumber-js
   * This provides proper international formatting for all countries
   */
  static formatPhoneForDisplay(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    try {
      // Parse the phone number (it should already be in E.164 format)
      const parsed = parsePhoneNumberWithError(phoneNumber);
      
      if (parsed.isValid()) {
        // Return in international format for consistency
        return parsed.formatInternational();
      }
    } catch (error) {
      // If parsing fails, return the original number
      console.warn(`Failed to format phone number: ${phoneNumber}`, error);
    }
    
    // Fallback to original number if parsing fails
    return phoneNumber;
  }
  
  /**
   * Match local device contacts with app users
   */
  static async matchContacts(
    db: LocalDatabaseManager,
    localContacts: Array<{ name: string; phoneNumbers: string[] }>,
    remoteUserHashes: Set<string>
  ): Promise<LocalDatabase['contacts'][]> {
    const matchedContacts: LocalDatabase['contacts'][] = [];
    
    for (const contact of localContacts) {
      for (const phoneNumber of contact.phoneNumbers) {
        const normalized = await ContactHelpers.normalizePhoneNumber(phoneNumber);
        if (!normalized) continue;
        
        const phoneHash = await ContactHelpers.hashPhoneNumber(normalized);
        const hasAccount = remoteUserHashes.has(phoneHash);
        
        const contactData: LocalDatabase['contacts'] = {
          id: `contact_${phoneHash}`,
          name: contact.name,
          phone: normalized,
          phoneHash,
          isFavorite: false,
          syncedAt: Date.now(),
          hasAccount,
          initial: contact.name.charAt(0).toUpperCase()
        };
        
        // Validate contact data
        const validationResult = validators.contact.validate(contactData);
        if (!validationResult.success || !validationResult.data) {
          throw new Error(validationResult.error || 'errors.VALIDATION_FAILED');
        }
        matchedContacts.push(validationResult.data);
        await db.set('contacts', validationResult.data);
      }
    }
    
    return matchedContacts;
  }
}

/**
 * Common functions for managing user profiles
 */
export class ProfileHelpers {
  static async getUserProfile(
    db: LocalDatabaseManager
  ): Promise<LocalDatabase['userProfile'] | undefined> {
    return await db.get('userProfile', 'user');
  }
  
  /**
   * Save or update user profile with validation
   */
  static async saveUserProfile(db: LocalDatabaseManager, profile: LocalDatabase['userProfile']): Promise<void> {
    const validationResult = validators.userProfile.validate(profile);
    if (!validationResult.success || !validationResult.data) {
      throw new Error(validationResult.error || 'errors.VALIDATION_FAILED');
    }
    const validatedProfile = validationResult.data;
    validatedProfile.lastUpdated = Date.now();
    await db.set('userProfile', validatedProfile);
  }
}

/**
 * Common functions for managing transactions
 */
export class TransactionHelpers {
  /**
   * Store recent transaction locally with validation
   */
  static async storeRecentTransaction(
    db: LocalDatabaseManager,
    transaction: LocalDatabase['recentTransactions']
  ): Promise<void> {
    const validationResult = validators.transaction.validate(transaction);
    if (!validationResult.success || !validationResult.data) {
      throw new Error(validationResult.error || 'errors.VALIDATION_FAILED');
    }
    await db.set('recentTransactions', validationResult.data);
  }
  
  /**
   * Get recent transactions (sorted by date, newest first)
   */
  static async getRecentTransactions(
    db: LocalDatabaseManager,
    limit: number = 50
  ): Promise<LocalDatabase['recentTransactions'][]> {
    const allTransactions = await db.getAll('recentTransactions');
    return allTransactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  
  static async addTransaction(
    db: LocalDatabaseManager,
    transaction: LocalDatabase['recentTransactions']
  ): Promise<void> {
    await TransactionHelpers.storeRecentTransaction(db, transaction);
    
    // Keep only the most recent 50 transactions
    const all = await db.getAll('recentTransactions');
    if (all.length > 50) {
      // Sort by createdAt and keep 50 most recent
      const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const toDelete = sorted.slice(50);
      
      // Delete old transactions
      for (const tx of toDelete) {
        await db.delete('recentTransactions', tx.id);
      }
    }
  }
}

/**
 * Common functions for sync metadata
 */
export class SyncHelpers {
  /**
   * Get the last sync timestamp
   */
  static async getLastSyncTime(
    db: LocalDatabaseManager
  ): Promise<number> {
    const metadata = await db.get('syncMetadata', 'sync');
    return metadata?.lastSync || 0;
  }
  
  /**
   * Update sync metadata after successful sync
   */
  static async updateSyncStatus(
    db: LocalDatabaseManager,
    status: 'syncing' | 'synced' | 'error'
  ): Promise<void> {
    const currentMetadata = await db.get('syncMetadata', 'sync');
    const metadata: LocalDatabase['syncMetadata'] = {
      id: 'sync',
      lastSync: status === 'synced' ? Date.now() : (currentMetadata?.lastSync || 0),
      status
    };
    
    const validationResult = validators.syncMetadata.validate(metadata);
    if (!validationResult.success || !validationResult.data) {
      throw new Error(validationResult.error || 'errors.VALIDATION_FAILED');
    }
    await db.set('syncMetadata', validationResult.data);
  }
  
  /**
   * Check if sync is needed based on last sync time
   */
  static async isSyncNeeded(
    db: LocalDatabaseManager,
    maxAgeMs: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<boolean> {
    const metadata = await db.get('syncMetadata', 'sync');
    if (!metadata) return true;
    
    const timeSinceLastSync = Date.now() - metadata.lastSync;
    return timeSinceLastSync > maxAgeMs;
  }
}

/**
 * ContactResolver - Direct access to local contacts without passing them around
 * This eliminates the need to pass contacts as parameters everywhere
 */
export class ContactResolver {
  private static instance: ContactResolver | null = null;
  private contacts: Array<{ phoneHash: string; name: string; phone: string }> = [];
  private initialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ContactResolver {
    if (!this.instance) {
      this.instance = new ContactResolver();
    }
    return this.instance;
  }

  /**
   * Initialize with contacts from local database
   */
  async initialize(db?: LocalDatabaseManager) {
    if (this.initialized) return;

    try {
      // If no db provided, get it from platform
      if (!db) {
        const { loadPlatform } = await import('@/platform');
        const platform = await loadPlatform();
        db = await platform.getLocalDB();
      }

      const contactsData = await db.getAll('contacts');
      this.contacts = contactsData.map(c => ({
        phoneHash: c.phoneHash,
        name: c.name,
        phone: c.phone
      }));
      
      this.initialized = true;
    } catch (error) {
      console.warn('[ContactResolver] Failed to initialize:', error);
      this.contacts = [];
    }
  }

  /**
   * Resolve display name directly without needing to pass contacts
   */
  resolveDisplayName(phoneHash: string | undefined, fallback: string = "Unknown"): string {
    if (!this.initialized) {
      console.warn('[ContactResolver] Not initialized, call initialize() first');
      return "Unknown";
    }

    return ContactHelpers.resolveDisplayName(phoneHash, this.contacts, fallback);
  }

  /**
   * Lookup phone number directly (simplified implementation)
   */
  lookupPhone(phoneHash: string | undefined): string | undefined {
    if (!this.initialized || !phoneHash) return undefined;
    
    const contact = this.contacts.find(c => c.phoneHash === phoneHash);
    return contact?.phone;
  }

  /**
   * Refresh contacts from database (call when contacts are updated)
   */
  async refreshContacts(db?: LocalDatabaseManager) {
    this.initialized = false;
    await this.initialize(db);
  }

  /**
   * Check if contacts are loaded
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get contacts count (for debugging)
   */
  getContactsCount(): number {
    return this.contacts.length;
  }
}

// Export singleton instance for easy access
export const contactResolver = ContactResolver.getInstance();

/**
 * Initialize ContactResolver in your app startup
 * 
 * @example
 * ```typescript
 * // In your app initialization (e.g., main.ts, app.tsx)
 * import { contactResolver } from '@/platform/local-db/local-db-common';
 * 
 * async function initializeApp() {
 *   // Initialize contact resolver with database
 *   await contactResolver.initialize();
 *   
 *   // Check if initialization was successful
 *   if (contactResolver.isInitialized()) {
 *     console.log(`ContactResolver initialized with ${contactResolver.getContactsCount()} contacts`);
 *   }
 * }
 * 
 * // Call when contacts are updated (e.g., in DataContext)
 * async function onContactsUpdated() {
 *   await contactResolver.refreshContacts();
 * }
 * ```
 */
