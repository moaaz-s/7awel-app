# 04 - Auth Flows

This section describes how the authentication flows are defined and orchestrated.

## Flow Definitions (`constants/auth-flows.ts`)

- **AuthFlowType**
  - `SIGNUP`, `SIGNIN`, `FORGOT_PIN`

- **FlowStep**
  ```ts
  interface FlowStep {
    step: AuthStep;
    condition?: (ctx: FlowCtx) => boolean;
  }
  ```

- **SIGNUP_FLOW_STEPS, SIGNIN_FLOW_STEPS, FORGOT_PIN_FLOW_STEPS**
  - Ordered arrays of `FlowStep` with predicates to include/exclude steps based on context.

## Flow Context (`FlowCtx`)

```ts
interface FlowCtx {
  tokenValid: boolean;
  phoneValidated: boolean;
  emailVerified: boolean;
  pinSet: boolean;
  pinVerified: boolean;
  sessionActive: boolean;
  otpExpiry?: number;
  emailOtpExpiry?: number;
}
```

## Steps (`AuthStep` in `constants/auth-steps.ts`)

- `AUTH_STEP_PHONE_ENTRY`
- `AUTH_STEP_PHONE_OTP_PENDING`
- `AUTH_STEP_EMAIL_ENTRY_PENDING`
- `AUTH_STEP_EMAIL_OTP_PENDING`
- `AUTH_STEP_TOKEN_ACQUISITION`
- `AUTH_STEP_USER_PROFILE_PENDING` (signup only)
- `AUTH_STEP_PIN_SETUP_PENDING`
- `AUTH_STEP_PIN_ENTRY_PENDING`
- `AUTH_STEP_AUTHENTICATED`

## Flow Engine (`useFlow`)

- **Initialization**: `authFlow.initiateFlow(flowType)` sets up unfiltered steps.
- **Next Step**: calls `getNextValidIndex()` to find the next step whose `condition(ctx)` is true.
- **Handlers**: maps each `AuthStep` to its handler in `STEP_HANDLERS`.

### Sequence Diagram

```mermaid
sequenceDiagram
  participant UI
  participant AuthFlow
  participant Handler
  participant API

  UI->>AuthFlow: initiateFlow(SIGNIN)
  AuthFlow->>Handler: phoneEntryHandler
  Handler->>API: sendOtp(phone)
  API-->>Handler: 200 OK
  Handler-->>AuthFlow: nextData(phoneValidated)

  AuthFlow->>UI: render OTP form
  UI->>AuthFlow: submit OTP
  AuthFlow->>Handler: phoneOtpHandler
  Handler->>API: verifyOtp(phone, otp)
  ...
```

## Step Handlers (`context/auth-step-handlers.ts`)

- `phoneEntryHandler`
- `phoneOtpHandler`
- `emailEntryHandler`
- `emailOtpHandler`
- `pinSetupHandler`
- `pinEntryHandler`
- `tokenAcquisitionHandler`

Each handler:
1. Validates inputs (phone, email, OTP, PIN).
2. Calls `apiService` endpoints.
3. Dispatches errors via `SET_FLOW_ERROR` or `LOCKOUT`.
4. Returns `{ nextStep?, nextData }` to advance the flow.
