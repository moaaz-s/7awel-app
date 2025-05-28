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
import { info } from "@/utils/logger";
import { Session, SessionStatus } from "@/context/auth/auth-types";
import { SESSION_IDLE_TIMEOUT_MS } from '@/constants/auth-constants';
import { SessionService } from '@/services/session-service';

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
  /** Last error message */
  error: string | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: ProviderProps) {
  const { authStatus } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize session from storage
  useEffect(() => {
    SessionService.loadSession().then(setSession);
  }, []);

  // Monitor auth status and manage session lifecycle
  useEffect(() => {
    (async () => {
      const newSession = await SessionService.initializeSession(
        authStatus === AuthStatus.Authenticated
      );
      setSession(newSession);
    })();
  }, [authStatus]);

  // Activity monitoring
  useEffect(() => {
    if (!session?.isActive) return;

    const events = ["visibilitychange", "mousemove", "keydown", "touchstart", "focus"] as const;
    const handler = () => refreshActivity();
    
    for (const evt of events) {
      window.addEventListener(evt, handler);
    }
    
    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, handler);
      }
    };
  }, [session?.isActive]);

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
    
    setError(null);
    const result = await SessionService.validatePinAndCreateSession(pin);
    
    if (result.valid && result.session) {
      setSession(result.session);
      return true;
    }
    
    if (result.error) {
      setError(result.error);
    }
    return false;
  };

  const lock = async () => {
    if (!session) return;
    const lockedSession = await SessionService.lockSession(session);
    setSession(lockedSession);
  };

  const refreshActivity = async () => {
    if (!session?.isActive) return;
    const refreshedSession = await SessionService.refreshActivity(session);
    setSession(refreshedSession);
  };

  return (
    <SessionContext.Provider value={{
      session,
      status: SessionService.getStatus(session),
      activate,
      lock,
      refreshActivity,
      error
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

export default SessionContext;
