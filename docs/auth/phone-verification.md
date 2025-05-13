# Phone Verification System

## Overview

The phone verification system is the primary authentication method for 7awel users, providing a secure, phone-based verification process using one-time passcodes (OTP). This document outlines the implementation, flows, and security considerations.

## Key Features

- **Multi-channel verification**: 
  - SMS-based verification: Secure OTP codes sent via SMS
  - WhatsApp verification: OTP codes sent via WhatsApp
  - Telegram verification: OTP codes sent via Telegram
- **Channel selection**: Users can choose their preferred verification channel
- **Rate limiting**: Protection against brute force attempts
- **Retry mechanisms**: User-friendly resend capabilities with appropriate cooldown
- **Cross-platform implementation**: Works consistently across web and mobile
- **Validation and formatting**: Phone number validation and standardization

## Sequence Diagrams

### Login/Registration Flow

```
┌──────┐          ┌─────────────┐          ┌───────────┐          ┌─────────────────┐
│ User │          │ AuthContext │          │ ApiService │          │ SMS/WhatsApp/TG │
└──┬───┘          └──────┬──────┘          └─────┬─────┘          └────────┬────────┘
   │                     │                       │                         │
   │ Enter Phone Number  │                       │                         │
   │ and select channel  │                       │                         │
   │ ─────────────────── │                       │                         │
   │                     │                       │                         │
   │                     │ login/signup          │                         │
   │                     │ (with channel)        │                         │
   │                     │ ─────────────────────>│                         │
   │                     │                       │                         │
   │                     │                       │ Validate Phone          │
   │                     │                       │ ──────────┐             │
   │                     │                       │           │             │
   │                     │                       │ <─────────┘             │
   │                     │                       │                         │
   │                     │                       │ Generate OTP            │
   │                     │                       │ ───────────────────────>│
   │                     │                       │                         │
   │                     │                       │                         │ Send OTP via
   │                     │                       │                         │ selected channel
   │                     │                       │                         │ ──────────┐
   │                     │                       │                         │           │
   │                     │                       │                         │ <─────────┘
   │                     │                       │                         │
   │                     │ Success response      │                         │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                         │
   │                     │                       │                         │
   │ Receive OTP         │                       │                         │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   │                     │                       │                         │
   │ Enter OTP           │                       │                         │
   │ ─────────────────── │                       │                         │
   │                     │                       │                         │
   │                     │ verifyOtp             │                         │
   │                     │ ─────────────────────>│                         │
   │                     │                       │                         │
   │                     │                       │ Validate OTP            │
   │                     │                       │ ──────────┐             │
   │                     │                       │           │             │
   │                     │                       │ <─────────┘             │
   │                     │                       │                         │
   │                     │ Auth token + user info│                         │
   │                     │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                         │
   │                     │                       │                         │
   │                     │ OTP_VERIFIED event    │                         │
   │                     │ ──────────────┐       │                         │
   │                     │               │       │                         │
   │                     │ <─────────────┘       │                         │
   │                     │                       │                         │
   │ Continue to next    │                       │                         │
   │ authentication step │                       │                         │
   │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─                       │                         │
   │                     │                       │                         │
```

## Implementation Details

### OTP Generation and Validation

The OTP system generates secure, random 6-digit codes with:
- Cryptographically secure random number generation
- 6-digit format for user-friendliness
- Short validity period (typically 10 minutes)
- Rate-limited verification attempts

### Messaging Channel Integration

#### SMS Integration
The system integrates with standard SMS messaging services to deliver OTP codes.

#### WhatsApp Integration
The system provides WhatsApp integration through the WhatsApp Business API, allowing for:
- Delivery of OTP messages directly to users' WhatsApp accounts
- Template-based messages for consistent formatting
- Read receipts for more reliable OTP delivery tracking
- Fall back to SMS if WhatsApp is unavailable

#### Telegram Integration
The system integrates with Telegram's API to provide:
- Direct delivery of OTP codes via Telegram bot
- Optional deep linking to automatically open the verification conversation
- End-to-end encrypted transmission of codes
- Fallback to alternative channels if Telegram is unavailable

### Channel Selection UI

The user interface provides options for selecting the preferred verification channel:
- Clear icons for each messaging platform
- Default selection based on previous preference
- Fallback options if first choice fails
- Testing of channel availability before sending OTP

### Components

**OtpVerification Component**
The OTP verification UI component (`components/otp-verification.tsx`) handles:
- 6-digit code entry with auto-focusing
- Paste support for easier entry
- Visual indication of errors
- Countdown timer for resending

**Channel Selection Component**
The channel selection component allows users to choose how they receive their OTP:
- Radio button or toggle selection interface
- Iconic representation of channels (SMS, WhatsApp, Telegram)
- Indication of previously used channel

### API Methods

```typescript
// Send OTP to phone number via specified channel
async login(phone: string, channel?: OtpChannel): Promise<ApiResponse<LoginInitiationResponse>>
async signup(phone: string, channel?: OtpChannel): Promise<ApiResponse<LoginInitiationResponse>>

// Verify OTP code
async verifyOtp(phone: string, otp: string): Promise<ApiResponse<OtpVerificationResponse>>

// Enum for OTP channels
enum OtpChannel {
  SMS = "sms",
  WHATSAPP = "whatsapp",
  TELEGRAM = "telegram"
}
```

### Security Considerations

- **Rate limiting**: Limits on verification attempts (max 3) before temporary lockout
- **Attempt tracking**: Tracks failed attempts with progressive lockout periods
- **Device fingerprinting**: Associates verification attempts with device information
- **Silent verification**: No indication of whether a phone is registered during initial request
- **Expiry**: OTP codes expire after a short time period (10 minutes)
- **Cross-channel attacks**: Prevention of attacks that try to exploit multiple channels
- **Channel switching limits**: Restrictions on frequently changing delivery channels

### Error Handling

The system handles various error scenarios:
- Invalid phone numbers
- Rate limit exceeded
- Invalid/expired OTP codes
- Network failures
- Channel-specific failures (WhatsApp not installed, Telegram bot blocked)
- Fallback procedures when primary channel fails

## Platform-Specific Considerations

### Web Platform
- Manual OTP entry required
- Deep linking for Telegram bot verification
- WhatsApp web support

### Mobile Platform (Capacitor)
- Potential for SMS auto-read on Android
- Direct app opening for WhatsApp and Telegram
- Deep linking capability from all channels
- Native integration with messaging apps

## Future Enhancements

- Auto-detection of SMS OTP codes on Android
- Enhanced phone number validation using lookup services
- Push notification as an alternative to SMS/WhatsApp/Telegram
- Biometric binding to prevent device-switching attacks
- Backup verification methods
- Integration with more messaging platforms (Signal, Facebook Messenger)
- Offline verification options for areas with intermittent connectivity
