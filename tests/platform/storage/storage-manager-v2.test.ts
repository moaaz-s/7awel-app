// tests/platform/storage/storage-manager-v2.test.ts
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { StorageManagerV2 } from '@/platform/storage/storage-manager-v2';
import * as logger from '@/utils/logger';

// Mock dependencies
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    keys: vi.fn(),
  },
}));

vi.mock('@/utils/logger');

describe('StorageManagerV2', () => {
  let storageManager: StorageManagerV2;
  let mockPreferences: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get mock instance
    const { Preferences } = require('@capacitor/preferences');
    mockPreferences = Preferences;
    
    // Setup default successful responses
    mockPreferences.set.mockResolvedValue(undefined);
    mockPreferences.get.mockResolvedValue({ value: null });
    mockPreferences.remove.mockResolvedValue(undefined);
    mockPreferences.clear.mockResolvedValue(undefined);
    mockPreferences.keys.mockResolvedValue({ keys: [] });

    storageManager = StorageManagerV2.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = StorageManagerV2.getInstance();
      const instance2 = StorageManagerV2.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(StorageManagerV2);
    });
  });

  describe('Basic Storage Operations', () => {
    describe('set', () => {
      it('should store string values successfully', async () => {
        const key = 'test-key';
        const value = 'test-value';

        const result = await storageManager.set(key, value);

        expect(result).toBe(true);
        expect(mockPreferences.set).toHaveBeenCalledWith({
          key,
          value: JSON.stringify(value),
        });
      });

      it('should store object values successfully', async () => {
        const key = 'user-data';
        const value = { id: '123', name: 'Test User' };

        const result = await storageManager.set(key, value);

        expect(result).toBe(true);
        expect(mockPreferences.set).toHaveBeenCalledWith({
          key,
          value: JSON.stringify(value),
        });
      });

      it('should store array values successfully', async () => {
        const key = 'transactions';
        const value = [{ id: '1' }, { id: '2' }];

        const result = await storageManager.set(key, value);

        expect(result).toBe(true);
        expect(mockPreferences.set).toHaveBeenCalledWith({
          key,
          value: JSON.stringify(value),
        });
      });

      it('should handle null and undefined values', async () => {
        await storageManager.set('null-key', null);
        await storageManager.set('undefined-key', undefined);

        expect(mockPreferences.set).toHaveBeenCalledWith({
          key: 'null-key',
          value: JSON.stringify(null),
        });
        expect(mockPreferences.set).toHaveBeenCalledWith({
          key: 'undefined-key',
          value: JSON.stringify(undefined),
        });
      });

      it('should handle storage errors gracefully', async () => {
        const error = new Error('Storage quota exceeded');
        mockPreferences.set.mockRejectedValue(error);

        const result = await storageManager.set('key', 'value');

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
          '[StorageManagerV2] Failed to set key:',
          error
        );
      });
    });

    describe('get', () => {
      it('should retrieve stored values successfully', async () => {
        const key = 'test-key';
        const storedValue = { id: '123', name: 'Test' };
        
        mockPreferences.get.mockResolvedValue({
          value: JSON.stringify(storedValue),
        });

        const result = await storageManager.get(key);

        expect(result).toEqual(storedValue);
        expect(mockPreferences.get).toHaveBeenCalledWith({ key });
      });

      it('should return null for non-existent keys', async () => {
        mockPreferences.get.mockResolvedValue({ value: null });

        const result = await storageManager.get('non-existent-key');

        expect(result).toBeNull();
      });

      it('should handle invalid JSON gracefully', async () => {
        mockPreferences.get.mockResolvedValue({ value: 'invalid-json{' });

        const result = await storageManager.get('corrupted-key');

        expect(result).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(
          '[StorageManagerV2] Failed to parse JSON for key corrupted-key:',
          expect.any(Error)
        );
      });

      it('should handle storage retrieval errors', async () => {
        const error = new Error('Storage access denied');
        mockPreferences.get.mockRejectedValue(error);

        const result = await storageManager.get('error-key');

        expect(result).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(
          '[StorageManagerV2] Failed to get key:',
          error
        );
      });
    });

    describe('remove', () => {
      it('should remove keys successfully', async () => {
        const result = await storageManager.remove('test-key');

        expect(result).toBe(true);
        expect(mockPreferences.remove).toHaveBeenCalledWith({ key: 'test-key' });
      });

      it('should handle removal errors gracefully', async () => {
        const error = new Error('Key not found');
        mockPreferences.remove.mockRejectedValue(error);

        const result = await storageManager.remove('error-key');

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
          '[StorageManagerV2] Failed to remove key:',
          error
        );
      });
    });

    describe('clear', () => {
      it('should clear all storage successfully', async () => {
        const result = await storageManager.clear();

        expect(result).toBe(true);
        expect(mockPreferences.clear).toHaveBeenCalled();
      });

      it('should handle clear errors gracefully', async () => {
        const error = new Error('Permission denied');
        mockPreferences.clear.mockRejectedValue(error);

        const result = await storageManager.clear();

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
          '[StorageManagerV2] Failed to clear storage:',
          error
        );
      });
    });

    describe('has', () => {
      it('should return true for existing keys', async () => {
        mockPreferences.get.mockResolvedValue({ value: 'some-value' });

        const result = await storageManager.has('existing-key');

        expect(result).toBe(true);
      });

      it('should return false for non-existent keys', async () => {
        mockPreferences.get.mockResolvedValue({ value: null });

        const result = await storageManager.has('non-existent-key');

        expect(result).toBe(false);
      });

      it('should handle errors as non-existent', async () => {
        mockPreferences.get.mockRejectedValue(new Error('Access error'));

        const result = await storageManager.has('error-key');

        expect(result).toBe(false);
      });
    });

    describe('keys', () => {
      it('should return all storage keys', async () => {
        const mockKeys = ['key1', 'key2', 'key3'];
        mockPreferences.keys.mockResolvedValue({ keys: mockKeys });

        const result = await storageManager.keys();

        expect(result).toEqual(mockKeys);
        expect(mockPreferences.keys).toHaveBeenCalled();
      });

      it('should handle keys retrieval errors', async () => {
        const error = new Error('Keys access failed');
        mockPreferences.keys.mockRejectedValue(error);

        const result = await storageManager.keys();

        expect(result).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
          '[StorageManagerV2] Failed to get keys:',
          error
        );
      });
    });
  });

  describe('Batch Operations', () => {
    describe('setMultiple', () => {
      it('should set multiple key-value pairs successfully', async () => {
        const data = {
          'key1': 'value1',
          'key2': { id: 2 },
          'key3': [1, 2, 3],
        };

        const result = await storageManager.setMultiple(data);

        expect(result).toBe(true);
        expect(mockPreferences.set).toHaveBeenCalledTimes(3);
        expect(mockPreferences.set).toHaveBeenCalledWith({
          key: 'key1',
          value: JSON.stringify('value1'),
        });
      });

      it('should handle partial failures in batch operations', async () => {
        const data = { 'key1': 'value1', 'key2': 'value2' };
        
        // First call succeeds, second fails
        mockPreferences.set
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Storage full'));

        const result = await storageManager.setMultiple(data);

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('getMultiple', () => {
      it('should get multiple values successfully', async () => {
        const keys = ['key1', 'key2', 'key3'];
        const values = ['value1', { id: 2 }, null];

        mockPreferences.get
          .mockResolvedValueOnce({ value: JSON.stringify(values[0]) })
          .mockResolvedValueOnce({ value: JSON.stringify(values[1]) })
          .mockResolvedValueOnce({ value: null });

        const result = await storageManager.getMultiple(keys);

        expect(result).toEqual({
          'key1': 'value1',
          'key2': { id: 2 },
          'key3': null,
        });
      });

      it('should handle errors in batch retrieval', async () => {
        const keys = ['key1', 'key2'];
        
        mockPreferences.get
          .mockResolvedValueOnce({ value: JSON.stringify('value1') })
          .mockRejectedValueOnce(new Error('Access denied'));

        const result = await storageManager.getMultiple(keys);

        expect(result).toEqual({
          'key1': 'value1',
          'key2': null,
        });
      });
    });

    describe('removeMultiple', () => {
      it('should remove multiple keys successfully', async () => {
        const keys = ['key1', 'key2', 'key3'];

        const result = await storageManager.removeMultiple(keys);

        expect(result).toBe(true);
        expect(mockPreferences.remove).toHaveBeenCalledTimes(3);
      });

      it('should handle partial failures in batch removal', async () => {
        const keys = ['key1', 'key2'];
        
        mockPreferences.remove
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Key not found'));

        const result = await storageManager.removeMultiple(keys);

        expect(result).toBe(false);
      });
    });
  });

  describe('Data Migration and Compatibility', () => {
    describe('migrateFromLegacyStorage', () => {
      it('should migrate data from old storage format', async () => {
        // Mock legacy data
        const legacyKeys = ['old_user_data', 'old_settings'];
        const legacyData = {
          'old_user_data': { id: '123', name: 'User' },
          'old_settings': { theme: 'dark' },
        };

        mockPreferences.keys.mockResolvedValue({ keys: legacyKeys });
        mockPreferences.get
          .mockResolvedValueOnce({ value: JSON.stringify(legacyData.old_user_data) })
          .mockResolvedValueOnce({ value: JSON.stringify(legacyData.old_settings) });

        const result = await storageManager.migrateFromLegacyStorage();

        expect(result.success).toBe(true);
        expect(result.migratedCount).toBe(2);
        
        // Should set new keys without the 'old_' prefix
        expect(mockPreferences.set).toHaveBeenCalledWith({
          key: 'user_data',
          value: JSON.stringify(legacyData.old_user_data),
        });
        expect(mockPreferences.set).toHaveBeenCalledWith({
          key: 'settings',
          value: JSON.stringify(legacyData.old_settings),
        });
      });

      it('should handle migration errors gracefully', async () => {
        mockPreferences.keys.mockRejectedValue(new Error('Migration failed'));

        const result = await storageManager.migrateFromLegacyStorage();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Migration failed');
      });
    });
  });

  describe('Storage Size and Limits', () => {
    describe('getStorageInfo', () => {
      it('should return storage information', async () => {
        const mockKeys = ['key1', 'key2', 'key3'];
        const mockValues = ['value1', 'value2', 'value3'];

        mockPreferences.keys.mockResolvedValue({ keys: mockKeys });
        mockPreferences.get
          .mockResolvedValueOnce({ value: JSON.stringify(mockValues[0]) })
          .mockResolvedValueOnce({ value: JSON.stringify(mockValues[1]) })
          .mockResolvedValueOnce({ value: JSON.stringify(mockValues[2]) });

        const info = await storageManager.getStorageInfo();

        expect(info.keyCount).toBe(3);
        expect(info.estimatedSize).toBeGreaterThan(0);
        expect(info.keys).toEqual(mockKeys);
      });

      it('should handle storage info errors', async () => {
        mockPreferences.keys.mockRejectedValue(new Error('Access denied'));

        const info = await storageManager.getStorageInfo();

        expect(info.keyCount).toBe(0);
        expect(info.estimatedSize).toBe(0);
        expect(info.keys).toEqual([]);
        expect(info.error).toBe('Access denied');
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle storage corruption scenarios', async () => {
      // Simulate corrupted storage
      mockPreferences.get.mockImplementation(async ({ key }) => {
        if (key === 'corrupted-key') {
          return { value: '{"incomplete": json' }; // Invalid JSON
        }
        return { value: null };
      });

      const result = await storageManager.get('corrupted-key');
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse JSON'),
        expect.any(Error)
      );
    });

    it('should handle concurrent access gracefully', async () => {
      const key = 'concurrent-key';
      const value1 = 'value1';
      const value2 = 'value2';

      // Simulate concurrent operations
      const promise1 = storageManager.set(key, value1);
      const promise2 = storageManager.set(key, value2);

      const results = await Promise.all([promise1, promise2]);

      // Both operations should complete without errors
      expect(results).toEqual([true, true]);
      expect(mockPreferences.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('Platform Compatibility', () => {
    it('should work consistently across platforms', async () => {
      // This test ensures the same API works regardless of platform
      const testData = {
        string: 'test',
        number: 123,
        boolean: true,
        object: { nested: { value: 'deep' } },
        array: [1, 2, { item: 'value' }],
        null: null,
        undefined: undefined,
      };

      // Test all data types
      for (const [key, value] of Object.entries(testData)) {
        const setResult = await storageManager.set(key, value);
        expect(setResult).toBe(true);
      }

      // Verify storage calls were made correctly
      expect(mockPreferences.set).toHaveBeenCalledTimes(Object.keys(testData).length);
    });
  });
}); 