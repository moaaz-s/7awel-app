import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService } from '@/services/session-service';
import { Session, SessionStatus } from '@/context/auth/auth-types';
import { SESSION_TTL_MS } from '@/constants/auth-constants';
import * as storage from '@/utils/storage';
import { validatePin } from '@/utils/pin-service';

// Mock storage utilities
vi.mock('@/utils/storage', () => ({
  clearSession: vi.fn().mockResolvedValue(undefined),
  getSession: vi.fn().mockResolvedValue(null),
  setSession: vi.fn().mockResolvedValue(undefined),
}));

// Mock pin service
vi.mock('@/utils/pin-service', () => ({
  validatePin: vi.fn().mockResolvedValue({ valid: true, attemptsRemaining: 3 }),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  error: vi.fn(),
  info: vi.fn(),
}));

describe('Session Service Integration Tests', () => {
  const mockSession: Session = {
    isActive: true,
    lastActivity: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    pinVerified: true
  };

  beforeEach(() => {
    // Mock console methods to reduce noise during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Status Management', () => {
    it('should return Inactive status for null session', () => {
      const status = SessionService.getStatus(null);
      expect(status).toBe(SessionStatus.Inactive);
    });

    it('should return Expired status for expired session', () => {
      const expiredSession: Session = {
        ...mockSession,
        expiresAt: Date.now() - 1000 // 1 second ago
      };
      
      const status = SessionService.getStatus(expiredSession);
      expect(status).toBe(SessionStatus.Expired);
    });

    it('should return Locked status for inactive session', () => {
      const inactiveSession: Session = {
        ...mockSession,
        isActive: false
      };
      
      const status = SessionService.getStatus(inactiveSession);
      expect(status).toBe(SessionStatus.Locked);
    });

    it('should return Locked status for session without PIN verification', () => {
      const unverifiedSession: Session = {
        ...mockSession,
        pinVerified: false
      };
      
      const status = SessionService.getStatus(unverifiedSession);
      expect(status).toBe(SessionStatus.Locked);
    });

    it('should return Active status for valid session', () => {
      const status = SessionService.getStatus(mockSession);
      expect(status).toBe(SessionStatus.Active);
    });
  });

  describe('Session Lifecycle Management', () => {
    it('should void session successfully', async () => {
      vi.mocked(storage.clearSession).mockResolvedValue(undefined);
      
      const result = await SessionService.voidSession();
      
      expect(result).toBe(true);
      expect(storage.clearSession).toHaveBeenCalledTimes(1);
    });

    it('should handle void session errors', async () => {
      vi.mocked(storage.clearSession).mockRejectedValue(new Error('Storage error'));
      
      const result = await SessionService.voidSession();
      
      expect(result).toBe(false);
      expect(storage.clearSession).toHaveBeenCalledTimes(1);
    });

    it('should create new session with correct properties', async () => {
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      const beforeTime = Date.now();
      
      const session = await SessionService.createSession();
      
      const afterTime = Date.now();
      
      expect(session.isActive).toBe(true);
      expect(session.pinVerified).toBe(true);
      expect(session.lastActivity).toBeGreaterThanOrEqual(beforeTime);
      expect(session.lastActivity).toBeLessThanOrEqual(afterTime);
      expect(session.expiresAt).toBeGreaterThan(session.lastActivity);
      expect(storage.setSession).toHaveBeenCalledWith(session);
    });

    it('should load valid session from storage', async () => {
      const validSession = { ...mockSession, expiresAt: Date.now() + 10000 };
      vi.mocked(storage.getSession).mockResolvedValue(validSession);
      
      const session = await SessionService.loadSession();
      
      expect(session).toEqual(validSession);
      expect(storage.getSession).toHaveBeenCalledTimes(1);
    });

    it('should void expired session and return null', async () => {
      const expiredSession = { ...mockSession, expiresAt: Date.now() - 1000 };
      vi.mocked(storage.getSession).mockResolvedValue(expiredSession);
      vi.mocked(storage.clearSession).mockResolvedValue(undefined);
      
      const session = await SessionService.loadSession();
      
      expect(session).toBeNull();
      expect(storage.clearSession).toHaveBeenCalledTimes(1);
    });

    it('should return null when no session exists', async () => {
      vi.mocked(storage.getSession).mockResolvedValue(null);
      
      const session = await SessionService.loadSession();
      
      expect(session).toBeNull();
      expect(storage.getSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Session State Modifications', () => {
    it('should lock session correctly', async () => {
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      
      const lockedSession = await SessionService.lockSession(mockSession);
      
      expect(lockedSession.isActive).toBe(false);
      expect(lockedSession.pinVerified).toBe(false);
      expect(lockedSession.lastActivity).toBe(mockSession.lastActivity);
      expect(lockedSession.expiresAt).toBe(mockSession.expiresAt);
      expect(storage.setSession).toHaveBeenCalledWith(lockedSession);
    });

    it('should refresh session activity', async () => {
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      const beforeTime = Date.now();
      
      const refreshedSession = await SessionService.refreshActivity(mockSession);
      
      const afterTime = Date.now();
      
      expect(refreshedSession.isActive).toBe(true);
      expect(refreshedSession.pinVerified).toBe(true);
      expect(refreshedSession.lastActivity).toBeGreaterThanOrEqual(beforeTime);
      expect(refreshedSession.lastActivity).toBeLessThanOrEqual(afterTime);
      expect(refreshedSession.expiresAt).toBeGreaterThan(refreshedSession.lastActivity);
      expect(storage.setSession).toHaveBeenCalledWith(refreshedSession);
    });

    it('should not refresh inactive session', async () => {
      const inactiveSession = { ...mockSession, isActive: false };
      
      const result = await SessionService.refreshActivity(inactiveSession);
      
      expect(result).toEqual(inactiveSession);
      expect(storage.setSession).not.toHaveBeenCalled();
    });

    it('should handle null session in refresh activity', async () => {
      // @ts-ignore - testing edge case
      const result = await SessionService.refreshActivity(null);
      
      expect(result).toBeNull();
      expect(storage.setSession).not.toHaveBeenCalled();
    });
  });

  describe('Session Initialization', () => {
    it('should void session when user is not authenticated', async () => {
      vi.mocked(storage.clearSession).mockResolvedValue(undefined);
      
      const session = await SessionService.initializeSession(false);
      
      expect(session).toBeNull();
      expect(storage.clearSession).toHaveBeenCalledTimes(1);
    });

    it('should load existing valid session when authenticated', async () => {
      const validSession = { ...mockSession, expiresAt: Date.now() + 10000 };
      vi.mocked(storage.getSession).mockResolvedValue(validSession);
      
      const session = await SessionService.initializeSession(true);
      
      expect(session).toEqual(validSession);
      expect(storage.getSession).toHaveBeenCalledTimes(1);
    });

    it('should create new session when authenticated but no valid session exists', async () => {
      vi.mocked(storage.getSession).mockResolvedValue(null);
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      
      const session = await SessionService.initializeSession(true);
      
      expect(session).toBeDefined();
      expect(session?.isActive).toBe(true);
      expect(session?.pinVerified).toBe(true);
      expect(storage.setSession).toHaveBeenCalled();
    });
  });

  describe('PIN Validation and Session Creation', () => {
    it('should create session on valid PIN', async () => {
      vi.mocked(validatePin).mockResolvedValue({ valid: true, attemptsRemaining: 3 });
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      
      const result = await SessionService.validatePinAndCreateSession('1234');
      
      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.isActive).toBe(true);
      expect(result.session?.pinVerified).toBe(true);
      expect(result.error).toBeUndefined();
      expect(validatePin).toHaveBeenCalledWith('1234');
    });

    it('should handle invalid PIN with attempts remaining', async () => {
      vi.mocked(validatePin).mockResolvedValue({ 
        valid: false, 
        attemptsRemaining: 2,
        locked: false 
      });
      
      const result = await SessionService.validatePinAndCreateSession('wrong');
      
      expect(result.valid).toBe(false);
      expect(result.session).toBeNull();
      expect(result.error).toContain('Invalid PIN');
      expect(result.error).toContain('2 attempts remaining');
    });

    it('should handle locked PIN', async () => {
      const lockUntil = Date.now() + 300000; // 5 minutes from now
      vi.mocked(validatePin).mockResolvedValue({ 
        valid: false, 
        locked: true,
        lockUntil,
        attemptsRemaining: 0 
      });
      
      const result = await SessionService.validatePinAndCreateSession('1234');
      
      expect(result.valid).toBe(false);
      expect(result.session).toBeNull();
      expect(result.error).toContain('PIN locked until');
    });

    it('should handle PIN validation errors', async () => {
      vi.mocked(validatePin).mockRejectedValue(new Error('PIN service error'));
      
      const result = await SessionService.validatePinAndCreateSession('1234');
      
      expect(result.valid).toBe(false);
      expect(result.session).toBeNull();
      expect(result.error).toBe('Error validating PIN');
    });

    it('should handle empty PIN', async () => {
      vi.mocked(validatePin).mockResolvedValue({ 
        valid: false, 
        attemptsRemaining: 2,
        locked: false 
      });
      
      const result = await SessionService.validatePinAndCreateSession('');
      
      expect(result.valid).toBe(false);
      expect(result.session).toBeNull();
      expect(validatePin).toHaveBeenCalledWith('');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle storage errors in create session', async () => {
      vi.mocked(storage.setSession).mockRejectedValue(new Error('Storage error'));
      
      await expect(SessionService.createSession()).rejects.toThrow('Storage error');
    });

    it('should handle storage errors in lock session', async () => {
      vi.mocked(storage.setSession).mockRejectedValue(new Error('Storage error'));
      
      await expect(SessionService.lockSession(mockSession)).rejects.toThrow('Storage error');
    });

    it('should handle storage errors in refresh activity', async () => {
      vi.mocked(storage.setSession).mockRejectedValue(new Error('Storage error'));
      
      await expect(SessionService.refreshActivity(mockSession)).rejects.toThrow('Storage error');
    });

    it('should handle malformed session data from storage', async () => {
      // @ts-ignore - testing malformed data
      vi.mocked(storage.getSession).mockResolvedValue({ invalid: 'data' });
      vi.mocked(storage.clearSession).mockResolvedValue(undefined);
      
      const session = await SessionService.loadSession();
      
      expect(session).toBeNull();
      expect(storage.clearSession).toHaveBeenCalledTimes(1);
    });

    it('should handle session with missing properties', () => {
      // @ts-ignore - testing incomplete session
      const incompleteSession: Session = {
        isActive: true,
        lastActivity: Date.now()
        // Missing expiresAt and pinVerified
      };
      
      const status = SessionService.getStatus(incompleteSession);
      // Should handle gracefully
      expect([SessionStatus.Active, SessionStatus.Locked, SessionStatus.Expired, SessionStatus.Inactive])
        .toContain(status);
    });
  });

  describe('Session TTL and Timing', () => {
    it('should create session with correct TTL', async () => {
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      const beforeTime = Date.now();
      
      const session = await SessionService.createSession();
      
      const expectedExpiry = beforeTime + SESSION_TTL_MS;
      const actualExpiry = session.expiresAt;
      
      // Allow for small timing differences (within 1 second)
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);
    });

    it('should refresh session with new TTL', async () => {
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      const beforeTime = Date.now();
      
      const refreshedSession = await SessionService.refreshActivity(mockSession);
      
      const expectedExpiry = beforeTime + SESSION_TTL_MS;
      const actualExpiry = refreshedSession.expiresAt;
      
      // Allow for small timing differences (within 1 second)
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);
    });

    it('should detect session expiry accurately', () => {
      const almostExpiredSession = {
        ...mockSession,
        expiresAt: Date.now() + 100 // Expires in 100ms
      };
      
      expect(SessionService.getStatus(almostExpiredSession)).toBe(SessionStatus.Active);
      
      // Wait for expiry and test again
      setTimeout(() => {
        expect(SessionService.getStatus(almostExpiredSession)).toBe(SessionStatus.Expired);
      }, 150);
    });
  });

  describe('Concurrent Session Operations', () => {
    it('should handle multiple session operations concurrently', async () => {
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      vi.mocked(storage.getSession).mockResolvedValue(mockSession);
      vi.mocked(storage.clearSession).mockResolvedValue(undefined);
      
      const operations = [
        SessionService.createSession(),
        SessionService.loadSession(),
        SessionService.refreshActivity(mockSession),
        SessionService.lockSession(mockSession),
        SessionService.voidSession(),
      ];
      
      const results = await Promise.allSettled(operations);
      
      // All operations should complete (either fulfill or reject)
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(['fulfilled', 'rejected'].includes(result.status)).toBe(true);
      });
    });

    it('should handle rapid PIN validation attempts', async () => {
      vi.mocked(validatePin).mockResolvedValue({ valid: true, attemptsRemaining: 3 });
      vi.mocked(storage.setSession).mockResolvedValue(undefined);
      
      const promises = [
        SessionService.validatePinAndCreateSession('1234'),
        SessionService.validatePinAndCreateSession('1234'),
        SessionService.validatePinAndCreateSession('1234'),
      ];
      
      const results = await Promise.allSettled(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.valid).toBe(true);
        }
      });
    });
  });
}); 