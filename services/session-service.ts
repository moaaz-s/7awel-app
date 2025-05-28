import { Session, SessionStatus } from '@/context/auth/auth-types';
import { SESSION_TTL_MS } from '@/constants/auth-constants';
import * as storage from '@/utils/storage';
import { error as logError } from '@/utils/logger';
import { validatePin as serviceValidatePin } from '@/utils/pin-service';

export class SessionService {
  /**
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
    if (saved && saved.expiresAt > Date.now()) {
      return saved;
    }
    await this.voidSession();
    return null;
  }

  /**
   * Create and persist a new session
   */
  static async createSession(): Promise<Session> {
    const newSession: Session = {
      isActive: true,
      lastActivity: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
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

  /**
   * Refresh session activity
   */
  static async refreshActivity(session: Session): Promise<Session> {
    if (!session?.isActive) return session;

    const refreshed: Session = {
      ...session,
      lastActivity: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    
    await storage.setSession(refreshed);
    return refreshed;
  }

  /**
   * Initialize or load a session based on authentication state
   */
  static async initializeSession(isAuthenticated: boolean): Promise<Session | null> {
    if (!isAuthenticated) {
      await this.voidSession();
      return null;
    }

    const loaded = await this.loadSession();
    if (loaded) return loaded;

    return await this.createSession();
  }

  /**
   * Validate PIN and create session if valid
   */
  static async validatePinAndCreateSession(pin: string): Promise<{
    valid: boolean;
    session: Session | null;
    error?: string;
  }> {
    try {
      const result = await serviceValidatePin(pin);
      
      if (result.valid) {
        const session = await this.createSession();
        return { valid: true, session };
      }
      
      if (result.locked) {
        return { 
          valid: false, 
          session: null,
          error: `PIN locked until ${new Date(result.lockUntil || 0).toLocaleString()}`
        };
      }
      
      return { 
        valid: false, 
        session: null,
        error: `Invalid PIN. ${result.attemptsRemaining} attempts remaining.`
      };
    } catch (err) {
      logError('[SessionService] Error validating PIN:', err);
      return { valid: false, session: null, error: 'Error validating PIN' };
    }
  }
} 