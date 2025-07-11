import { Session, SessionStatus } from '@/context/auth/auth-types';
import { APP_CONFIG } from '@/constants/app-config';
import * as storage from '@/utils/storage';
import { error as logError } from '@/utils/logger';

export class SessionService {

  private static readonly SESSION_TTL_MS = APP_CONFIG.SECURITY.SESSION_TTL_MS;

  /**
   * TODO: Check if we actually need this (it is used in )
   * Get session status based on current state
   */
  static getStatus(session: Session | null): SessionStatus {
    if (!session) return SessionStatus.Inactive;
    if (session.expiresAt < Date.now()) return SessionStatus.Expired;
    if (!session.isActive) return SessionStatus.Locked;
    if (!session.pinVerified) return SessionStatus.Locked;
    return SessionStatus.Active;
  }

  /**
   * Clear the current session
   */
  static async voidSession(): Promise<boolean> {
    try {
      await storage.clearSession();
      return true;
    } catch (e) {
      logError("Error: Couldn't void session", e);
      return false;
    }
  }

  /**
   * Load existing session from storage
   * Returns null if no valid session exists
   */
  static async loadSession(): Promise<Session | null> {
    const saved = await storage.getSession();
    const status = this.getStatus(saved);
    // security redundancy (expiry should be already checked in storage.getSession)
    if (status !== SessionStatus.Active) {
      await this.voidSession();
      return null;
    }
    return saved;
  }

  /**
   * Create and persist a new session
   */
  static async createSession(): Promise<Session> {
    const newSession: Session = {
      isActive: true,
      lastActivity: Date.now(),
      expiresAt: Date.now() + this.SESSION_TTL_MS,
      pinVerified: true
    };
    await storage.setSession(newSession);
    return newSession;
  }

  /**
   * Lock the current session
   */
  static async lockSession(session: Session): Promise<Session> {
    const lockedSession: Session = {
      ...session,
      isActive: false,
      pinVerified: false
    };
    await storage.setSession(lockedSession);
    return lockedSession;
  }

  static async updateSession(session: Session): Promise<Session> {
    const updatedSession: Session = {
      ...session,
      lastActivity: Date.now()
    };
    await storage.setSession(updatedSession);
    return updatedSession;
  }

  /**
   * Refresh session activity
   */
  static async refreshActivity(session: Session): Promise<Session> {
    if (!session?.isActive) return session;

    const refreshed: Session = {
      ...session,
      expiresAt: Date.now() + this.SESSION_TTL_MS
    };
    
    return this.updateSession(refreshed);
  }
} 