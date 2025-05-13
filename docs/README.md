# Crypto Wallet Authentication Module

## Introduction

The Authentication Module is a core component of the Crypto Wallet application, providing secure authentication, token management, and user identity verification. This module implements a multi-factor authentication (MFA) approach and follows a maintainable three-layer architecture.

## Getting Started

### Prerequisites

- Node.js 16+
- React 18+
- React Native (for mobile implementations)
- Capacitor (for Android/iOS)

### Integration

The authentication module is already integrated into the app via the `AuthProvider` component in the application root. All authentication state and functions are accessible through the `useAuth` hook.

```typescript
// Example usage in a component
import { useAuth } from '@/context/auth/AuthContext';

function LoginScreen() {
  const { initiateFlow, advanceFlow, currentStep, error } = useAuth();
  
  // Use these functions to implement authentication flows
}
```

## Architecture Overview

The authentication system follows a three-layer architecture:

1. **Flow Definitions**: Declarative definitions of authentication flows and steps
2. **Auth Context**: State management and flow coordination 
3. **Step Handlers**: Implementations of individual authentication steps

For detailed architecture documentation, see [auth-architecture.md](./auth-architecture.md).

## Multi-Factor Authentication

The system enforces MFA with:

- Phone verification through OTP
- Email verification through magic links/codes
- PIN authentication for local device validation
- Device fingerprinting for additional security

## Key Components

### Authentication Context

The `AuthContext` provides the authentication state and functions to the application. 

```typescript
const {
  // Authentication State
  authStatus,      // Current auth status (unauthenticated, authenticated, locked)
  currentStep,     // Current step in the active flow
  isLoading,       // Loading state flag
  error,           // Current error, if any
  
  // Functions
  initiateFlow,    // Start a new auth flow (signup, signin, etc.)
  advanceFlow,     // Move to next step in the flow
  logout,          // Log the user out
  resetError       // Clear the current error
} = useAuth();
```

### Specialized Hooks

- `useTokenManager`: Manages authentication tokens
- `usePinManager`: Handles PIN creation, validation, and security
- `useAuthFlow`: Coordinates authentication flow progression

## API Integration

The authentication module interacts with the backend API through the `apiService` for:

- Sending and verifying phone OTPs
- Sending and verifying email magic links
- Token acquisition and refresh
- PIN validation

> Note: The current implementation uses a mock API service. In production, this should be replaced with actual API endpoints.

## Security Considerations

- Tokens are stored securely using `secure-storage`
- PINs are hashed before storage
- Device information is collected for security monitoring
- Failed authentication attempts are tracked and limited
- Session inactivity triggers automatic logout

## Testing

The authentication module includes comprehensive tests:

- Unit tests for all specialized hooks
- Tests for step handlers and authentication flows
- Integration tests for the complete authentication process

To run the tests:

```bash
npm test -- --testPathPattern=tests/auth
```

## Troubleshooting

Common issues:

1. **Token Expiration**: If users experience unexpected logouts, check the token expiration logic in `useTokenManager.ts`
2. **PIN Lock-Out**: Users locked out due to too many PIN attempts will need to use the "Forgot PIN" flow
3. **Device Change**: Users changing devices may need to complete the full MFA flow again

## Contributing

When extending the authentication module:

1. Add new steps to `auth-steps.ts`
2. Define flow transitions in `auth-flows.ts`
3. Implement handlers in `auth-step-handlers.ts`
4. Add tests for new components
5. Update documentation as necessary
