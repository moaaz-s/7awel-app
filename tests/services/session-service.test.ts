// tests/services/session-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionService } from '@/services/session-service';
import { Session, SessionStatus } from '@/context/auth/auth-types';
import * as storage from '@/utils/storage';

// Mock dependencies
vi.mock('@/utils/storage');
vi.mock('@/utils/logger');

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Status', () => {
    it('should return Inactive for null session', () => {
      const status = SessionService.getStatus(null);
      expect(status).toBe(SessionStatus.Inactive);
    });

    it('should return Expired for expired session', () => {
      const expiredSession: Session = {
        isActive: true,
        lastActivity: Date.now() - 7200000, // 2 hours ago
        expiresAt: Date.now() - 3600000, // 1 hour ago (expired)
        pinVerified: true,
      };

      const status = SessionService.getStatus(expiredSession);
      expect(status).toBe(SessionStatus.Expired);
    });

    it('should return Locked for inactive session', () => {
      const inactiveSession: Session = {
        isActive: false,
        lastActivity: Date.now(),
        expiresAt: Date.now() + 3600000, // 1 hour from now
        pinVerified: true,
      };

      const status = SessionService.getStatus(inactiveSession);
      expect(status).toBe(SessionStatus.Locked);
    });

    it('should return Locked for session without pin verification', () => {
      const unverifiedSession: Session = {
        isActive: true,
        lastActivity: Date.now(),
        expiresAt: Date.now() + 3600000, // 1 hour from now
        pinVerified: false,
      };

      const status = SessionService.getStatus(unverifiedSession);
      expect(status).toBe(SessionStatus.Locked);
    });

    it('should return Active for valid session', () => {
      const activeSession: Session = {
        isActive: true,
        lastActivity: Date.now(),
        expiresAt: Date.now() + 3600000, // 1 hour from now
        pinVerified: true,
      };

      const status = SessionService.getStatus(activeSession);
      expect(status).toBe(SessionStatus.Active);
    });
  });

  describe('Session Management', () => {
    it('should create a new session successfully', async () => {
      vi.mocked(storage.setSession).mockResolvedValue(undefined);

      const session = await SessionService.createSession();

      expect(session).toEqual({
        isActive: true,
        lastActivity: expect.any(Number),
        expiresAt: expect.any(Number),
        pinVerified: true,
      });

      expect(session.expiresAt).toBeGreaterThan(Date.now());
      expect(storage.setSession).toHaveBeenCalledWith(session);
    });

    it('should load existing valid session', async () => {
      const validSession: Session = {
        isActive: true,
        lastActivity: Date.now(),
        expiresAt: Date.now() + 3600000,
        pinVerified: true,
      };

      vi.mocked(storage.getSession).mockResolvedValue(validSession);

      const result = await SessionService.loadSession();

      expect(result).toEqual(validSession);
      expect(storage.getSession).toHaveBeenCalled();
    });

    it('should void invalid session and return null', async () => {
      const expiredSession: Session = {
        isActive: true,
        lastActivity: Date.now(),
        expiresAt: Date.now() - 1000, // Expired
        pinVerified: true,
      };

      vi.mocked(storage.getSession).mockResolvedValue(expiredSession);
      vi.mocked(storage.clearSession).mockResolvedValue(undefined);

      const result = await SessionService.loadSession();

      expect(result).toBeNull();
      expect(storage.clearSession).toHaveBeenCalled();
    });

    it('should lock session successfully', async () => {
      const activeSession: Session = {
        isActive: true,
        lastActivity: Date.now(),
        expiresAt: Date.now() + 3600000,
        pinVerified: true,
      };

      vi.mocked(storage.setSession).mockResolvedValue(undefined);

      const lockedSession = await SessionService.lockSession(activeSession);

      expect(lockedSession).toEqual({
        ...activeSession,
        isActive: false,
        pinVerified: false,
      });

      expect(storage.setSession).toHaveBeenCalledWith(lockedSession);
    });

    it('should update session activity', async () => {
      const originalSession: Session = {
        isActive: true,
        lastActivity: Date.now() - 60000, // 1 minute ago
        expiresAt: Date.now() + 3600000,
        pinVerified: true,
      };

      vi.mocked(storage.setSession).mockResolvedValue(undefined);

      const updatedSession = await SessionService.updateSession(originalSession);

      expect(updatedSession.lastActivity).toBeGreaterThan(originalSession.lastActivity);
      expect(storage.setSession).toHaveBeenCalledWith(updatedSession);
    });

    it('should refresh session activity and extend expiry', async () => {
      const originalSession: Session = {
        isActive: true,
        lastActivity: Date.now() - 60000,
        expiresAt: Date.now() + 1800000, // 30 minutes from now
        pinVerified: true,
      };

      vi.mocked(storage.setSession).mockResolvedValue(undefined);

      const refreshedSession = await SessionService.refreshActivity(originalSession);

      expect(refreshedSession.expiresAt).toBeGreaterThan(originalSession.expiresAt);
      expect(refreshedSession.lastActivity).toBeGreaterThan(originalSession.lastActivity);
    });

    it('should not refresh inactive session', async () => {
      const inactiveSession: Session = {
        isActive: false,
        lastActivity: Date.now(),
        expiresAt: Date.now() + 3600000,
        pinVerified: false,
      };

      const result = await SessionService.refreshActivity(inactiveSession);

      expect(result).toEqual(inactiveSession);
      expect(storage.setSession).not.toHaveBeenCalled();
    });
  });

  describe('Session Cleanup', () => {
    it('should void session successfully', async () => {
      vi.mocked(storage.clearSession).mockResolvedValue(undefined);

      const result = await SessionService.voidSession();

      expect(result).toBe(true);
      expect(storage.clearSession).toHaveBeenCalled();
    });

    it('should handle void session errors', async () => {
      vi.mocked(storage.clearSession).mockRejectedValue(new Error('Storage error'));

      const result = await SessionService.voidSession();

      expect(result).toBe(false);
    });
  });
}); 