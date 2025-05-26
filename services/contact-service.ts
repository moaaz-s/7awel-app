// services/contact-service.ts
import { httpClient } from "@/services/http-client";
import { handleError, respondOk, isApiSuccess } from "@/utils/api-utils";
import { error as logError, info } from "@/utils/logger";
import type { ApiResponse, Paginated, Contact } from "@/types";
import { ErrorCode } from "@/types/errors";
import { getStorageManager, SyncStrategy } from "@/services/storage-manager";
import { loadPlatform } from "@/platform";

const BASE_PATH = "/contacts";

// Extended type for paginated response with total
interface PaginatedWithTotal<T> extends Paginated<T> {
  total: number;
  page: number;
  limit: number;
  nextCursor: string | null;
}

export const contactService = {
  /** List contacts with pagination - uses local-first approach */
  async getContacts(page?: number, limit?: number): Promise<ApiResponse<PaginatedWithTotal<Contact>>> {
    try {
      const storage = getStorageManager();
      const platform = await loadPlatform();
      
      // First, try to get from local storage
      const localContacts = await storage.local.getAll('contacts');
      
      // Apply pagination locally
      const startIndex = (page || 0) * (limit || 10);
      const endIndex = startIndex + (limit || 10);
      const paginatedContacts = localContacts.slice(startIndex, endIndex);
      
      // Convert to Contact type (mapping from LocalDatabase contact type)
      const contacts: Contact[] = paginatedContacts.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        initial: c.name.charAt(0).toUpperCase()
      }));
      
      const result: PaginatedWithTotal<Contact> = {
        items: contacts,
        total: localContacts.length,
        page: page || 0,
        limit: limit || 10,
        nextCursor: endIndex < localContacts.length ? String(endIndex) : null
      };
      
      // Trigger background sync if needed
      const syncHelpers = platform.SyncHelpers;
      const localDB = await platform.getLocalDB();
      if (await syncHelpers.needsSync(localDB, 'contacts')) {
        // Don't await - let it run in background
        storage.hybrid.sync('contacts', BASE_PATH, SyncStrategy.MERGE).catch(e => 
          logError("[contactService] Background sync failed:", e)
        );
      }
      
      return respondOk(result);
    } catch (e) {
      logError("[contactService] getContacts failed:", e);
      return handleError("Failed to fetch contacts", e as any);
    }
  },

  /** Sync contacts by hashed phone numbers */
  async syncContacts(hashedPhones: string[]): Promise<ApiResponse<{ success: boolean }>> {
    if (!Array.isArray(hashedPhones)) return handleError("Hashed phones array is required", ErrorCode.VALIDATION_ERROR);
    try {
      info(`[contactService] Syncing ${hashedPhones.length} hashed phone numbers`);
      const storage = getStorageManager();
      
      // Send hashed phones to server to get matching users
      const response = await httpClient.post<ApiResponse<{ matchedUsers: string[] }>>(`${BASE_PATH}/sync`, { phones: hashedPhones });
      
      if (isApiSuccess(response) && response.data) {
        // Update local contacts with hasAccount status
        const localContacts = await storage.local.getAll('contacts');
        const matchedHashes = new Set(response.data.matchedUsers);
        
        for (const contact of localContacts) {
          const wasMatched = contact.hasAccount;
          const isMatched = matchedHashes.has(contact.phoneHash);
          
          if (wasMatched !== isMatched) {
            contact.hasAccount = isMatched;
            contact.syncedAt = Date.now();
            await storage.local.set('contacts', contact);
          }
        }
        
        info(`[contactService] Synced ${localContacts.length} contacts, ${matchedHashes.size} have accounts`);
      }
      
      return respondOk({ success: true });
    } catch (e) {
      logError("[contactService] syncContacts failed:", e);
      return handleError("Failed to sync contacts", e as any);
    }
  },

  /** Get recent contacts whom the user interacted with - local-first */
  async getRecentContacts(): Promise<ApiResponse<Contact[]>> {
    try {
      const storage = getStorageManager();
      const platform = await loadPlatform();
      
      // Get from local storage using helper
      const recentContacts = await platform.getRecentContacts(10);
      
      // Convert to Contact type
      const contacts: Contact[] = recentContacts.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        initial: c.name.charAt(0).toUpperCase()
      }));
      
      return respondOk(contacts);
    } catch (e) {
      logError("[contactService] getRecentContacts failed:", e);
      return handleError("Failed to fetch recent contacts", e as any);
    }
  },

  /** Record interaction with a contact - updates local storage immediately */
  async recordInteraction(contactId: string): Promise<ApiResponse<{ success: boolean }>> {
    if (!contactId) return handleError("Contact ID is required", ErrorCode.VALIDATION_ERROR);
    try {
      const storage = getStorageManager();
      const contact = await storage.local.get('contacts', contactId);
      
      if (!contact) {
        return handleError("Contact not found", ErrorCode.NOT_FOUND);
      }
      
      // Update interaction timestamp locally
      contact.lastInteraction = Date.now();
      await storage.local.set('contacts', contact);
      
      // Fire-and-forget remote update
      httpClient.post<void>(`${BASE_PATH}/${contactId}/interaction`, {}).catch(e => 
        logError("[contactService] Remote interaction update failed:", e)
      );
      
      return respondOk({ success: true });
    } catch (e) {
      logError("[contactService] recordInteraction failed:", e);
      return handleError("Failed to record interaction", e as any);
    }
  },
  
  /** Get favorite contacts - local storage */
  async getFavoriteContacts(): Promise<ApiResponse<Contact[]>> {
    try {
      const storage = getStorageManager();
      const platform = await loadPlatform();
      
      // Get from local storage
      const favoriteContacts = await platform.getFavoriteContacts();
      
      // Convert to Contact type
      const contacts: Contact[] = favoriteContacts.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        initial: c.name.charAt(0).toUpperCase()
      }));
      
      return respondOk(contacts);
    } catch (e) {
      logError("[contactService] getFavoriteContacts failed:", e);
      return handleError("Failed to fetch favorite contacts", e as any);
    }
  },
  
  /** Toggle favorite status for a contact */
  async toggleFavorite(contactId: string): Promise<ApiResponse<{ success: boolean }>> {
    if (!contactId) return handleError("Contact ID is required", ErrorCode.VALIDATION_ERROR);
    try {
      const storage = getStorageManager();
      const contact = await storage.local.get('contacts', contactId);
      
      if (!contact) {
        return handleError("Contact not found", ErrorCode.NOT_FOUND);
      }
      
      // Toggle favorite status locally
      contact.isFavorite = !contact.isFavorite;
      contact.syncedAt = Date.now();
      await storage.local.set('contacts', contact);
      
      info(`[contactService] Toggled favorite for contact ${contactId}: ${contact.isFavorite}`);
      
      // Fire-and-forget remote update
      httpClient.put<void>(`${BASE_PATH}/${contactId}/favorite`, { 
        isFavorite: contact.isFavorite 
      }).catch(e => 
        logError("[contactService] Remote favorite update failed:", e)
      );
      
      return respondOk({ success: true });
    } catch (e) {
      logError("[contactService] toggleFavorite failed:", e);
      return handleError("Failed to toggle favorite", e as any);
    }
  },
  
  /** Import contacts from device - mobile only */
  async importDeviceContacts(): Promise<ApiResponse<number>> {
    try {
      const platform = await loadPlatform();
      const storage = getStorageManager();
      
      // Check if we're on mobile - use platform-specific check
      if ('isNative' in platform && !platform.isNative) {
        return handleError("Device contacts are only available on mobile", ErrorCode.VALIDATION_ERROR);
      }
      
      // Dynamic import for Capacitor contacts plugin
      const { Contacts } = await import('@capacitor/contacts' as any);
      const permission = await Contacts.requestPermissions();
      
      if (permission.contacts !== 'granted') {
        return handleError("Contact permission denied", ErrorCode.VALIDATION_ERROR);
      }
      
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true
        }
      });
      
      // Process and store contacts
      const contactHelpers = platform.ContactHelpers;
      const deviceContacts = result.contacts.map((c: any) => ({
        name: c.name?.display || 'Unknown',
        phoneNumbers: c.phones?.map((p: any) => p.number || '').filter(Boolean) || []
      }));
      
      // Get remote user hashes (would come from API)
      const remoteUserHashes = new Set<string>(); // TODO: Fetch from API
      
      // Match and store contacts
      const localDB = await platform.getLocalDB();
      const matchedContacts = await contactHelpers.matchContacts(
        localDB,
        deviceContacts,
        remoteUserHashes
      );
      
      info(`[contactService] Imported ${matchedContacts.length} contacts from device`);
      
      return respondOk(matchedContacts.length);
    } catch (e) {
      logError("[contactService] importDeviceContacts failed:", e);
      return handleError("Failed to import device contacts", e as any);
    }
  }
};
