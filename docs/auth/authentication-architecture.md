# 7awel Authentication Architecture

## Overview

The 7awel crypto wallet employs a comprehensive, multi-layered authentication system designed for security, usability, and cross-platform compatibility. This document describes the authentication architecture, components, state management, and security considerations.

## Authentication Factors

The system implements three distinct authentication factors that can be combined for different security levels:

1. **Phone verification** (Knowledge): Verifies user identity via SMS/OTP codes
2. **Email verification** (Knowledge): Verifies user email via one-click link or fallback code
3. **PIN/Biometric** (Possession/Inherence): Local device authentication, supports PIN or biometric on compatible devices

## Core Components

### State Machine

The authentication system is built around a finite state machine (`context/auth/auth-state-machine.ts`) that defines clear states, transitions, and validation rules:

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

### Auth Context

The `AuthContext` (`context/auth/AuthContext.tsx`) serves as the central provider for all authentication-related functionality:

- Manages auth state transitions
- Handles auth token storage, retrieval, and validation
- Coordinates between API service and secure storage
- Provides hooks for components to access auth methods and state

### Session Context

The `SessionContext` (`context/SessionContext.tsx`) manages the active session state:

- Tracks session timeouts and inactivity periods
- Handles automatic session locking after periods of inactivity
- Coordinates with AuthContext for session validation and PIN verification
- Maintains session state (active, locked, expired, inactive)
- Refreshes session activity based on user interaction

## Authentication Flows

### Initial Login/Registration

1. User enters phone number
2. System sends OTP to phone
3. User verifies OTP
4. If email not verified, user is prompted to verify email
5. If PIN not set, user is prompted to set PIN
6. Once all requirements are met, user is fully authenticated

### Email Verification

1. Auth system sends verification email with:
   - One-click verification link with embedded token
   - 6-digit fallback code
2. User either:
   - Clicks the link (preferred) - opens app via deep link, auto-verifies
   - Enters the 6-digit code manually
3. System verifies and updates auth state

### PIN/Biometric Authentication

1. User is prompted for PIN entry
2. On compatible devices, biometric authentication is offered
3. PIN is locally validated against stored hash
4. Failed attempts are tracked with a lockout mechanism
5. Successful validation updates auth state and activates session

## Token Management

The system uses a single-token architecture:

### Auth Token
- **Purpose**: Used for all authenticated API operations
- **Generation**: Created upon successful OTP verification
- **Storage**: Securely stored using platform-specific secure storage
- **Validation**: Validated on each protected operation
- **Expiry**: Automatic logout on token expiration (401/403 responses)

### Token Security

- Stored using platform-specific secure storage mechanisms:
  - Web: localStorage with encryption or IndexedDB
  - Mobile: Capacitor Secure Storage plugin
- Never exposed to client-side JavaScript
- Cleared on logout
- Expiry detection via API response interceptors

## Session Management

The session management system works alongside the authentication system:

### Session States

```typescript
enum SessionStatus {
  Active = 'active',    // User authenticated with valid session and PIN
  Locked = 'locked',    // Session locked due to inactivity
  Expired = 'expired',  // Session reached maximum lifetime
  Inactive = 'inactive' // No session exists
}
```

### Session Object

```typescript
interface Session {
  isActive: boolean;    // Whether session is active
  lastActivity: number; // Timestamp of last user activity
  expiresAt: number;    // Timestamp when session expires
  pinVerified: boolean; // Whether PIN has been verified
}
```

### Key Session Features

- **Auto-lock**: Session is automatically locked after a period of inactivity (5 minutes by default)
- **Hard expiry**: Session has a maximum lifetime (24 hours by default)
- **Activity tracking**: User interactions reset the inactivity timer
- **PIN requirement**: Session activation requires PIN verification
- **Platform awareness**: Different storage and security approaches based on platform

## Platform-Specific Implementations

### Mobile Implementation

- Uses Capacitor Secure Storage plugin for secure token storage
- Integrates with device biometric capabilities when available
- Handles app lifecycle events (background/foreground)
- Implements session locking on app backgrounding

### Web Platform

- Uses browser secure storage for tokens
- Implements standard web authentication patterns
- Handles deep links for email verification
- Manages session across multiple tabs through storage events

## Security Considerations

### Token & PIN Security

- Auth token is securely stored using platform-specific mechanisms
- PIN is stored as a secure hash, never in plain text
- Multiple failed PIN attempts result in temporary lockout
- Auth token is never exposed to client-side JavaScript

### API Security

- All sensitive API calls require valid auth token
- Token expiry detection via HTTP status codes (401/403)
- Automatic logout on token expiry
- API calls include device fingerprinting information

### Session Security

- Automatic session locking after inactivity
- Hard session expiry after maximum lifetime
- Session state is securely stored
- PIN verification required for session activation
- Clear session state on logout or token expiry

## Integration Points

### API Service Integration

The authentication system integrates with the API service to:

- Securely attach token to all authenticated requests
- Handle token expiry detection
- Process HTTP 401/403 responses as authentication failures
- Coordinate with auth state management for automatic logout

### UI Integration

The authentication system integrates with the UI via:

- `useAuth()` hook for accessing auth methods and state
- `useSession()` hook for accessing session methods and state
- `<GlobalLockScreen />` component for handling locked sessions
- Auth state-based conditional rendering in page components

## Best Practices

### For Developers

- Always check authentication status before performing sensitive operations
- Use proper hooks (`useAuth()`, `useSession()`) to access authentication functionality
- Never store sensitive data in unprotected state
- Handle potential authentication edge cases (token expiry, session lock, etc.)

### For QA and Testing

- Test all authentication flows thoroughly
- Verify session timeout and expiry behaviors
- Test authentication persistence after app reload
- Ensure secure behavior when app moves to background
