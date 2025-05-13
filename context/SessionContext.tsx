"use client"

/**
 * Session management context
 */
import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react';
import { useAuth } from '@/context/auth/AuthContext';
import { AuthStatus } from '@/context/auth/auth-state-machine';
import { info, warn } from "@/utils/logger";
import * as storage from "@/utils/storage";
import { Session, SessionStatus } from "@/context/auth/auth-types";
import { SESSION_TTL_MS, SESSION_IDLE_TIMEOUT_MS } from '@/constants/auth-constants';

interface SessionContextValue {
  /** Current session state */
  session: Session | null;
  /** Current session status */
  status: SessionStatus;
  /** Activate session with PIN */
  activate: (pin: string) => Promise<boolean>;
  /** Lock session */
  lock: () => Promise<void>;
  /** Refresh session activity */
  refreshActivity: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: ProviderProps) {
  const { authStatus, validatePin } = useAuth();
  const [session, setSession] = useState<Session | null>(null);

  // Get session status based on current state
  const getStatus = (session: Session | null): SessionStatus => {
    if (!session) return SessionStatus.Inactive;
    if (session.expiresAt < Date.now()) return SessionStatus.Expired;
    if (!session.isActive) return SessionStatus.Locked;
    if (!session.pinVerified) return SessionStatus.Locked;
    return SessionStatus.Active;
  };

  // Initialize session from storage
  useEffect(() => {
    const init = async () => {
      const savedSession = await storage.getSession();
      if (savedSession) {
        // Check if session has expired
        if (savedSession.expiresAt < Date.now()) {
          await storage.clearSession();
          setSession(null);
          return;
        }
        setSession(savedSession);
      }
    };
    init();
  }, []);

  // Monitor auth status changes
  useEffect(() => {
    if (authStatus !== AuthStatus.Authenticated) {
      setSession(null)
      storage.clearSession()
    }
  }, [authStatus])

  // Activity monitoring
  useEffect(() => {
    if (!session?.isActive) return

    const events = ["visibilitychange", "mousemove", "keydown", "touchstart", "focus"] as const
    const handler = () => refreshActivity()
    
    for (const evt of events) {
      window.addEventListener(evt, handler)
    }
    
    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, handler)
      }
    }
  }, [session?.isActive])

  // Auto-lock timer
  useEffect(() => {
    if (!session?.isActive || !session?.lastActivity) return;
    
    const timer = setTimeout(() => {
      lock();
    }, SESSION_IDLE_TIMEOUT_MS);
    
    return () => clearTimeout(timer);
  }, [session?.isActive, session?.lastActivity]);

  // Session methods
  const activate = async (pin: string): Promise<boolean> => {
    if (authStatus !== AuthStatus.Authenticated) return false;
    
    const isValid = await validatePin(pin);
    if (!isValid) return false;

    const newSession: Session = {
      isActive: true,
      lastActivity: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      pinVerified: true
    };
    
    setSession(newSession);
    await storage.setSession(newSession);
    return true;
  };

  const lock = async () => {
    if (!session) return;

    const lockedSession: Session = {
      ...session,
      isActive: false,
      pinVerified: false
    };

    setSession(lockedSession);
    await storage.setSession(lockedSession);
  };

  const refreshActivity = async () => {
    if (!session?.isActive) return;

    const refreshed: Session = {
      ...session,
      lastActivity: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    
    setSession(refreshed);
    await storage.setSession(refreshed);
  };

  return (
    <SessionContext.Provider value={{
      session,
      status: getStatus(session),
      activate,
      lock,
      refreshActivity
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}

export default SessionContext
