# 06 - Forgotten PIN

This section describes the flow and implementation for users who have forgotten their PIN.

## Flow Definition (`constants/auth-flows.ts`)
- Uses `FORGOT_PIN_FLOW_STEPS` in `AuthFlowType.FORGOT_PIN`:
  1. `PHONE_ENTRY` → send OTP to phone
  2. `PHONE_OTP_PENDING` → verify phone OTP
  3. `EMAIL_ENTRY_PENDING` → send OTP to email
  4. `EMAIL_OTP_PENDING` → verify email OTP
  5. `TOKEN_ACQUISITION` → acquire new tokens
  6. `PIN_SETUP_PENDING` → set a new PIN
  7. `AUTHENTICATED`

## Step Handlers (`context/auth-step-handlers.ts`)
- Reuses `phoneEntryHandler`, `phoneOtpHandler`, `emailEntryHandler`, `emailOtpHandler`.
- On `TOKEN_ACQUISITION`, `tokenAcquisitionHandler` issues new tokens.
- `pinSetupHandler` prompts user to create a new PIN.

## UI Integration
- Trigger flow via `AuthContext.initiateFlow(AuthFlowType.FORGOT_PIN)`.
- `AuthFlowManager` renders forms for each step.
- `PinChange.tsx` component may be used to guide user through resetting PIN.

## Security & UX
- After `MAX_PIN_ATTEMPTS`, user is forced into forgot-PIN flow.
- Session and tokens are reset (`tokenManager.clearTokens()`) before reset begins.
- Proper error messages (`OTP_EXPIRED`, `AUTH_FAILED`) are shown via `SET_FLOW_ERROR`.

```mermaid
sequenceDiagram
  participant UI
  participant AuthContext
  participant ApiService
  UI->>AuthContext: initiateFlow(FORGOT_PIN)
  AuthContext->>ApiService: sendOtp(phone)
  ApiService-->>AuthContext: 200
  UI->>AuthContext: submit phone OTP
  AuthContext->>ApiService: verifyOtp(phone, otp)
  ...
  AuthContext->>ApiService: acquireToken(phone,email)
  ApiService-->>AuthContext: tokens
  AuthContext->>AuthFlow: pinSetupHandler
  ...
```
