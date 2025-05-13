# Email Verification System

## Overview

The email verification system provides a secure mechanism to verify user email addresses using both one-click verification links and fallback verification codes. This document details the implementation, flows, and security considerations.

## Key Features

- **One-click verification**: Users can verify their email by simply clicking a link
- **Code fallback**: 6-digit verification code for manual entry if link doesn't work
- **Cross-platform support**: Works on both web and mobile via deep linking
- **Secure token generation**: One-time use tokens with limited validity period
- **Consistent UI**: Same OTP verification component used for both phone and email verification

## Sequence Diagrams

### Primary Flow: Email Verification with Link

```
┌──────┐          ┌─────────────┐          ┌───────────┐          ┌────────┐          ┌─────────────┐
│ User │          │ AuthContext │          │ ApiService │          │ Email  │          │ Browser/App │
└──┬───┘          └──────┬──────┘          └─────┬─────┘          └───┬────┘          └──────┬──────┘
   │                     │                       │                    │                       │
   │ Signup/Login        │                       │                    │                       │
   │ ─────────────────── │                       │                    │                       │
   │                     │                       │                    │                       │
   │                     │ sendEmailVerification │                    │                       │
   │                     │ ─────────────────────>│                    │                       │
   │                     │                       │                    │                       │
   │                     │                       │ Generate token & code                      │
   │                     │                       │ ───────────────────┐                       │
   │                     │                       │                    │                       │
   │                     │                       │ Send email with link & code               │
   │                     │                       │ ───────────────────>                      │
   │                     │                       │                    │                       │
   │                     │                       │                    │ User clicks link      │
   │                     │                       │                    │ ──────────────────────>
   │                     │                       │                    │                       │
   │                     │                       │                    │                       │
   │                     │                       │                    │ Opens app with token  │
   │                     │                       │                    │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   │                     │                       │                    │                       │
   │                     │ verifyEmailToken      │                    │                       │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
   │                     │                       │                    │                       │
   │                     │ verifyEmailToken      │                    │                       │
   │                     │ ─────────────────────>│                    │                       │
   │                     │                       │                    │                       │
   │                     │                       │ Validate token     │                       │
   │                     │                       │ ──────────┐        │                       │
   │                     │                       │           │        │                       │
   │                     │                       │ <─────────┘        │                       │
   │                     │                       │                    │                       │
   │                     │ Success response      │                    │                       │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                    │                       │
   │                     │                       │                    │                       │
   │                     │ EMAIL_VERIFIED event  │                    │                       │
   │                     │ ──────────────┐       │                    │                       │
   │                     │               │       │                    │                       │
   │                     │ <─────────────┘       │                    │                       │
   │                     │                       │                    │                       │
   │ Redirect to app     │                       │                    │                       │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─                       │                    │                       │
   │                     │                       │                    │                       │
```

### Fallback Flow: Manual Code Entry

```
┌──────┐          ┌─────────────┐          ┌───────────┐          ┌────────┐
│ User │          │ AuthContext │          │ ApiService │          │ Email  │
└──┬───┘          └──────┬──────┘          └─────┬─────┘          └───┬────┘
   │                     │                       │                    │
   │ Navigate to verify  │                       │                    │
   │ ─────────────────── │                       │                    │
   │                     │                       │                    │
   │ Enter 6-digit code  │                       │                    │
   │ ─────────────────── │                       │                    │
   │                     │                       │                    │
   │                     │ verifyEmailCode       │                    │
   │                     │ ─────────────────────>│                    │
   │                     │                       │                    │
   │                     │                       │ Validate code      │
   │                     │                       │ ──────────┐        │
   │                     │                       │           │        │
   │                     │                       │ <─────────┘        │
   │                     │                       │                    │
   │                     │ Success response      │                    │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                    │
   │                     │                       │                    │
   │                     │ EMAIL_VERIFIED event  │                    │
   │                     │ ──────────────┐       │                    │
   │                     │               │       │                    │
   │                     │ <─────────────┘       │                    │
   │                     │                       │                    │
   │ Success notification│                       │                    │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─                       │                    │
   │                     │                       │                    │
```

## Implementation Details

### Email Template

The email template (`utils/email-templates.ts`) is designed to be:
- Responsive on all devices
- Clear with prominent CTA button
- Brand-consistent with 7awwl styling
- Includes both verification link and fallback code
- Properly explains next steps to the user

### API Methods

```typescript
// Send verification email
async sendEmailVerification(email: string): Promise<ApiResponse<SendEmailVerificationResponse>>

// Verify with token from link
async verifyEmailToken(token: string): Promise<ApiResponse<EmailVerificationResponse>>

// Verify with code
async verifyEmailCode(code: string): Promise<ApiResponse<EmailVerificationResponse>>
```

### Components

**OtpVerification Component**
The same OTP verification component used for phone verification is reused for email code verification, providing:
- 6-digit code entry with auto-focusing
- Paste support for easier entry
- Visual indication of errors
- Countdown timer for resending

**Verify Email Page**
The verification page (`app/verify-email/page.tsx`) handles:
- Auto-detection of token from URL params
- Automatic verification for deep links
- Fallback to manual entry when needed
- Clear error states and success notifications

### Deep Link Handling

#### Web Platform
Uses standard URL parameters to capture the verification token.

#### Android Platform
Requires configuration in the Android manifest:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="app.7awwl.com"
          android:pathPrefix="/verify-email"/>
</intent-filter>
```

#### iOS Platform
Requires associated domains configuration in the app's entitlements.

## Security Considerations

- **Token expiry**: Verification tokens expire after 10 minutes
- **One-time use**: Tokens can only be used once
- **Rate limiting**: Limits on verification attempts prevent brute force attacks
- **Secure transmission**: Links use HTTPS protocol
- **Clear user communication**: Email clearly indicates it's for verification

## Error Handling

The system handles various error scenarios:
- Invalid/expired tokens or codes
- Network failures during verification
- Device switching during verification process
- Missing email addresses

## Integration with Auth State Machine

Email verification is integrated into the authentication state machine:
- `OTP_VERIFIED` event can transition to `EmailVerificationPending` state
- `EMAIL_VERIFIED` event transitions from `EmailVerificationPending` to appropriate next state
- `AppInitializer` routes users to verification page when in `EmailVerificationPending` state

## Future Enhancements

- Internationalization for email templates
- Rich HTML templates with improved branding
- Analytics to track verification success rates
- Automatic retry mechanisms with exponential backoff
