# 01 - Concepts

This section defines key terms and enums used across the authentication system:

- **Access Token**: Short-lived JWT used to authorize API requests.
- **Refresh Token**: Long-lived token used to obtain new access tokens when expired.
- **Session**: Represents a user’s active app session post-PIN verification (`isActive`, `expiresAt`, `lastActivity`, `pinVerified`).
- **PIN Session**: Subset of session where the user has verified their PIN.
- **Single-Flight Refresh**: Ensures only one token-refresh call runs concurrently to avoid duplicate network requests.
- **Lockout**: Temporary block after too many invalid PIN or OTP attempts.

**Enums & Constants**:

- `AuthStatus` (context/auth/auth-state-machine.ts):
  - `Pending`, `OtpPending`, `RequiresPin`, `PinSetupPending`, `Authenticated`, `Unauthenticated`, `Locked`, `Error`

- `AuthStep` (constants/auth-steps.ts):
  - `PHONE_ENTRY`, `PHONE_OTP_PENDING`, `EMAIL_ENTRY_PENDING`, `EMAIL_OTP_PENDING`, `PIN_SETUP_PENDING`, `PIN_ENTRY_PENDING`, `TOKEN_ACQUISITION`, `AUTHENTICATED`, `LOCKED`

- Error codes (`ErrorCode` enum) for API responses, e.g., `PHONE_ALREADY_REGISTERED`, `OTP_EXPIRED`, `PIN_INVALID_ATTEMPTS`, etc.
