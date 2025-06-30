import { BaseRepository } from './base-repository';
import { StorageManagerV2 as StorageManager } from '@/platform/storage/storage-manager-v2';
import { contactService } from '@/services/contact-service';
import { contactSchema } from '@/platform/validators/schemas-zod';
import { safeMerge } from '@/utils/merge-helpers';
import { loadPlatform } from '@/platform';
import type { Contact } from '@/types';
import { isApiSuccess } from '@/utils/api-utils';
import type { LocalContact } from '@/platform/local-db/local-db-types';

type LC = LocalContact;

function toCore(contact: LC): Contact {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    initial: contact.name.charAt(0).toUpperCase(),
  };
}

function toLocal(contact: Contact, meta: Partial<LC> = {}): LC {
  return safeMerge({} as LC, { ...contact, ...meta }, contactSchema) as LC;
}


export class ContactRepository extends BaseRepository<'contacts'> {
  constructor(storageManager: StorageManager) {
    super(storageManager, 'contacts');
  }

  async listLocal(): Promise<Contact[]> {
    const records = (await this.storageManager.local.getAll('contacts')) as LC[];
    return records.map(toCore);
  }

  // If the user logs in on another device, adds/edits contacts there, or if we later add a web dashboard
  // this will sync the contacts to the local storage
  // But this will require modification to the backend structure to get not only hashes, but name & actual phone
  async refreshRemote(): Promise<Contact[]> {
    const response = await contactService.getContacts();
    if (!isApiSuccess(response) || !response.data) return [];
    const platform = await loadPlatform();
    for (const c of response.data.items) {
      const phoneHash = c.phone ? await platform.ContactHelpers.hashPhoneNumber(c.phone) : '';
      const local = safeMerge({} as LC, {
        ...c,
        phoneHash,
        initial: c.name.charAt(0).toUpperCase(),
        lastInteraction: Date.now(),
        isFavorite: false,
        syncedAt: Date.now(),
      }, contactSchema) as LC;
      await this.storageManager.local.set('contacts', local);
    }
    return response.data.items;
  }

  /**
   * Bulk add contacts (local-first)
   */
  async addMany(contactsInput: Array<Omit<Contact, 'id' | 'initial'>>): Promise<Contact[]> {
    if (!contactsInput.length) return [];
    const platform = await loadPlatform();

    const newContacts: LC[] = [];
    for (const c of contactsInput) {
      newContacts.push(safeMerge({} as LC, {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: c.name,
        phone: c.phone,
        phoneHash: c.phone ? await platform.ContactHelpers.hashPhoneNumber(c.phone) : '',
        email: c.email || undefined,
        initial: c.name.charAt(0).toUpperCase(),
        isFavorite: false,
        lastInteraction: Date.now(),
        syncedAt: Date.now(),
      }, contactSchema) as LC);
    }

    // Atomic write
    await this.executeInTransaction(async (tx) => {
      for (const nc of newContacts) {
        await tx.set('contacts', nc);
      }
    });

    // Queue one bulk sync item
    await this.queueForSync('create', newContacts);

    return newContacts.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      initial: c.name.charAt(0).toUpperCase(),
    }));
  }

  /** Bulk update contacts */
  async updateMany(updates: { id: string; fields: Partial<Contact> }[]): Promise<Contact[]> {
    if (!updates.length) return [];
    const platform = await loadPlatform();
    const updated: any[] = [];

    await this.executeInTransaction(async (tx) => {
      for (const upd of updates) {
        const existing: any = await tx.get('contacts', upd.id);
        if (!existing) continue;
        const merged = safeMerge(existing, {
          ...existing,
          ...upd.fields,
          initial: (upd.fields.name ?? existing.name).charAt(0).toUpperCase(),
          phoneHash: upd.fields.phone ? await platform.ContactHelpers.hashPhoneNumber(upd.fields.phone) : existing.phoneHash,
          syncedAt: Date.now(),
        }, contactSchema) as LC;
        await tx.set('contacts', merged);
        updated.push(merged);
      }
    });

    if (updated.length) await this.queueForSync('update', updated);
    return updated as Contact[];
  }

  /** Bulk remove contacts */
  async removeMany(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.executeInTransaction(async (tx) => {
      for (const id of ids) {
        await tx.delete('contacts', id);
      }
    });
    await this.queueForSync('delete', ids);
  }

  // ---------------------------------------------------------------------------
  // Single-item convenience wrappers (preserve existing API)
  // ---------------------------------------------------------------------------
  async add(contact: Omit<Contact, 'id' | 'initial'>): Promise<Contact> {
    const created = await this.addMany([contact]);
    return created[0];
  }

  async update(id: string, updates: Partial<Contact>): Promise<Contact> {
    const updated = await this.updateMany([{ id, fields: updates }]);
    if (!updated.length) throw new Error('Contact not found');
    return updated[0];
  }

  async remove(id: string): Promise<void> {
    await this.removeMany([id]);
  }
}
