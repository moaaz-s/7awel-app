/**
 * useSessionManagement.ts
 * 
 * Custom hook for managing session lifecycle in AuthContext.
 * Encapsulates session loading, activity monitoring, idle timeout, and session methods.
 */

import { useEffect, useCallback, useRef } from 'react';
import { info, error as logError } from '@/utils/logger';
import * as storage from '@/utils/storage';
import { SessionService } from '@/services/session-service';
import { AuthStatus } from '../auth-state-machine';
import { AuthState, AuthAction } from '../auth-types';

interface SessionManagementReturn {

  lockSession: () => Promise<void>;
  unlockSession: () => Promise<boolean>;
  isIdle: boolean;
  idleTimeRemaining: number;
}

export function useSessionManagement(
  state: AuthState,
  dispatch: React.Dispatch<AuthAction>
): SessionManagementReturn {
  // Ref to track if session is active without causing effect re-runs
  const isSessionActiveRef = useRef(false);
  isSessionActiveRef.current = !!state.session?.isActive;

  // Computed session values
  const isIdle = state.session?.isActive 
    ? (Date.now() - state.lastActivity) > state.idleTimeoutMs 
    : false;
  const idleTimeRemaining = Math.max(
    0, 
    state.idleTimeoutMs - (Date.now() - state.lastActivity)
  );

  // Session methods
  const lockSession = useCallback(async () => {
    if (!state.session) return;
    
    info('[SessionManagement] Locking session');
    await SessionService.lockSession(state.session);
    dispatch({ type: 'LOCK_SESSION' });
      dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Locked });
    
    

  }, [state.session, dispatch]);

  const unlockSession = useCallback(async (): Promise<boolean> => {
    if (!state.session) return false;
    
    info('[SessionManagement] Unlocking session');
    const newSession = await SessionService.createSession();
    dispatch({ type: 'SET_SESSION', payload: newSession });
    dispatch({ type: 'SET_AUTH_STATUS', payload: AuthStatus.Authenticated });
    return true;
  }, [state.session, dispatch]);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      info('[SessionManagement] Loading session on mount');
      const session = await SessionService.loadSession();
      
      if (session) {
        info('[SessionManagement] Loaded existing session from storage:', {
          isActive: session.isActive,
          pinVerified: session.pinVerified,
          lastActivity: session.lastActivity,
          expiresAt: session.expiresAt
        });
        dispatch({ type: 'SET_SESSION', payload: session });
      } else {
        info('[SessionManagement] No existing session found');
      }
    };
    
    loadSession();
  }, [dispatch]);

  // Save session on every update
  useEffect(() => {
    if (state.session) {
      storage.setSession(state.session).catch(err => {
        logError('[SessionManagement] Failed to save session:', err);
      });
    }
  }, [state.session]);

  // Activity monitoring
  useEffect(() => {
    if (!isSessionActiveRef.current) return;
    
    const handleActivity = () => {
      info('[SessionManagement] Activity detected');
      dispatch({ type: 'UPDATE_SESSION_ACTIVITY' });
    };
    
    // Add event listeners for user activity
    const events = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleActivity));
    
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [dispatch]); // Empty deps - use ref to check session state

  // Idle timeout monitoring
  useEffect(() => {
    if (!state.session?.isActive) return;

    const checkIdleTimeout = async () => {
      const idleTime = Date.now() - state.lastActivity;
      info(`[SessionManagement] Checking idle timeout: ${idleTime}ms of ${state.idleTimeoutMs}ms`);
      
      if (idleTime > state.idleTimeoutMs) {
        info('[SessionManagement] Session idle timeout reached, locking session');
        await lockSession();
      }
    };

    const interval = setInterval(checkIdleTimeout, 1000);
    return () => clearInterval(interval);
  }, [state.session, state.lastActivity, state.idleTimeoutMs]);


  return {

    lockSession,
    unlockSession,
    isIdle,
    idleTimeRemaining
  };
}
