# Session Management System

## Overview

The Session Management system controls user session persistence, inactivity timeouts, and secure session termination for the 7awel crypto wallet. It ensures that authenticated sessions are properly maintained with appropriate security controls for a financial application.

## Key Features

- **Session timeout**: Automatic session expiry after configurable period of inactivity
- **Secure persistence**: Auth token stored in platform-specific secure storage
- **Session state tracking**: Real-time monitoring of user interaction
- **Background/foreground handling**: Session security when app moves to background
- **PIN verification**: Session activation requires PIN verification
- **Automatic locking**: Automatically locks session after idle timeout
- **Session expiration**: Hard expiration of session after TTL (Time To Live)

## Architecture

The session management system uses a three-tier architecture:

1. **Auth Layer** - Manages authentication state and token handling
   - `AuthContext.tsx`: Maintains authentication status and token
   - `useTokenManager.ts`: Handles secure token storage and validation

2. **Session Layer** - Manages session state and lifecycle
   - `SessionContext.tsx`: Handles session activation, locking, and activity tracking
   - Session states: Active, Locked, Expired, Inactive

3. **Secure Storage Layer** - Platform-specific secure storage
   - Web: IndexedDB/localStorage with encryption
   - Mobile: Capacitor Secure Storage plugin

## Session States

The session management system has four distinct states:

1. **Active** - User is authenticated with a valid session and verified PIN
2. **Locked** - User is authenticated but the session is locked due to inactivity
3. **Expired** - User's session has reached its maximum lifetime and requires re-authentication
4. **Inactive** - No active session exists

```typescript
// Session status as defined in auth-types.ts
export enum SessionStatus {
  Active = 'active',
  Locked = 'locked',
  Expired = 'expired',
  Inactive = 'inactive'
}
```

## Sequence Diagrams

### Session Initialization Flow

```
┌──────┐          ┌─────────────┐          ┌─────────────────┐          ┌────────────────┐
│ User │          │ AuthContext │          │ SessionContext  │          │ Secure Storage │
└──┬───┘          └──────┬──────┘          └────────┬────────┘          └───────┬────────┘
   │                     │                          │                           │
   │ App Launch          │                          │                           │
   │ ─────────────────── │                          │                           │
   │                     │                          │                           │
   │                     │ checkAuthStatus          │                           │
   │                     │ ──────────────┐          │                           │
   │                     │               │          │                           │
   │                     │ <─────────────┘          │                           │
   │                     │                          │                           │
   │                     │ Request auth token       │                           │
   │                     │ ────────────────────────────────────────────────────>│
   │                     │                          │                           │
   │                     │ Token data               │                           │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
   │                     │                          │                           │
   │                     │ Initialize session        │                          │
   │                     │ ────────────────────────>│                           │
   │                     │                          │                           │
   │                     │                          │ Init from storage         │
   │                     │                          │ ────────────────────────>│
   │                     │                          │                           │
   │                     │                          │ Session data              │
   │                     │                          │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
   │                     │                          │                           │
   │                     │                          │ Session status?           │
   │                     │                          │ ──────────────┐           │
   │                     │                          │               │           │
   │                     │                          │ <─────────────┘           │
   │                     │                          │                           │
   │ Show PIN entry or   │                          │                           │
   │ App Access          │                          │                           │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                           │
   │                     │                          │                           │
```

### Session Activity and Timeout Flow

```
┌──────┐          ┌─────────────┐          ┌─────────────────┐          ┌─────────────┐
│ User │          │ AuthContext │          │ SessionContext  │          │ Application │
└──┬───┘          └──────┬──────┘          └────────┬────────┘          └──────┬──────┘
   │                     │                          │                          │
   │ User interaction    │                          │                          │
   │ ───────────────────────────────────────────────────────────────────────────>
   │                     │                          │                          │
   │                     │                          │                          │ Activity event
   │                     │                          │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   │                     │                          │                          │
   │                     │                          │ Reset inactivity timer   │
   │                     │                          │ ──────────────┐          │
   │                     │                          │               │          │
   │                     │                          │ <─────────────┘          │
   │                     │                          │                          │
   │ No interaction      │                          │                          │
   │ ─────────────────── │                          │                          │
   │                     │                          │                          │
   │                     │                          │ Inactivity timeout       │
   │                     │                          │ ──────────────┐          │
   │                     │                          │               │          │
   │                     │                          │ <─────────────┘          │
   │                     │                          │                          │
   │                     │                          │ Lock session             │
   │                     │                          │ ──────────────┐          │
   │                     │                          │               │          │
   │                     │                          │ <─────────────┘          │
   │                     │                          │                          │
   │ Show GlobalLockScreen │                        │                          │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
   │                     │                          │                          │
```

### PIN Validation Flow

```
┌──────┐          ┌─────────────┐          ┌─────────────────┐          ┌────────────────┐
│ User │          │ AuthContext │          │ SessionContext  │          │ Secure Storage │
└──┬───┘          └──────┬──────┘          └────────┬────────┘          └───────┬────────┘
   │                     │                          │                           │
   │ Enter PIN           │                          │                           │
   │ ──────────────────────────────────────────────>│                           │
   │                     │                          │                           │
   │                     │                          │ validatePin               │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                            │
   │                     │                          │                           │
   │                     │ PIN validation           │                           │
   │                     │ ──────────────┐          │                           │
   │                     │               │          │                           │
   │                     │ <─────────────┘          │                           │
   │                     │                          │                           │
   │                     │ Validation result        │                           │
   │                     │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─>│                           │
   │                     │                          │                           │
   │                     │                          │ If PIN valid, activate    │
   │                     │                          │ ──────────────┐           │
   │                     │                          │               │           │
   │                     │                          │ <─────────────┘           │
   │                     │                          │                           │
   │                     │                          │ Store session             │
   │                     │                          │ ────────────────────────>│
   │                     │                          │                           │
   │ Session activated or│                          │                           │
   │ Error message       │                          │                           │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                           │
   │                     │                          │                           │
```

## Implementation Details

### Session Context Implementation

The `SessionContext.tsx` implements the core session management logic:

```typescript
// Session context with key functions
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
```

### Session Object Structure

The Session object contains all information needed to track a user's session:

```typescript
interface Session {
  /**
   * Whether the session is currently active (user can access protected features)
   */
  isActive: boolean;

  /**
   * Timestamp of last user activity
   */
  lastActivity: number;

  /**
   * Timestamp when session expires
   */
  expiresAt: number;

  /**
   * Whether PIN has been verified for this session
   */
  pinVerified: boolean;
}
```

### Session Status Determination

The session status is determined by the current state of the session:

```typescript
const getStatus = (session: Session | null): SessionStatus => {
  if (!session) return SessionStatus.Inactive;
  if (session.expiresAt < Date.now()) return SessionStatus.Expired;
  if (!session.isActive) return SessionStatus.Locked;
  if (!session.pinVerified) return SessionStatus.Locked;
  return SessionStatus.Active;
};
```

### User Activity Tracking

The system tracks user activity through various DOM events to detect when the user is interacting with the application:

```typescript
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
```

### Auto-Lock Timer

The session is automatically locked after a period of inactivity:

```typescript
// Auto-lock timer
useEffect(() => {
  if (!session?.isActive || !session?.lastActivity) return;
  
  const timer = setTimeout(() => {
    lock();
  }, SESSION_IDLE_TIMEOUT_MS);
  
  return () => clearTimeout(timer);
}, [session?.isActive, session?.lastActivity]);
```

### Authentication Integration

The session management system is closely integrated with the authentication system through `useAuth()` hook:

```typescript
const { authStatus, validatePin } = useAuth();

// Monitor auth status changes
useEffect(() => {
  if (authStatus !== AuthStatus.Authenticated) {
    setSession(null)
    storage.clearSession()
  }
}, [authStatus])
```

### Activation with PIN Validation

Session activation requires PIN validation through the Auth system:

```typescript
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
```

### Locking and Activity Refresh

Sessions can be locked manually or automatically, and activity is refreshed upon user interaction:

```typescript
// Lock session
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

// Refresh activity
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
```

## Security Considerations

### Token Security

- Auth token is stored in platform-specific secure storage
- Token is never exposed to the client-side JavaScript
- Token expiration is enforced on both client and server

### Session Persistence

- Sessions are stored securely
- Session state includes expiration timestamps
- Session data is cleared upon logout or token expiry

### PIN Security

- PIN is verified through a secure hashing mechanism
- PIN attempts are limited to prevent brute force attacks
- Failed PIN attempts can result in timeout periods

### Mobile-Specific Security

On mobile platforms (using Capacitor):
- **App background**: Session may be automatically locked when app moves to background
- **Secure storage**: Utilizes platform's secure storage mechanisms
- **Biometric options**: Support for biometric authentication where available

## Integration with API Service

The API service has been updated to work exclusively with the auth token:

```typescript
// API Service token handling
public setToken(authToken: string | null): void {
  if (authToken !== undefined) {
    this.authToken = authToken;
    if (authToken) {
      info("[ApiService] Auth token set.");
    } else {
      info("[ApiService] Login token cleared.");
    }
  }
}
```

## Token Expiry Handling

The system handles token expiry through interceptors:

```typescript
private attachTokenExpiryInterceptor(onTokenExpired: () => void) {
  if (typeof window === 'undefined') return; // SSR guard
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    if (response.status === 401 || response.status === 403) {
      console.warn('[ApiService] Detected 401/403 – treating as auth token expiry');
      onTokenExpired();
    }
    return response;
  };
}
```

## Configuration Options

The session management system is configured through constants:

```typescript
// Session timeouts
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
```

## UI Integration

The system integrates with the UI through the `GlobalLockScreen` component that appears when the session is locked:

```typescript
export default function GlobalLockScreen() {
  const { authStatus, validatePin } = useAuth();
  const { status: sessionStatus, activate } = useSession();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show when auth is locked or session is locked/expired
  const isSessionExpired = sessionStatus === SessionStatus.Expired;
  const isSessionLocked = sessionStatus === SessionStatus.Locked;
  
  if (authStatus !== AuthStatus.Locked && !isSessionLocked && !isSessionExpired) {
    return null;
  }

  // Handle PIN entry completion
  const handleComplete = async (pinOrBio: string) => {
    // Implementation...
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      {/* UI implementation */}
    </div>
  );
}
```

## Best Practices

1. **Monitor session state**: Applications should check session status before performing sensitive operations
2. **Handle transitions**: Properly handle transitions between session states
3. **Show feedback**: Provide clear visual indicators of session state to users
4. **Secure storage**: Use platform-appropriate secure storage mechanisms
5. **Respect user settings**: Allow users to configure session timeouts where appropriate

## Platform-Specific Considerations

### Web Implementation

- Uses browser's localStorage or IndexedDB with encryption
- Handles browser tab focus/blur events
- Manages session across multiple tabs through storage events

### Mobile Implementation (Capacitor)

- Uses Capacitor Secure Storage plugin
- Handles app lifecycle events (background/foreground)
- Integrates with biometric authentication when available
