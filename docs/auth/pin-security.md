# PIN Security System

## Overview

The PIN Security system provides a local device authentication layer for 7awel, requiring users to set and enter a Personal Identification Number (PIN) to access the wallet and perform sensitive operations. On supported devices, it also integrates with biometric authentication (fingerprint, face recognition).

## Key Features

- **PIN-based authentication**: 4-6 digit numeric PIN for local device access
- **Biometric alternatives**: Fingerprint/Face ID support on compatible devices
- **Secure storage**: PIN hash stored securely, never as plaintext
- **Brute force protection**: Progressive lockout after failed attempts
- **Automatic session locking**: Session times out after configurable period of inactivity
- **Session validation**: PIN validation required to activate sessions

## Sequence Diagrams

### PIN Setup Flow

```
┌──────┐          ┌─────────────┐          ┌──────────────┐          ┌────────────────┐
│ User │          │ AuthContext │          │ PIN Component │          │ Secure Storage │
└──┬───┘          └──────┬──────┘          └──────┬───────┘          └───────┬────────┘
   │                     │                        │                          │
   │ Navigate to         │                        │                          │
   │ PIN Setup           │                        │                          │
   │ ─────────────────── │                        │                          │
   │                     │                        │                          │
   │ Enter 4-6 digit PIN │                        │                          │
   │ ─────────────────── │                        │                          │
   │                     │                        │                          │
   │                     │                        │ Validate PIN format      │
   │                     │                        │ ──────────┐              │
   │                     │                        │           │              │
   │                     │                        │ <─────────┘              │
   │                     │                        │                          │
   │ Confirm PIN         │                        │                          │
   │ ─────────────────── │                        │                          │
   │                     │                        │                          │
   │                     │                        │ Compare PINs             │
   │                     │                        │ ──────────┐              │
   │                     │                        │           │              │
   │                     │                        │ <─────────┘              │
   │                     │                        │                          │
   │                     │                        │ Hash PIN                 │
   │                     │                        │ ──────────┐              │
   │                     │                        │           │              │
   │                     │                        │ <─────────┘              │
   │                     │                        │                          │
   │                     │                        │ Store PIN hash           │
   │                     │                        │ ───────────────────────> │
   │                     │                        │                          │
   │                     │                        │ Success                  │
   │                     │                        │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
   │                     │                        │                          │
   │                     │ setPin                 │                          │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                           │
   │                     │                        │                          │
   │                     │ PIN_SET event          │                          │
   │                     │ ──────────────┐        │                          │
   │                     │               │        │                          │
   │                     │ <─────────────┘        │                          │
   │                     │                        │                          │
   │ Setup Complete      │                        │                          │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─                        │                          │
   │                     │                        │                          │
```

### Session Activation with PIN

```
┌──────┐          ┌─────────────┐          ┌────────────────┐          ┌────────────────┐
│ User │          │ AuthContext │          │ SessionContext │          │ Secure Storage │
└──┬───┘          └──────┬──────┘          └──────┬─────────┘          └───────┬────────┘
   │                     │                        │                            │
   │ App Launch          │                        │                            │
   │ ─────────────────── │                        │                            │
   │                     │                        │                            │
   │                     │ checkAuthStatus        │                            │
   │                     │ ──────────────┐        │                            │
   │                     │               │        │                            │
   │                     │ <─────────────┘        │                            │
   │                     │                        │                            │
   │                     │                        │ Check session state        │
   │                     │                        │ ──────────────┐            │
   │                     │                        │               │            │
   │                     │                        │ <─────────────┘            │
   │                     │                        │                            │
   │ Show PIN entry      │                        │                            │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                            │
   │                     │                        │                            │
   │ Enter PIN           │                        │                            │
   │ ─────────────────── │                        │                            │
   │                     │                        │                            │
   │                     │                        │ Activate(pin)              │
   │                     │                        │ ──────────────┐            │
   │                     │                        │               │            │
   │                     │                        │ <─────────────┘            │
   │                     │                        │                            │
   │                     │ validatePin(pin)       │                            │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                             │
   │                     │                        │                            │
   │                     │ Get stored PIN hash    │                            │
   │                     │ ──────────────────────────────────────────────────>│
   │                     │                        │                            │
   │                     │ Hash value             │                            │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
   │                     │                        │                            │
   │                     │ Compare PIN hash       │                            │
   │                     │ ──────────────┐        │                            │
   │                     │               │        │                            │
   │                     │ <─────────────┘        │                            │
   │                     │                        │                            │
   │                     │ Validation result      │                            │
   │                     │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─>│                            │
   │                     │                        │                            │
   │                     │                        │ Create active session      │
   │                     │                        │ ──────────────┐            │
   │                     │                        │               │            │
   │                     │                        │ <─────────────┘            │
   │                     │                        │                            │
   │                     │                        │ Store session              │
   │                     │                        │ ────────────────────────>|│
   │                     │                        │                            │
   │ App access granted  │                        │                            │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                            │
   │                     │                        │                            │
```

### Biometric Authentication Flow

```
┌──────┐          ┌─────────────┐          ┌──────────────┐          ┌────────────────┐
│ User │          │ AuthContext │          │ PIN Component │          │ Native Biometric │
└──┬───┘          └──────┬──────┘          └──────┬───────┘          └────┬─────────────┘
   │                     │                        │                       │
   │ App Launch          │                        │                       │
   │ ─────────────────── │                        │                       │
   │                     │                        │                       │
   │                     │                        │ Offer biometric       │
   │                     │                        │ ──────────────────────>
   │                     │                        │                       │
   │ Use Biometric       │                        │                       │
   │ ─────────────────── │                        │                       │
   │                     │                        │                       │
   │                     │                        │ Biometric challenge   │
   │                     │                        │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   │                     │                        │                       │
   │ Provide Biometric   │                        │                       │
   │ (FaceID/Touch)      │                        │                       │
   │ ─────────────────── │                        │                       │
   │                     │                        │                       │
   │                     │                        │ Biometric result      │
   │                     │                        │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   │                     │                        │                       │
   │                     │                        │ If successful, bypass │
   │                     │                        │ PIN verification      │
   │                     │                        │ ──────────┐           │
   │                     │                        │           │           │
   │                     │                        │ <─────────┘           │
   │                     │                        │                       │
   │                     │ activateSession("bio") │                       │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                        │
   │                     │                        │                       │
   │ Access granted      │                        │                       │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─                        │                       │
   │                     │                        │                       │
```

## Implementation Details

### PIN Format & Validation

- PIN length: 4-6 digits (configurable via `PIN_MIN_LENGTH` and `PIN_MAX_LENGTH` constants)
- PIN format: Numeric only
- Validation occurs client-side before any server interaction
- Double-entry verification during setup

### PIN Hashing & Storage

The PIN is never stored in plaintext. Instead:

```typescript
// Hashing function (simplified representation)
async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await pbkdf2(pin, salt, 10000, 64, 'sha512');
  return `${salt}:${hash.toString('hex')}`;
}

// Verification function
async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = await pbkdf2(pin, salt, 10000, 64, 'sha512');
  return hash === verifyHash.toString('hex');
}
```

### Platform-Specific Storage

PIN hashes are stored securely based on platform:

#### Web Platform
- Uses IndexedDB with encryption
- Fallback to localStorage with encryption when necessary
- Hash data is encrypted with a device-specific key

#### Mobile Platform (Capacitor)
- Uses Capacitor Secure Storage plugin
- Leverages device-level security mechanisms
- On Android: Android Keystore System
- On iOS: iOS Keychain

### Brute Force Protection

The system implements progressive rate-limiting for PIN attempts:

```typescript
const MAX_PIN_ATTEMPTS = 3; // Configurable constant
const PIN_LOCKOUT_TIME_MS = 30 * 60 * 1000; // 30 minutes

// Example implementation
async function validatePin(pin: string): Promise<boolean> {
  // Get current attempts from secure storage
  const attempts = await getAttempts();
  
  // Check for lockout
  const lockUntil = await getLockoutTime();
  if (lockUntil && Date.now() < lockUntil) {
    throw new Error("PIN entry is locked due to too many failed attempts");
  }
  
  // Validate PIN
  const isValid = await verifyPin(pin, storedHash);
  
  if (!isValid) {
    // Increment attempts
    await incrementAttempts();
    
    // Check if we should lock
    if (attempts + 1 >= MAX_PIN_ATTEMPTS) {
      await setLockoutTime(Date.now() + PIN_LOCKOUT_TIME_MS);
    }
    
    return false;
  }
  
  // Reset attempts counter on success
  await resetAttempts();
  return true;
}
```

### Integration with Session Management

PIN validation is a requirement for session activation:

```typescript
// In SessionContext.tsx
const activate = async (pin: string): Promise<boolean> => {
  if (authStatus !== AuthStatus.Authenticated) return false;
  
  // Use AuthContext to validate PIN
  const isValid = await validatePin(pin);
  if (!isValid) return false;

  // If PIN is valid, create active session
  const newSession: Session = {
    isActive: true,
    lastActivity: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    pinVerified: true
  };
  
  // Set session and store it securely
  setSession(newSession);
  await storage.setSession(newSession);
  return true;
};
```

### Biometric Authentication

On supported devices, biometric authentication is offered as an alternative to PIN entry:

- Uses Capacitor's BiometricAuth plugin on mobile
- Integration with browser's WebAuthn on compatible browsers
- PIN remains as fallback method
- Biometric auth delegates to native OS security mechanisms

### PIN Reset

The system provides a secure PIN reset flow:

1. User must verify identity through OTP
2. Email verification is required for PIN reset
3. New PIN setup follows standard setup procedure
4. Old PIN hash is completely replaced, not retained

### Security Considerations

- PIN hashes are never accessible from client-side JavaScript
- PIN attempts are tracked to prevent brute force attacks
- Sessions require PIN verification for activation
- PIN reset requires full identity verification
- No server-side PIN storage
- PIN hash is updated whenever PIN changes

## API Reference

The PIN system exposes these key methods in the AuthContext:

```typescript
// AuthContext PIN-related methods
interface AuthContextType {
  // Other auth methods...
  
  // PIN management
  setPin: (pin: string) => Promise<boolean>;
  validatePin: (pin: string) => Promise<boolean>;
  checkPin: (pin: string) => Promise<boolean>; // Non-incrementing check
  resetPin: () => Promise<void>;
  
  // PIN attempt tracking
  isPinLocked: boolean;
  pinLockRemainingMs: number | null;
}
```

## Best Practices for Developers

1. **Never bypass PIN validation** for sensitive operations
2. **Always use the AuthContext methods** for PIN operations
3. **Handle PIN lockouts** gracefully with proper user feedback
4. **Consider platform-specific biometric capabilities** when available
5. **Test PIN flows** thoroughly across different platforms

## Mobile-Specific Enhancements

For the Capacitor implementation, additional security features include:

1. **Screen capture prevention** during PIN entry
2. **Automatic PIN entry** when app returns from background
3. **Biometric authentication** integration with native OS features
4. **Inactivity detection** based on app lifecycle events
5. **Secure element** usage where available for enhanced security
