// tests/context/auth/auth-reducer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authReducer, initialAuthState } from '@/context/auth/auth-reducer';
import { AuthState, AuthAction, AuthFlowState, Session } from '@/context/auth/auth-types';
import { AuthStatus } from '@/context/auth/auth-state-machine';
import { AUTH_STEP_AUTHENTICATED, AUTH_STEP_PHONE_ENTRY, AUTH_STEP_PHONE_OTP_PENDING } from '@/context/auth/flow/flowSteps';
import { AuthFlowType, FlowStep } from '@/context/auth/flow/flowsOrchestrator';

// Mock utils only - use real flow orchestrator
vi.mock('@/utils/logger');

describe('authReducer', () => {
  let mockState: AuthState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = { ...initialAuthState };
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(initialAuthState).toEqual({
        authStatus: AuthStatus.Initial,
        isLoading: false,
        isTokenReady: false,
        currentStep: null,
        activeFlow: null,
        flowState: expect.any(Object),
        error: null,
        deviceInfo: null,
        session: null,
        lastActivity: expect.any(Number),
        idleTimeoutMs: expect.any(Number),
      });
    });
  });

  describe('SET_LOADING Action', () => {
    it('should set loading state to true', () => {
      const action: AuthAction = { type: 'SET_LOADING', payload: true };
      const newState = authReducer(mockState, action);

      expect(newState.isLoading).toBe(true);
      expect(newState).toEqual({ ...mockState, isLoading: true });
    });

    it('should set loading state to false', () => {
      const stateWithLoading = { ...mockState, isLoading: true };
      const action: AuthAction = { type: 'SET_LOADING', payload: false };
      const newState = authReducer(mockState, action);

      expect(newState.isLoading).toBe(false);
    });
  });

  describe('SET_DEVICE_INFO Action', () => {
    it('should set device info', () => {
      const deviceInfo = { deviceId: 'device123', platform: 'ios' };
      const action: AuthAction = { type: 'SET_DEVICE_INFO', payload: deviceInfo };
      const newState = authReducer(mockState, action);

      expect(newState.deviceInfo).toEqual(deviceInfo);
      expect(newState).toEqual({ ...mockState, deviceInfo });
    });
  });

  describe('Session Management Actions', () => {
    const mockSession: Session = {
      isActive: true,
      lastActivity: Date.now() - 60000, // 1 minute ago
      expiresAt: Date.now() + 3600000, // 1 hour from now
      pinVerified: true,
    };

    describe('SET_SESSION', () => {
      it('should set session and reset activity', () => {
        const action: AuthAction = { type: 'SET_SESSION', payload: mockSession };
        const newState = authReducer(mockState, action);

        expect(newState.session).toEqual(mockSession);
        expect(newState.lastActivity).toBeGreaterThan(mockSession.lastActivity);
      });

      it('should clear session when payload is null', () => {
        mockState = { ...mockState, session: mockSession };
        const action: AuthAction = { type: 'SET_SESSION', payload: null };
        const newState = authReducer(mockState, action);

        expect(newState.session).toBeNull();
      });
    });

    describe('UPDATE_SESSION_ACTIVITY', () => {
      it('should update session activity timestamp', () => {
        const originalTime = Date.now() - 120000; // 2 minutes ago
        const mockSessionWithOldTime = {
          ...mockSession,
          lastActivity: originalTime,
          expiresAt: originalTime + 1800000, // 30 minutes from old time (so it's in the past)
        };
        
        mockState = { 
          ...mockState, 
          session: mockSessionWithOldTime,
          lastActivity: originalTime
        };
        
        const action: AuthAction = { type: 'UPDATE_SESSION_ACTIVITY' };
        const newState = authReducer(mockState, action);

        expect(newState.lastActivity).toBeGreaterThan(mockState.lastActivity);
        expect(newState.session?.lastActivity).toBeGreaterThan(mockSessionWithOldTime.lastActivity);
        // The new expiresAt should be based on current time + timeout, so it should be greater
        expect(newState.session?.expiresAt).toBeGreaterThan(mockSessionWithOldTime.expiresAt);
      });

      it('should handle null session gracefully', () => {
        const action: AuthAction = { type: 'UPDATE_SESSION_ACTIVITY' };
        const newState = authReducer(mockState, action);

        expect(newState.lastActivity).toBeGreaterThan(mockState.lastActivity);
        expect(newState.session).toBeNull();
      });
    });

    describe('LOCK_SESSION', () => {
      it('should lock session and set auth status', () => {
        mockState = { ...mockState, session: mockSession };
        const action: AuthAction = { type: 'LOCK_SESSION' };
        const newState = authReducer(mockState, action);

        expect(newState.authStatus).toBe(AuthStatus.Locked);
        expect(newState.session?.isActive).toBe(false);
        expect(newState.session?.pinVerified).toBe(false);
      });

      it('should handle null session gracefully', () => {
        const action: AuthAction = { type: 'LOCK_SESSION' };
        const newState = authReducer(mockState, action);

        expect(newState.authStatus).toBe(AuthStatus.Locked);
        expect(newState.session).toBeNull();
      });
    });

    describe('CLEAR_SESSION', () => {
      it('should clear session and update activity', () => {
        mockState = { ...mockState, session: mockSession };
        const action: AuthAction = { type: 'CLEAR_SESSION' };
        const newState = authReducer(mockState, action);

        expect(newState.session).toBeNull();
        expect(newState.lastActivity).toBeGreaterThan(mockState.lastActivity);
      });
    });
  });

  describe('LOGOUT Action', () => {
    it('should reset to initial state on logout', () => {
      // Setup a complex state
      mockState = {
        ...mockState,
        authStatus: AuthStatus.Authenticated,
        isLoading: true,
        isTokenReady: true,
        currentStep: AUTH_STEP_AUTHENTICATED,
        error: 'Some error',
        deviceInfo: { deviceId: 'device123' },
        flowState: { ...mockState.flowState, phoneValidated: true, pinSet: true },
      };

      const action: AuthAction = { type: 'LOGOUT' };
      const newState = authReducer(mockState, action);

      expect(newState.authStatus).toBe(AuthStatus.Unauthenticated);
      expect(newState.isLoading).toBe(false);
      expect(newState.isTokenReady).toBe(false);
      expect(newState.currentStep).toBeNull();
      expect(newState.activeFlow).toBeNull();
      expect(newState.error).toBeNull();
    });
  });

  describe('Unknown Action', () => {
    it('should return current state for unknown action', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as any;
      const newState = authReducer(mockState, unknownAction);

      expect(newState).toBe(mockState);
    });
  });
}); 