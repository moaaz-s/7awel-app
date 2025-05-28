import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { setItem, getItem, removeItem, _resetImpl } from '@/utils/secure-storage';
import { info } from '@/utils/logger';
import { loadPlatform } from '@/platform/index';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  info: vi.fn()
}));

vi.mock('@/platform/index', () => ({
  loadPlatform: vi.fn()
}));

describe('Secure Storage', () => {
  const mockImpl = {
    secureStoreSet: vi.fn().mockImplementation(() => Promise.resolve()),
    secureStoreGet: vi.fn().mockImplementation(() => Promise.resolve(null)),
    secureStoreRemove: vi.fn().mockImplementation(() => Promise.resolve())
  };

  beforeEach(() => {
    vi.clearAllMocks();
    _resetImpl(); // Reset the cached implementation
    // Reset the platform loader mock
    (loadPlatform as any).mockResolvedValue(mockImpl);
  });

  describe('setItem', () => {
    it('should call secureStoreSet with correct parameters', async () => {
      const key = 'test-key';
      const value = 'test-value';
      
      await setItem(key, value);
      
      expect(mockImpl.secureStoreSet).toHaveBeenCalledWith(key, value);
      expect(info).toHaveBeenCalledWith(
        '[secure-storage] setItem called. key=test-key, value=test-value, impl=spy'
      );
    });

    it('should handle errors from secureStoreSet', async () => {
      const error = new Error('Storage error');
      mockImpl.secureStoreSet.mockRejectedValueOnce(error);
      
      await expect(setItem('key', 'value')).rejects.toThrow('Storage error');
    });
  });

  describe('getItem', () => {
    it('should return value from secureStoreGet', async () => {
      const expectedValue = 'test-value';
      mockImpl.secureStoreGet.mockResolvedValueOnce(expectedValue);
      
      const result = await getItem('test-key');
      
      expect(result).toBe(expectedValue);
    });

    it('should return null when secureStoreGet returns null', async () => {
      mockImpl.secureStoreGet.mockResolvedValueOnce(null);
      
      const result = await getItem('test-key');
      
      expect(result).toBeNull();
    });

    it('should handle errors from secureStoreGet', async () => {
      const error = new Error('Storage error');
      mockImpl.secureStoreGet.mockRejectedValueOnce(error);
      
      await expect(getItem('key')).rejects.toThrow('Storage error');
    });
  });

  describe('removeItem', () => {
    it('should call secureStoreRemove when available', async () => {
      const key = 'test-key';
      
      await removeItem(key);
      
      expect(mockImpl.secureStoreRemove).toHaveBeenCalledWith(key);
      expect(info).toHaveBeenCalledWith(
        '[secure-storage] removeItem called. key=test-key'
      );
    });

    it('should fallback to secureStoreSet with empty string when secureStoreRemove is not available', async () => {
      const key = 'test-key';
      const implWithoutRemove = {
        secureStoreSet: vi.fn().mockImplementation(() => Promise.resolve()),
        secureStoreGet: vi.fn().mockImplementation(() => Promise.resolve(null))
      };
      _resetImpl(); // Reset before changing implementation
      (loadPlatform as any).mockResolvedValueOnce(implWithoutRemove);
      
      await removeItem(key);
      
      expect(implWithoutRemove.secureStoreSet).toHaveBeenCalledWith(key, '');
      expect(info).toHaveBeenCalledWith(
        '[secure-storage] removeItem called. key=test-key'
      );
    });

    it('should handle errors from secureStoreRemove', async () => {
      const error = new Error('Storage error');
      const mockRemove = mockImpl.secureStoreRemove as Mock;
      mockRemove.mockRejectedValueOnce(error);
      
      await expect(removeItem('key')).rejects.toThrow('Storage error');
    });

    it('should handle errors from fallback secureStoreSet', async () => {
      const error = new Error('Storage error');
      const implWithoutRemove = {
        secureStoreSet: vi.fn().mockRejectedValueOnce(error),
        secureStoreGet: vi.fn().mockImplementation(() => Promise.resolve(null))
      };
      _resetImpl(); // Reset before changing implementation
      (loadPlatform as any).mockResolvedValueOnce(implWithoutRemove);
      
      await expect(removeItem('key')).rejects.toThrow('Storage error');
    });
  });

  describe('Platform Loading', () => {
    it('should cache platform implementation', async () => {
      // First call should load the platform
      await setItem('key1', 'value1');
      expect(loadPlatform).toHaveBeenCalledTimes(1);

      // Second call should use cached implementation
      await setItem('key2', 'value2');
      expect(loadPlatform).toHaveBeenCalledTimes(1);
    });

    it('should handle platform loading errors', async () => {
      const error = new Error('Platform loading error');
      _resetImpl(); // Reset before changing implementation
      (loadPlatform as any).mockRejectedValueOnce(error);

      await expect(setItem('key', 'value')).rejects.toThrow('Platform loading error');
      expect(loadPlatform).toHaveBeenCalledTimes(1);
    });

    it('should retry platform loading after error', async () => {
      const error = new Error('Platform loading error');
      _resetImpl(); // Reset before changing implementation
      (loadPlatform as any)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockImpl);

      // First call should fail
      await expect(setItem('key1', 'value1')).rejects.toThrow('Platform loading error');

      // Second call should succeed
      await setItem('key2', 'value2');
      expect(loadPlatform).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple platform loading errors', async () => {
      const error = new Error('Platform loading error');
      _resetImpl(); // Reset before changing implementation
      (loadPlatform as any)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);
      
      // First attempt
      await expect(setItem('key1', 'value1')).rejects.toThrow('Platform loading error');

      // Second attempt
      await expect(setItem('key2', 'value2')).rejects.toThrow('Platform loading error');

      expect(loadPlatform).toHaveBeenCalledTimes(2);
    });
  });
}); 