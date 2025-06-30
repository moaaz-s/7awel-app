# buildFlowState Method Documentation

## Overview

The `buildFlowState` method is a critical function in the authentication flow orchestrator that constructs a complete authentication flow state by merging static data with dynamically computed values. It serves as the single source of truth for the current authentication state throughout the application.

## Method Signature

```typescript
export async function buildFlowState(
  currentState: Partial<AuthFlowState>,
  updates?: Partial<AuthFlowState>
): Promise<AuthFlowState>
```

## Purpose

The `buildFlowState` method:
1. Merges the current state with any updates
2. Computes dynamic authentication values in parallel
3. Fetches user data if needed
4. Returns a complete, validated authentication flow state

## Key Features

### 1. Parallel Computation
The method efficiently computes three critical values in parallel:
- **Session Status**: Checks if there's an active session via `getSession()`
- **Token Validity**: Validates authentication tokens via `hasValidToken()`
- **PIN Setup Status**: Checks if user has set up their PIN via `serviceIsPinSet()`

### 2. Session Activity Validation
```typescript
const sessionActive = Boolean(session && session.isActive && session.expiresAt > Date.now());
```
The session is considered active only when:
- A session exists
- The `isActive` flag is true
- The session hasn't expired (current time < expiry time)

### 3. User Data Fetching
If a valid token exists but user data is missing, the method automatically fetches it:
```typescript
if (tokenValid && !user) {
  const getUserRes = await userService.getUser();
  // Handle response...
}
```

## Impacted Files and Areas

### Direct Dependencies

1. **Import Sources**
   - `@/utils/session-service`: For session management (`getSession`)
   - `@/utils/token-service`: For token validation (`hasValidToken`)
   - `@/services/pin-service`: For PIN status (`serviceIsPinSet`)
   - `@/services/user-service`: For user data fetching
   - `@/utils/logger`: For debugging logs

2. **Type Dependencies**
   - `AuthFlowState`: The primary state interface
   - `Session`: Session data structure
   - `User`: User profile structure

### Files That Use buildFlowState

1. **AuthContext.tsx**
   - Called during initialization to set up initial state
   - Called in `advanceFlow` to update state after flow progression
   - Example usage:
   ```typescript
   const newFlowState = await buildFlowState(state.flowState, orchestrationResult.flowState);
   ```

2. **flowsOrchestrator.ts** (Internal Usage)
   - Used within other orchestration functions
   - Ensures consistent state building across the module

### Impacted Authentication Areas

1. **Session Management**
   - Determines if user needs to re-authenticate
   - Affects idle timeout behavior
   - Controls session-based access restrictions

2. **Token Management**
   - Validates token state for API access
   - Determines if token refresh is needed
   - Controls authenticated vs unauthenticated flows

3. **PIN Security**
   - Determines if PIN setup is required
   - Controls access to PIN-protected features
   - Affects the authentication flow progression

4. **User Profile**
   - Ensures user data is available when authenticated
   - Prevents unnecessary API calls with caching
   - Provides user context for personalization

## Flow State Properties

The method returns a complete `AuthFlowState` object with these key properties:

```typescript
interface AuthFlowState {
  // Static data (from input)
  phoneNumber?: string;
  countryCode?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  
  // Computed values
  tokenValid: boolean;      // From hasValidToken()
  sessionActive: boolean;   // Computed from session data
  pinSet: boolean;         // From serviceIsPinSet()
  
  // Fetched data
  user?: User;             // From userService.getUser()
  
  // Session data
  session?: Session;       // Current session if exists
  
  // Flow control flags
  phoneValidated?: boolean;
  emailVerified?: boolean;
  pinVerified?: boolean;
  sessionCreationRequested?: boolean;
  
  // OTP management
  phoneOtpExpires?: number;
  emailOtpExpires?: number;
  
  // Error handling
  error?: string;
}
```

## Critical Behaviors

### 1. State Merging Priority
```typescript
return {
  ...mergedState,           // Base state
  tokenValid,              // Override with computed
  sessionActive,           // Override with computed
  pinSet: pinSetFlag || mergedState.pinSet || false,  // Computed OR existing
  user: user || mergedState.user,  // Fetched OR existing
  session
};
```

### 2. Error Handling
- Logs warnings for user fetch failures but doesn't throw
- Returns partial state even if some operations fail
- Ensures the flow can continue with degraded functionality

### 3. Performance Optimization
- Uses `Promise.all()` for parallel execution
- Avoids redundant user fetches when data exists
- Minimal blocking operations

## Usage Guidelines

### When to Call buildFlowState

1. **Initial Authentication Setup**
   ```typescript
   const initialFlowState = await buildFlowState(initialState);
   ```

2. **After Flow Step Advancement**
   ```typescript
   const updatedState = await buildFlowState(currentState, stepUpdates);
   ```

3. **When Refreshing Authentication State**
   ```typescript
   const refreshedState = await buildFlowState(state.flowState);
   ```

### Best Practices

1. **Always await the result** - The method is async and performs I/O operations
2. **Handle the complete state** - Don't assume partial properties exist
3. **Use for state reconciliation** - When multiple sources might have updated state
4. **Log state changes** - For debugging authentication issues

## Common Issues and Solutions

### Issue 1: Session Shows as Inactive
**Symptom**: `sessionActive` is false despite valid session
**Cause**: Either `isActive` flag is false or session has expired
**Solution**: Check both `session.isActive` and `session.expiresAt`

### Issue 2: User Data Not Loading
**Symptom**: `user` is undefined despite valid token
**Cause**: API call failure or network issues
**Solution**: Check logs for user fetch errors, verify token validity

### Issue 3: PIN Status Incorrect
**Symptom**: `pinSet` doesn't match actual PIN status
**Cause**: Cache inconsistency or service error
**Solution**: Clear PIN service cache, verify PIN setup flow

## Testing Considerations

When testing code that uses `buildFlowState`:

1. **Mock all service dependencies**
   ```typescript
   jest.mock('@/utils/session-service');
   jest.mock('@/utils/token-service');
   jest.mock('@/services/pin-service');
   jest.mock('@/services/user-service');
   ```

2. **Test parallel execution**
   - Verify all three async operations run concurrently
   - Test with different timing scenarios

3. **Test state merging**
   - Verify updates override current state correctly
   - Test with partial states

4. **Test error scenarios**
   - User fetch failures
   - Invalid sessions
   - Expired tokens

## Future Considerations

1. **Caching Strategy**
   - Consider caching computed values for performance
   - Implement TTL for cached states

2. **State Validation**
   - Add schema validation for state consistency
   - Implement state invariants checking

3. **Event Emission**
   - Consider emitting events when state changes
   - Enable reactive updates across the app

## Conclusion

The `buildFlowState` method is a cornerstone of the authentication system, providing a reliable way to construct complete authentication state from multiple sources. Its parallel execution pattern and intelligent merging strategy ensure both performance and correctness in managing complex authentication flows.
