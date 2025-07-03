// User Repository

import { BaseRepository } from './base-repository';
import { LocalDatabase } from "@/platform/local-db/local-db-types";
import { mergeDefined } from "@/utils/merge-helpers";
import { userProfileSchema } from "@/platform/validators/schemas-zod";
import { StorageManagerV2 as StorageManager } from '../../../platform/storage/storage-manager-v2';
import { ProfileHelpers } from '../../local-db/local-db-common';
import { userService } from '@/services/user-service';
import { ApiResponse } from '@/types';
import { error as logError, info } from '@/utils/logger';
import { USER_REPOSITORY_TTL_MS } from '@/constants/db';
import { isApiSuccess } from '@/utils/api-utils';

export class UserRepository extends BaseRepository<'userProfile'> {
  constructor(storageManager: StorageManager) {
    super(storageManager, 'userProfile', {
      conflictResolution: {
        strategy: 'merge',
        resolver: (local, remote) => ({
          ...remote,
          // Preserve local preferences that shouldn't be overwritten
          lastUpdated: Math.max(local.lastUpdated ?? 0, remote.lastUpdated ?? 0)
        })
      }
    });
  }
  
  /**
   * Get user profile - checks local first, then remote if needed
   */
  async getProfile(): Promise<LocalDatabase['userProfile'] | undefined> {
    // Try local first
    const localProfile = await ProfileHelpers.getUserProfile(this.storageManager.local);
    
    if (localProfile) {
      // Check if we need to refresh from remote
      const shouldRefresh = await this.shouldRefreshFromRemote(localProfile.lastUpdated);
      
      if (shouldRefresh) {
        // Fetch in background, don't block
        this.refreshFromRemote().catch(logError);
      }
      
      return localProfile;
    }
    
    // No local profile, fetch from remote
    return this.refreshFromRemote();
  }
  
  /**
   * Get user profile strictly from local storage (no remote calls)
   */
  async getLocalProfile(): Promise<LocalDatabase['userProfile'] | undefined> {
    return ProfileHelpers.getUserProfile(this.storageManager.local);
  }

  /**
   * Save user profile with atomic transaction
   */
  async saveProfile(profile: Partial<LocalDatabase['userProfile']>): Promise<LocalDatabase['userProfile']> {
    return this.executeInTransaction(async (tx) => {
      // Get current profile within transaction
      const currentProfile = await tx.get('userProfile', 'user');
      
      // Guard: prevent overwriting if profile already complete
      if (currentProfile && currentProfile.firstName && currentProfile.lastName && currentProfile.address) {
        throw new Error("Profile already completed – updates are disabled.");
      }

      // Merge + validate via schema
      const mergedProfile = userProfileSchema.parse(
        mergeDefined<LocalDatabase['userProfile']>(currentProfile ?? { id: 'user' } as any, {
          ...profile,
          lastUpdated: Date.now(),
        })
      );
      
      // Save within transaction
      await tx.set('userProfile', mergedProfile);
      
      // Queue for remote sync
      await this.queueForSync('update', mergedProfile);
      
      return mergedProfile;
    });
  }
  
  /**
   * Delete user profile (for logout)
   */
  async deleteProfile(): Promise<void> {
    await this.storageManager.local.delete('userProfile', 'user');
  }
  
  /**
   * Sync profile to remote API
   */
  async syncToRemote(profile: LocalDatabase['userProfile']): Promise<void> {
    try {
      const { id, lastUpdated, ...payload } = profile;
      const response = await userService.updateUser(payload);
      
      if (response.error) {
        throw new Error(response.error || 'Failed to sync profile');
      }
    } catch (error) {
      console.error('Profile sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Check if we should refresh from remote
   */
  private async shouldRefreshFromRemote(lastUpdated?: number): Promise<boolean> {
    if (!lastUpdated) return true;
    return Date.now() - lastUpdated > USER_REPOSITORY_TTL_MS;
  }
  
  /**
   * Refresh profile from remote API
   */
  private async refreshFromRemote(): Promise<LocalDatabase['userProfile'] | undefined> {
    try {
      const response = await userService.getUser();
      console.log('[UserRepository] API Response:', response);

      if (!isApiSuccess(response)) {
        throw new Error(response.error || 'Unknown error');
      }
      
      if (response.data) {
        const userData = response.data.user;
        const profile = userProfileSchema.parse({
          ...userData,
          id: 'user',
          lastUpdated: Date.now(),
        });
        
        // Save to local storage
        await this.storageManager.local.set('userProfile', profile);
        
        return profile;
      }
      
      return undefined;
    } catch (error) {
      logError('Failed to refresh profile from remote:', error);
      console.error('[UserRepository] Error details:', error);
      return undefined;
    }
  }
}
