import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setItem, getItem, removeItem } from '@/utils/secure-storage';

describe('Secure Storage Integration Tests', () => {
  // Clean up after each test
  afterEach(async () => {
    await removeItem('test-key');
    await removeItem('special-chars-key');
    await removeItem('empty-key');
    await removeItem('long-key');
  });

  describe('Basic Storage Operations', () => {
    it('should store and retrieve value correctly', async () => {
      const key = 'test-key';
      const value = 'test-value';
      
      // Store the value
      await setItem(key, value);
      
      // Retrieve and verify
      const retrieved = await getItem(key);
      expect(retrieved).toBe(value);
    });

    it('should return null for non-existent key', async () => {
      const value = await getItem('non-existent-key');
      expect(value).toBeNull();
    });

    it('should remove item correctly', async () => {
      const key = 'test-key';
      const value = 'test-value';
      
      // Store, remove, then verify it's gone
      await setItem(key, value);
      await removeItem(key);
      const retrieved = await getItem(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in key and value', async () => {
      const key = 'special-chars-key';
      const value = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      
      await setItem(key, value);
      const retrieved = await getItem(key);
      expect(retrieved).toBe(value);
    });

    it('should handle empty string value', async () => {
      const key = 'empty-key';
      const value = '';
      
      await setItem(key, value);
      const retrieved = await getItem(key);
      expect(retrieved).toBe(value);
    });

    it('should handle very long values', async () => {
      const key = 'long-key';
      const value = 'x'.repeat(1000); // 1000 character string
      
      await setItem(key, value);
      const retrieved = await getItem(key);
      expect(retrieved).toBe(value);
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple set operations on same key', async () => {
      const key = 'test-key';
      
      await setItem(key, 'value1');
      await setItem(key, 'value2');
      
      const retrieved = await getItem(key);
      expect(retrieved).toBe('value2');
    });

    it('should handle rapid sequential operations', async () => {
      const key = 'test-key';
      
      // Perform multiple operations in quick succession
      await Promise.all([
        setItem(key, 'value1'),
        setItem(key, 'value2'),
        setItem(key, 'value3')
      ]);
      
      // The last write should win
      const retrieved = await getItem(key);
      expect(retrieved).toBe('value3');
    });
  });


}); 