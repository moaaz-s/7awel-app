// User Repository

import { BaseRepository } from './base-repository';
import { LocalDatabase } from '../../local-db/local-db-types';
import { StorageManager } from '../../../services/storage-manager';
import { ProfileHelpers } from '../../local-db/local-db-common';
import { userService } from '@/services/user-service';
import { ApiResponse } from '@/types';

export class UserRepository extends BaseRepository<'userProfile'> {
  constructor(storageManager: StorageManager) {
    super(storageManager, 'userProfile', {
      conflictResolution: {
        strategy: 'merge',
        resolver: (local, remote) => ({
          ...remote,
          // Preserve local preferences that shouldn't be overwritten
          lastUpdated: Math.max(local.lastUpdated, remote.lastUpdated)
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
        this.refreshFromRemote().catch(console.error);
      }
      
      return localProfile;
    }
    
    // No local profile, fetch from remote
    return this.refreshFromRemote();
  }
  
  /**
   * Save user profile with atomic transaction
   */
  async saveProfile(profile: Partial<LocalDatabase['userProfile']>): Promise<LocalDatabase['userProfile']> {
    return this.executeInTransaction(async (tx) => {
      // Get current profile within transaction
      const currentProfile = await tx.get('userProfile', 'user');
      
      // Merge profiles
      const mergedProfile: LocalDatabase['userProfile'] = {
        id: currentProfile?.id || 'user',
        firstName: profile.firstName || currentProfile?.firstName || '',
        lastName: profile.lastName || currentProfile?.lastName || '',
        email: profile.email || currentProfile?.email || '',
        phone: profile.phone || currentProfile?.phone || '',
        avatar: profile.avatar || currentProfile?.avatar,
        country: profile.country || currentProfile?.country,
        address: profile.address || currentProfile?.address,
        dateOfBirth: profile.dateOfBirth || currentProfile?.dateOfBirth,
        gender: profile.gender || currentProfile?.gender,
        lastUpdated: Date.now()
      };
      
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
      const response = await userService.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar,
        country: profile.country,
        address: profile.address,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender
      });
      
      if (!response.success) {
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
  private async shouldRefreshFromRemote(lastUpdated: number): Promise<boolean> {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    return Date.now() - lastUpdated > CACHE_DURATION;
  }
  
  /**
   * Refresh profile from remote API
   */
  private async refreshFromRemote(): Promise<LocalDatabase['userProfile'] | undefined> {
    try {
      const response = await userService.getProfile();
      
      if (response.success && response.data) {
        const profile: LocalDatabase['userProfile'] = {
          id: 'user',
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          avatar: response.data.avatar,
          country: response.data.country,
          address: response.data.address,
          dateOfBirth: response.data.dateOfBirth,
          gender: response.data.gender,
          lastUpdated: Date.now()
        };
        
        // Save to local
        await ProfileHelpers.saveProfile(this.storageManager.local, profile);
        
        return profile;
      }
      
      return undefined;
    } catch (error) {
      console.error('Failed to refresh profile from remote:', error);
      return undefined;
    }
  }
}
