# Crypto Wallet Authentication Architecture

## Overview

The Crypto Wallet Authentication system implements a secure, multi-factor authentication (MFA) framework that follows a four-layer architecture pattern. This document outlines the architecture, components, and flows of the authentication system.

## Design Philosophy

Our authentication architecture is designed with the following principles:

1. **Separation of Concerns**: Each component has a specific responsibility within the authentication flow
2. **Modularity**: Components are decoupled and independently testable
3. **Security First**: Implements MFA and device fingerprinting for enhanced security
4. **Declarative Flows**: Authentication flows are defined declaratively rather than imperatively
5. **Maintainability**: Clear code organization and comprehensive documentation

## Architecture Layers

The authentication system is organized into four distinct layers:

### 1. Flow Definitions Layer

The Flow Definitions layer defines all possible authentication paths through a declarative approach.

**Key Files**:
- `constants/auth-flows.ts`: Defines the structure and sequence of authentication flows
- `constants/auth-steps.ts`: Defines the individual steps in the authentication process
- `constants/auth-constants.ts`: Defines authentication-related constants

**Purpose**:
- Declaratively define valid transitions between authentication steps based on context
- Clearly represent the MFA requirements and step sequencing
- Provide a single source of truth for flow definitions

### 2. Auth Context Layer

The Auth Context layer manages authentication state and coordinates flow progression.

**Key Files**:
- `context/auth/AuthContext.tsx`: The main context provider that coordinates all authentication
- `context/auth/auth-state-machine.ts`: State machine for authentication status
- `context/auth/auth-types.ts`: Type definitions for auth state and actions

**Purpose**:
- Maintain authentication state
- Coordinate between UI, flow definitions, and step handlers
- Provide authentication-related hooks and functions to the UI

### 3. Session Management Layer

The Session Management layer handles user session persistence and security.

**Key Files**:
- `context/SessionContext.tsx`: Manages session state, timeout, and PIN verification
- `utils/storage.ts`: Handles secure storage operations
- `components/GlobalLockScreen.tsx`: UI for locked sessions

**Purpose**:
- Maintain session state (active, locked, expired, inactive)
- Enforce session timeout and expiration
- Track user activity
- Secure application when not in use

### 4. Step Handlers Layer

The Step Handlers layer contains the business logic for each authentication step.

**Key Files**:
- `context/auth-step-handlers.ts`: Implementation of handlers for each authentication step

**Purpose**:
- Execute side effects (API calls, storage operations)
- Transform data between steps
- Handle errors specific to each authentication step

## Authentication State Machine

The authentication system uses a finite state machine to model authentication states and transitions:

```
┌──────────────┐  CHECK_COMPLETE unauthenticated   ┌─────────────────┐
│   pending    │──────────────────────────────────►│ unauthenticated │
│              │                                   └─────────────────┘
│              │  CHECK_COMPLETE authenticated+PIN
│              │──────────────────────────────────►┌──────────────┐
│              │                                   │ requires_pin │
│              │  CHECK_COMPLETE authenticated noPIN└──────────────┘
│              │──────────────────────────────────►┌──────────────────┐
└──────────────┘                                   │ pin_setup_pending│
                                                   └──────────────────┘

unauthenticated ── LOGIN_STARTED / OTP_SENT ──►  otp_pending
otp_pending ── OTP_VERIFIED(email✗) ──► email_verification_pending
otp_pending ── OTP_VERIFIED(pin✗) ──► pin_setup_pending
otp_pending ── OTP_VERIFIED(pin✓) ──► requires_pin
email_verification_pending ── EMAIL_VERIFIED ──► requires_pin / pin_setup_pending
pin_setup_pending ── PIN_SET ──► authenticated
requires_pin ── PIN_VALID ──► authenticated
requires_pin ── PIN_INVALID(max) ──► locked ── UNLOCK ──► requires_pin
authenticated ── TOKEN_EXPIRED / LOGOUT ──► unauthenticated
```

The state machine is defined in `context/auth/auth-state-machine.ts` with the following states:

```typescript
export enum AuthStatus {
  Pending = "pending",
  Unauthenticated = "unauthenticated",
  OtpPending = "otp_pending",
  EmailVerificationPending = "email_verification_pending",
  PinSetupPending = "pin_setup_pending",
  RequiresPin = "requires_pin",
  Locked = "locked",
  Authenticated = "authenticated",
}
```

## Token Management

The authentication system uses a single auth token approach:

### Auth Token

- **Purpose**: Authenticate API requests 
- **Storage**: Securely stored using platform-specific secure storage
- **Lifecycle**: Created during successful OTP verification, cleared during logout
- **Handling**: Managed by useTokenManager hook

The system previously used a dual-token approach (auth token + browse token), but has been simplified to a single token for better security and simplicity.

## Session Management

The session management system works with the authentication system to provide secure access control:

### Session States

```typescript
export enum SessionStatus {
  Active = 'active',    // User authenticated with valid session and PIN
  Locked = 'locked',    // Session locked due to inactivity
  Expired = 'expired',  // Session reached maximum lifetime
  Inactive = 'inactive' // No session exists
}
```

### Session Properties

```typescript
interface Session {
  isActive: boolean;    // Whether session is active
  lastActivity: number; // Timestamp of last user activity
  expiresAt: number;    // Timestamp when session expires
  pinVerified: boolean; // Whether PIN has been verified
}
```

### Session Configuration

Key timeout values are defined in `constants/auth-constants.ts`:

```typescript
// Session timeouts
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
```

## Specialized Hooks

The system uses specialized hooks to encapsulate specific authentication concerns:

### Token Management

**Key File**: `context/auth/hooks/useTokenManager.ts`

**Responsibilities**:
- Store and retrieve auth token securely
- Set token in API service
- Clear token during logout
- Validate token status

### PIN Management

**Key File**: `context/auth/hooks/usePinManager.ts`

**Responsibilities**:
- Set and validate PINs
- Securely hash and store PINs
- Track PIN attempt limits
- Handle PIN reset flows

### Flow Management

**Key File**: `context/auth/hooks/useAuthFlow.ts`

**Responsibilities**:
- Initialize authentication flows
- Progress through authentication steps
- Build flow context for making flow decisions
- Handle flow transitions

## Authentication Flows

The system supports the following authentication flows:

### 1. Sign Up Flow

```
Phone Entry → Phone OTP Verification → Email Verification → PIN Setup → Token Acquisition → Authenticated
```

### 2. Sign In Flow

```
Phone Entry → Phone OTP Verification → Email Verification → PIN Entry → Token Acquisition → Authenticated
```

### 3. Forgot PIN Flow

```
Phone Entry → Phone OTP Verification → Email Verification → PIN Reset → Authenticated
```

## Multi-Factor Authentication

The system enforces MFA by requiring:

1. **Something you have**: Phone access (verified by OTP)
2. **Something you know**: PIN
3. **Something you control**: Email account (verified by magic link/code)

MFA is mandatory - users must verify both phone and email before token acquisition.

## Security Features

### Device Fingerprinting

The system collects and includes device information with all authentication requests using:

- `utils/device-fingerprint.ts`: Collects device-specific information
- Device info is included in all API requests for better security and analytics

### PIN Security

- PIN hashing with secure algorithms
- Attempt limiting to prevent brute force attacks
- Account lockout after multiple failed attempts
- Secure storage of PIN hashes

### API Authorization

- All API requests include the auth token in the authorization header
- Token expiry is detected through 401/403 response status codes
- Expired tokens trigger automatic logout

### Session Security

- Automatic session locking after idle timeout
- Hard session expiry after TTL period
- Activity monitoring through user interactions
- Secure session state storage
- PIN verification requirements for session activation

## API Service Integration

The API service has been updated to work with a single auth token approach:

```typescript
// Token setup in API service
public setToken(authToken: string | null): void {
  if (authToken !== undefined) {
    this.authToken = authToken;
    // Other token setup...
  }
}
```

Token expiry is handled through an interceptor that detects 401/403 responses:

```typescript
private attachTokenExpiryInterceptor(onTokenExpired: () => void) {
  // Setup fetch interceptor to detect expired tokens...
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    if (response.status === 401 || response.status === 403) {
      // Call the expiry callback
      onTokenExpired();
    }
    return response;
  };
}
```

## Error Handling

- Each authentication step has its own error handling
- Errors are captured and displayed to the user through the auth context
- API errors are translated into user-friendly messages
- Token expiry errors cause automatic logout

## Platform-Specific Considerations

### Web Implementation

- Uses browser's localStorage or IndexedDB with encryption
- Handles browser tab focus/blur events
- Manages session across multiple tabs through storage events

### Mobile Implementation (Capacitor)

- Uses Capacitor Secure Storage plugin
- Handles app lifecycle events (background/foreground)
- Integrates with biometric authentication when available

## Testing

The authentication system includes comprehensive tests:

- Unit tests for each specialized hook
- Tests for authentication state machine
- Tests for session timeout behavior
- Tests for PIN validation and session activation

## Future Improvements

1. **Biometric Authentication**: Add support for fingerprint/face recognition
2. **Backup Recovery Options**: Implement additional account recovery methods
3. **Audit Logging**: Enhanced security logging for authentication events
4. **Risk-Based Authentication**: Adapt security requirements based on risk assessment
5. **Offline Authentication**: Support for authentication when offline
6. **WebAuthn**: Support for hardware security keys
