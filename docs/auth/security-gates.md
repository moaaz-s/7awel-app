# Security Gates System

## Overview

The Security Gates system provides a mechanism to protect sensitive operations in the 7awel wallet by requiring explicit re-verification of one or more authentication factors before allowing the operation to proceed. This document describes the architecture, implementation, and usage of the security gates.

## Key Features

- **Multiple verification methods**: Supports PIN, phone OTP, and email code verification
- **Configurable requirements**: Different actions require different verification methods
- **Progressive security**: Escalating requirements based on operation sensitivity
- **Modular implementation**: Easily attach to any sensitive component or action
- **Stateful tracking**: Remembers verification state during the gate flow
- **Cross-platform compatibility**: Works on both web and mobile
- **Session integration**: Works alongside the session management system

## Verification Methods

The system supports three primary verification methods:

1. **PIN Verification**: User enters their 4-6 digit PIN (or biometric alternative)
2. **Phone OTP**: One-time code sent to the user's registered phone
3. **Email Code**: One-time code sent to the user's verified email

## Security Levels and Action Requirements

```typescript
// Define verification methods
enum VerificationMethod {
  PIN = "pin",
  PHONE_OTP = "phone_otp",
  EMAIL_CODE = "email_code"
}

// Define action types that require security gates
enum SecuredAction {
  VIEW_BALANCE = "view_balance",
  SMALL_TRANSFER = "small_transfer",       // < $100
  MEDIUM_TRANSFER = "medium_transfer",     // $100 - $1000
  LARGE_TRANSFER = "large_transfer",       // > $1000
  CHANGE_PIN = "change_pin",
  CHANGE_EMAIL = "change_email",
  CHANGE_SECURITY_SETTINGS = "change_security_settings",
  EXPORT_WALLET = "export_wallet",
  DELETE_ACCOUNT = "delete_account"
}

// Define action requirements
const actionSecurityRequirements: Record<SecuredAction, VerificationMethod[]> = {
  // Basic actions
  [SecuredAction.VIEW_BALANCE]: [],  // No additional verification
  
  // Transfer-related actions
  [SecuredAction.SMALL_TRANSFER]: [VerificationMethod.PIN],
  [SecuredAction.MEDIUM_TRANSFER]: [VerificationMethod.PIN, VerificationMethod.PHONE_OTP],
  [SecuredAction.LARGE_TRANSFER]: [VerificationMethod.PIN, VerificationMethod.PHONE_OTP, VerificationMethod.EMAIL_CODE],
  
  // Security-related actions
  [SecuredAction.CHANGE_PIN]: [VerificationMethod.PIN, VerificationMethod.PHONE_OTP],
  [SecuredAction.CHANGE_EMAIL]: [VerificationMethod.PIN, VerificationMethod.PHONE_OTP],
  [SecuredAction.CHANGE_SECURITY_SETTINGS]: [VerificationMethod.PIN, VerificationMethod.PHONE_OTP],
  
  // Critical actions
  [SecuredAction.EXPORT_WALLET]: [VerificationMethod.PIN, VerificationMethod.PHONE_OTP, VerificationMethod.EMAIL_CODE],
  [SecuredAction.DELETE_ACCOUNT]: [VerificationMethod.PIN, VerificationMethod.PHONE_OTP, VerificationMethod.EMAIL_CODE],
}
```

## Sequence Diagrams

### Basic Gate Flow (PIN Only)

```
┌──────┐          ┌─────────────┐          ┌──────────────┐          ┌───────────────┐
│ User │          │ SecurityGate │          │ PIN Component │          │ AuthContext   │
└──┬───┘          └──────┬──────┘          └──────┬───────┘          └───────┬───────┘
   │                     │                        │                          │
   │ Attempt            │                         │                          │
   │ sensitive action   │                         │                          │
   │ ─────────────────> │                         │                          │
   │                    │                         │                          │
   │                    │ Check requirements      │                          │
   │                    │ ──────────────┐         │                          │
   │                    │               │         │                          │
   │                    │ <─────────────┘         │                          │
   │                    │                         │                          │
   │                    │ Render PIN component    │                          │
   │                    │ ────────────────────────>                          │
   │                    │                         │                          │
   │ Enter PIN          │                         │                          │
   │ ────────────────────────────────────────────>│                          │
   │                    │                         │                          │
   │                    │                         │ validatePin              │
   │                    │                         │ ────────────────────────>│
   │                    │                         │                          │
   │                    │                         │ Success/Failure          │
   │                    │                         │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
   │                    │                         │                          │
   │                    │ Verification result     │                          │
   │                    │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                          │
   │                    │                         │                          │
   │                    │ If success,             │                          │
   │                    │ allow action            │                          │
   │                    │ ──────────────┐         │                          │
   │                    │               │         │                          │
   │                    │ <─────────────┘         │                          │
   │                    │                         │                          │
   │ Action completed   │                         │                          │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ │                         │                          │
   │                    │                         │                          │
```

### Advanced Gate Flow (Multiple Factors)

```
┌──────┐          ┌─────────────┐          ┌──────────────┐          ┌──────────┐          ┌─────────┐
│ User │          │ SecurityGate │          │ PIN Component │          │ OtpVerify │          │ API Svc │
└──┬───┘          └──────┬──────┘          └──────┬───────┘          └──────┬─────┘          └─────┬─────┘
   │                     │                        │                         │                      │
   │ Attempt            │                         │                         │                      │
   │ sensitive action   │                         │                         │                      │
   │ ─────────────────> │                         │                         │                      │
   │                    │                         │                         │                      │
   │                    │ Check requirements      │                         │                      │
   │                    │ ──────────────┐         │                         │                      │
   │                    │               │         │                         │                      │
   │                    │ <─────────────┘         │                         │                      │
   │                    │                         │                         │                      │
   │                    │ Render PIN component    │                         │                      │
   │                    │ ────────────────────────>                         │                      │
   │                    │                         │                         │                      │
   │ Enter PIN          │                         │                         │                      │
   │ ────────────────────────────────────────────>│                         │                      │
   │                    │                         │                         │                      │
   │                    │ PIN verified            │                         │                      │
   │                    │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                         │                      │
   │                    │                         │                         │                      │
   │                    │ Render OTP component    │                         │                      │
   │                    │ ─────────────────────────────────────────────────>│                      │
   │                    │                         │                         │                      │
   │                    │                         │                         │ Send OTP request     │
   │                    │                         │                         │ ─────────────────────>
   │                    │                         │                         │                      │
   │ Receive OTP        │                         │                         │                      │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
   │                    │                         │                         │                      │
   │ Enter OTP          │                         │                         │                      │
   │ ────────────────────────────────────────────────────────────────────>|│                      │
   │                    │                         │                         │                      │
   │                    │                         │                         │ verifyOtp            │
   │                    │                         │                         │ ─────────────────────>
   │                    │                         │                         │                      │
   │                    │                         │                         │ Success/Failure      │
   │                    │                         │                         │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
   │                    │                         │                         │                      │
   │                    │ OTP verified            │                         │                      │
   │                    │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                      │
   │                    │                         │                         │                      │
   │                    │ Allow action            │                         │                      │
   │                    │ ──────────────┐         │                         │                      │
   │                    │               │         │                         │                      │
   │                    │ <─────────────┘         │                         │                      │
   │                    │                         │                         │                      │
   │ Action completed   │                         │                         │                      │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ │                         │                         │                      │
   │                    │                         │                         │                      │
```

## Implementation Details

### Security Gate Component

The core `SecurityGate` component manages the verification flow:

```tsx
interface SecurityGateProps {
  action: SecuredAction;
  onSuccess: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

const SecurityGate: React.FC<SecurityGateProps> = ({ 
  action, 
  onSuccess, 
  onCancel,
  children 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const requiredMethods = actionSecurityRequirements[action] || [];
  
  // Skip if no verification required
  useEffect(() => {
    if (requiredMethods.length === 0) {
      setVerificationComplete(true);
    }
  }, [requiredMethods]);
  
  // Trigger success callback when all verification steps complete
  useEffect(() => {
    if (verificationComplete) {
      onSuccess();
    }
  }, [verificationComplete, onSuccess]);
  
  const handleStepComplete = useCallback(() => {
    if (currentStep < requiredMethods.length - 1) {
      setCurrentStep(step => step + 1);
    } else {
      setVerificationComplete(true);
    }
  }, [currentStep, requiredMethods]);
  
  // Skip rendering verification UI if no methods required
  if (requiredMethods.length === 0) {
    return <>{children}</>;
  }
  
  // If verification complete, render children
  if (verificationComplete) {
    return <>{children}</>;
  }
  
  // Otherwise, render the appropriate verification component
  const currentMethod = requiredMethods[currentStep];
  
  return (
    <VerificationContainer title={`Security Verification (${currentStep + 1}/${requiredMethods.length})`}>
      {currentMethod === VerificationMethod.PIN && (
        <PinVerification 
          onVerify={handleStepComplete} 
          onCancel={onCancel} 
        />
      )}
      
      {currentMethod === VerificationMethod.PHONE_OTP && (
        <PhoneOtpVerification 
          onVerify={handleStepComplete} 
          onCancel={onCancel}
        />
      )}
      
      {currentMethod === VerificationMethod.EMAIL_CODE && (
        <EmailCodeVerification 
          onVerify={handleStepComplete} 
          onCancel={onCancel}
        />
      )}
    </VerificationContainer>
  );
};
```

### Integration with Session Management

The security gates system coordinates with the session management system to handle verification states:

```typescript
// Check if a PIN verification is needed or if the session is already active
const checkPinVerification = (action: SecuredAction): boolean => {
  const { session, getStatus } = useSession();
  const securityLevel = getSecurityLevel(action);
  
  // For highest security actions, always require fresh PIN verification
  if (securityLevel === SecurityLevel.CRITICAL) {
    return true;
  }
  
  // For high security actions, use PIN if session idle time > 2 minutes
  if (securityLevel === SecurityLevel.HIGH) {
    return Date.now() - session.lastActivity > 2 * 60 * 1000;
  }
  
  // For medium security actions, use PIN if session status isn't Active
  if (securityLevel === SecurityLevel.MEDIUM) {
    return getStatus(session) !== SessionStatus.Active;
  }
  
  // For low security actions, don't require PIN if session exists
  return session ? false : true;
};
```

### Verification Components

Individual verification components handle the specific verification methods:

#### PIN Verification

```tsx
const PinVerification: React.FC<VerificationComponentProps> = ({ onVerify, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { validatePin } = useAuth();
  
  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isValid = await validatePin(pin);
      
      if (isValid) {
        onVerify();
      } else {
        setError('Incorrect PIN. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
      console.error('PIN verification error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <VerificationStep 
      title="Enter Your PIN"
      description="Please enter your PIN to authorize this action."
      error={error}
      loading={loading}
    >
      <PinEntry 
        value={pin}
        onChange={setPin}
        onComplete={handleVerify}
      />
      <Button onClick={handleVerify} disabled={pin.length < 4 || loading}>
        Verify
      </Button>
      {onCancel && (
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </VerificationStep>
  );
};
```

### Hooks

The security gates system provides hooks for easy integration:

```typescript
// Hook for using security gates declaratively
export function useSecurityGate(action: SecuredAction) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const startVerification = useCallback(() => {
    setIsVerifying(true);
  }, []);
  
  const handleVerified = useCallback(() => {
    setIsVerifying(false);
    setIsVerified(true);
    
    // Reset after 5 minutes
    const timeout = setTimeout(() => {
      setIsVerified(false);
    }, 5 * 60 * 1000);
    
    return () => clearTimeout(timeout);
  }, []);
  
  const cancelVerification = useCallback(() => {
    setIsVerifying(false);
  }, []);
  
  return {
    isVerifying,
    isVerified,
    startVerification,
    cancelVerification,
    SecurityGate: isVerifying ? (
      <SecurityGate 
        action={action} 
        onSuccess={handleVerified} 
        onCancel={cancelVerification} 
      />
    ) : null
  };
}
```

## Usage Examples

### Protecting a Send Money Action

```tsx
function SendMoneyScreen() {
  const { amount, recipient } = useTransferParams();
  
  // Determine security level based on amount
  const getSecurityAction = () => {
    if (amount < 100) {
      return SecuredAction.SMALL_TRANSFER;
    } else if (amount < 1000) {
      return SecuredAction.MEDIUM_TRANSFER;
    } else {
      return SecuredAction.LARGE_TRANSFER;
    }
  };
  
  const securityAction = getSecurityAction();
  const { 
    isVerifying, 
    isVerified, 
    startVerification,
    SecurityGate
  } = useSecurityGate(securityAction);
  
  const handleSendMoney = useCallback(() => {
    if (isVerified) {
      // Proceed with transfer
      processTransfer(amount, recipient);
    } else {
      // Start verification process
      startVerification();
    }
  }, [isVerified, startVerification, amount, recipient]);
  
  return (
    <Screen>
      <TransferSummary amount={amount} recipient={recipient} />
      
      <Button onClick={handleSendMoney}>
        Send Money
      </Button>
      
      {/* Security Gate renders when verification is needed */}
      {SecurityGate}
    </Screen>
  );
}
```

### Protecting Settings Changes

```tsx
function SecuritySettingsScreen() {
  const { 
    isVerifying, 
    isVerified, 
    startVerification,
    SecurityGate
  } = useSecurityGate(SecuredAction.CHANGE_SECURITY_SETTINGS);
  
  useEffect(() => {
    // Start verification immediately when entering security settings
    if (!isVerified && !isVerifying) {
      startVerification();
    }
  }, [isVerified, isVerifying, startVerification]);
  
  // Only show settings if verified
  return (
    <Screen>
      {isVerified ? (
        <SecuritySettingsForm />
      ) : (
        <LoadingIndicator message="Verifying identity..." />
      )}
      
      {SecurityGate}
    </Screen>
  );
}
```

## Integration with Auth Token

The security gates system uses the single auth token for all authenticated operations:

```typescript
// When verifying through OTP or Email Code
async function verifyOtp(otp: string) {
  try {
    const result = await apiService.verifySecurityGateOtp(otp);
    
    if (result.success) {
      // The auth token is already in use, no need to update tokens
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
}
```

## Security Considerations

- **Time-bound verification**: Verification is temporary and expires after a configurable period
- **Progressive security requirements**: More sensitive actions require more verification steps
- **Session integration**: Coordinates with the session management system to avoid unnecessary re-verification
- **Consistent UX**: Similar UI across different verification methods
- **Proper error handling**: Clear feedback for failed verification attempts
- **Idempotent verification**: Multiple verification attempts for the same action don't cause side effects
- **Protected API endpoints**: All verification endpoints require the valid auth token
- **Audit logging**: All security gate verifications are logged for security review

## Best Practices for Developers

1. **Use declarative API**: Always use the `useSecurityGate` hook rather than direct component usage
2. **Proper action classification**: Carefully categorize actions based on their sensitivity
3. **Handle verification states**: Always account for all states (pending, success, failure)
4. **Clear user messaging**: Explain why verification is needed and what the user should expect
5. **Timeout handling**: Set appropriate timeouts for verification processes
6. **Error recovery**: Provide users with clear paths to recover from verification failures
7. **Security audit**: Regularly review which actions require which verification methods
