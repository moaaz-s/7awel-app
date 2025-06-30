# Push Notification Specification for 7awel Crypto Wallet

## Overview
This document provides a comprehensive specification for implementing push notifications in the 7awel crypto wallet application. Push notifications are critical for real-time transaction updates, security alerts, and user engagement.

## Push Notification Types

### 1. Transaction Notifications

#### 1.1 Money Received
**Trigger**: When a user receives money from another user
**Priority**: High
**Data Payload**:
```json
{
  "type": "transaction_received",
  "transactionId": "string",
  "amount": "number",
  "currency": "string",
  "senderName": "string",
  "senderId": "string",
  "timestamp": "ISO 8601",
  "note": "string (optional)"
}
```
**Notification Content**:
- Title: "Money Received!"
- Body: "You received $[amount] from [senderName]"
- Action: Deep link to transaction details

#### 1.2 Money Sent Confirmation
**Trigger**: When a sent transaction is confirmed on the blockchain/system
**Priority**: Medium
**Data Payload**:
```json
{
  "type": "transaction_sent_confirmed",
  "transactionId": "string",
  "amount": "number",
  "currency": "string",
  "recipientName": "string",
  "recipientId": "string",
  "timestamp": "ISO 8601",
  "txHash": "string (optional)"
}
```
**Notification Content**:
- Title: "Payment Confirmed"
- Body: "Your payment of $[amount] to [recipientName] has been confirmed"
- Action: Deep link to transaction details

#### 1.3 Money Request Received
**Trigger**: When someone requests money from the user
**Priority**: Medium
**Data Payload**:
```json
{
  "type": "money_request_received",
  "requestId": "string",
  "amount": "number",
  "currency": "string",
  "requesterName": "string",
  "requesterId": "string",
  "timestamp": "ISO 8601",
  "note": "string (optional)"
}
```
**Notification Content**:
- Title: "Payment Request"
- Body: "[requesterName] requested $[amount]"
- Action: Deep link to payment request screen

#### 1.4 Cash Out Completed
**Trigger**: When a cash-out operation is completed
**Priority**: High
**Data Payload**:
```json
{
  "type": "cashout_completed",
  "transactionId": "string",
  "amount": "number",
  "fee": "number",
  "method": "string",
  "reference": "string",
  "timestamp": "ISO 8601"
}
```
**Notification Content**:
- Title: "Cash Out Successful"
- Body: "Your cash out of $[amount] is ready for pickup. Reference: [reference]"
- Action: Deep link to cash out details

### 2. Security Notifications

#### 2.1 New Device Login
**Trigger**: When account is accessed from a new device
**Priority**: Critical
**Data Payload**:
```json
{
  "type": "security_new_device",
  "deviceInfo": {
    "name": "string",
    "type": "string",
    "location": "string (optional)",
    "ip": "string (optional)"
  },
  "timestamp": "ISO 8601"
}
```
**Notification Content**:
- Title: "New Device Login"
- Body: "Your account was accessed from [deviceName]"
- Action: Deep link to security settings

### 3. Account & Profile Notifications

#### 3.2 Daily/Monthly Limit Reached
**Trigger**: When user reaches transaction limits
**Priority**: High
**Data Payload**:
```json
{
  "type": "limit_reached",
  "limitType": "daily|monthly",
  "limitAmount": "number",
  "currentUsage": "number",
  "resetTime": "ISO 8601"
}
```
**Notification Content**:
- Title: "Transaction Limit Reached"
- Body: "You've reached your [limitType] limit of $[limitAmount]"
- Action: Deep link to limits settings

### 4. Promotional & Feature Notifications

#### 4.1 New Feature Announcement
**Trigger**: When new features are released
**Priority**: Low
**Data Payload**:
```json
{
  "type": "feature_announcement",
  "featureId": "string",
  "title": "string",
  "description": "string",
  "imageUrl": "string (optional)",
  "actionUrl": "string (optional)"
}
```
**Notification Content**:
- Title: [Custom title]
- Body: [Custom description]
- Action: Deep link to feature or dismiss

#### 4.2 Promotional Offers
**Trigger**: Marketing campaigns
**Priority**: Low
**Data Payload**:
```json
{
  "type": "promotion",
  "promotionId": "string",
  "title": "string",
  "description": "string",
  "expiresAt": "ISO 8601",
  "imageUrl": "string (optional)",
  "termsUrl": "string (optional)"
}
```
**Notification Content**:
- Title: [Custom title]
- Body: [Custom description]
- Action: Deep link to promotion details

## Technical Implementation

### 1. Backend Requirements

#### 1.1 Push Token Management
```typescript
// Database schema for push tokens
interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  deviceInfo: {
    model: string;
    os: string;
    appVersion: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date;
}
```

#### 1.2 Notification Queue
```typescript
// Notification job structure
interface NotificationJob {
  id: string;
  userId: string;
  type: NotificationType;
  payload: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  scheduledFor?: Date; // For delayed notifications
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}
```

#### 1.3 API Endpoints

**Register Push Token**
```
POST /api/v1/notifications/register
{
  "token": "string",
  "platform": "ios|android|web",
  "deviceId": "string",
  "deviceInfo": {}
}
```

**Unregister Push Token**
```
DELETE /api/v1/notifications/unregister
{
  "token": "string",
  "deviceId": "string"
}
```

**Update Notification Preferences**
```
PUT /api/v1/notifications/preferences
{
  "pushEnabled": boolean,
  "transactionAlerts": boolean,
  "securityAlerts": boolean,
  "promotions": boolean,
  "emailNotifications": boolean,
  "smsNotifications": boolean
}
```

**Get Notification History**
```
GET /api/v1/notifications/history?page=1&limit=20
```

### 2. Frontend Implementation

#### 2.1 Push Service Manager
```typescript
// services/push-notification-service.ts
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { httpClient } from './http-client';
import { storageManager } from './storage-manager';

class PushNotificationService {
  private isInitialized = false;
  
  async initialize() {
    if (this.isInitialized) return;
    
    // Request permissions
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                   authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (!enabled) {
      console.log('Push notifications disabled by user');
      return;
    }
    
    // Get FCM token
    const token = await messaging().getToken();
    await this.registerToken(token);
    
    // Listen for token refresh
    messaging().onTokenRefresh(token => {
      this.registerToken(token);
    });
    
    // Handle foreground notifications
    messaging().onMessage(async remoteMessage => {
      await this.displayNotification(remoteMessage);
    });
    
    // Handle background notifications
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      await this.handleBackgroundNotification(remoteMessage);
    });
    
    this.isInitialized = true;
  }
  
  private async registerToken(token: string) {
    try {
      const deviceId = await this.getDeviceId();
      const response = await httpClient.post('/api/v1/notifications/register', {
        token,
        platform: Platform.OS,
        deviceId,
        deviceInfo: {
          model: Platform.constants.Model,
          os: Platform.Version,
          appVersion: '1.0.0' // Get from app config
        }
      });
      
      if (response.success) {
        await storageManager.setPushToken(token);
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }
  
  private async displayNotification(remoteMessage: any) {
    const { title, body, data } = remoteMessage.notification || {};
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });
    }
    
    // Display notification
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: 'default',
        smallIcon: 'ic_notification',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        categoryId: 'default',
      },
    });
  }
  
  private async handleBackgroundNotification(remoteMessage: any) {
    // Handle notification based on type
    const { type, ...payload } = remoteMessage.data || {};
    
    switch (type) {
      case 'transaction_received':
        await this.handleTransactionReceived(payload);
        break;
      case 'security_new_device':
        await this.handleSecurityAlert(payload);
        break;
      // ... handle other types
    }
  }
  
  private async handleTransactionReceived(payload: any) {
    // Update local transaction cache
    const { transactionId } = payload;
    // Fetch and cache transaction details
  }
  
  private async handleSecurityAlert(payload: any) {
    // Clear session if suspicious activity
    // Force re-authentication
  }
}

export const pushNotificationService = new PushNotificationService();
```

#### 2.2 Notification Handler Hook
```typescript
// hooks/use-push-notifications.ts
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { pushNotificationService } from '@/services/push-notification-service';
import notifee, { EventType } from '@notifee/react-native';
import { useRouter } from 'next/navigation';

export function usePushNotifications() {
  const { authStatus } = useAuth();
  const { refetchBalance, refetchTransactions } = useData();
  const router = useRouter();
  
  useEffect(() => {
    if (authStatus === 'authenticated') {
      // Initialize push notifications
      pushNotificationService.initialize();
      
      // Handle notification interactions
      const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS) {
          handleNotificationPress(detail.notification?.data);
        }
      });
      
      return unsubscribe;
    }
  }, [authStatus]);
  
  const handleNotificationPress = (data: any) => {
    if (!data) return;
    
    const { type, transactionId, requestId } = data;
    
    switch (type) {
      case 'transaction_received':
      case 'transaction_sent_confirmed':
        router.push(`/transactions/${transactionId}`);
        refetchBalance();
        refetchTransactions();
        break;
        
      case 'money_request_received':
        router.push(`/requests/${requestId}`);
        break;
        
      case 'security_new_device':
        router.push('/settings/security');
        break;
        
      default:
        break;
    }
  };
}

# Firebase Push Notification Specification for 7awel Crypto Wallet

## Overview
This document provides a comprehensive specification for implementing push notifications in the 7awel crypto wallet application using Firebase Cloud Messaging (FCM) exclusively. The system focuses on transaction notifications, security alerts, and promotional messages.

## Table of Contents
1. [Firebase Architecture](#firebase-architecture)
2. [Notification Types](#notification-types)
3. [Firebase Setup](#firebase-setup)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Security & Best Practices](#security--best-practices)
7. [Testing & Monitoring](#testing--monitoring)

## Firebase Architecture

### Why Firebase Only
- **Unified Platform**: Single SDK for iOS, Android, and Web
- **Real-time Database**: Store notification preferences and tokens
- **Cloud Functions**: Serverless notification triggers
- **Analytics**: Built-in notification analytics
- **Topics**: Easy broadcast notifications
- **Cost-effective**: Generous free tier

### System Components
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│ Firebase Admin   │────▶│   FCM Server    │
│   (FCM SDK)     │     │    SDK (Backend) │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │                         │
         ▼                        ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Token Register  │     │ Cloud Functions  │     │ Device Delivery │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Technical Implementation

### 1. Backend Requirements

#### 1.1 Push Token Management
```typescript
// Database schema for push tokens
interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  deviceInfo: {
    model: string;
    os: string;
    appVersion: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date;
}
```

#### 1.2 Notification Queue
```typescript
// Notification job structure
interface NotificationJob {
  id: string;
  userId: string;
  type: NotificationType;
  payload: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  scheduledFor?: Date; // For delayed notifications
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}
```

#### 1.3 API Endpoints

**Register Push Token**
```
POST /api/v1/notifications/register
{
  "token": "string",
  "platform": "ios|android|web",
  "deviceId": "string",
  "deviceInfo": {}
}
```

**Unregister Push Token**
```
DELETE /api/v1/notifications/unregister
{
  "token": "string",
  "deviceId": "string"
}
```

**Update Notification Preferences**
```
PUT /api/v1/notifications/preferences
{
  "pushEnabled": boolean,
  "transactionAlerts": boolean,
  "securityAlerts": boolean,
  "promotions": boolean,
  "emailNotifications": boolean,
  "smsNotifications": boolean
}
```

**Get Notification History**
```
GET /api/v1/notifications/history?page=1&limit=20
```

### 2. Frontend Implementation

#### 2.1 Push Service Manager
```typescript
// services/push-notification-service.ts
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { httpClient } from './http-client';
import { storageManager } from './storage-manager';

class PushNotificationService {
  private isInitialized = false;
  
  async initialize() {
    if (this.isInitialized) return;
    
    // Request permissions
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                   authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (!enabled) {
      console.log('Push notifications disabled by user');
      return;
    }
    
    // Get FCM token
    const token = await messaging().getToken();
    await this.registerToken(token);
    
    // Listen for token refresh
    messaging().onTokenRefresh(token => {
      this.registerToken(token);
    });
    
    // Handle foreground notifications
    messaging().onMessage(async remoteMessage => {
      await this.displayNotification(remoteMessage);
    });
    
    // Handle background notifications
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      await this.handleBackgroundNotification(remoteMessage);
    });
    
    this.isInitialized = true;
  }
  
  private async registerToken(token: string) {
    try {
      const deviceId = await this.getDeviceId();
      const response = await httpClient.post('/api/v1/notifications/register', {
        token,
        platform: Platform.OS,
        deviceId,
        deviceInfo: {
          model: Platform.constants.Model,
          os: Platform.Version,
          appVersion: '1.0.0' // Get from app config
        }
      });
      
      if (response.success) {
        await storageManager.setPushToken(token);
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }
  
  private async displayNotification(remoteMessage: any) {
    const { title, body, data } = remoteMessage.notification || {};
    
    // Create notification channel for Android
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });
    }
    
    // Display notification
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: 'default',
        smallIcon: 'ic_notification',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        categoryId: 'default',
      },
    });
  }
  
  private async handleBackgroundNotification(remoteMessage: any) {
    // Handle notification based on type
    const { type, ...payload } = remoteMessage.data || {};
    
    switch (type) {
      case 'transaction_received':
        await this.handleTransactionReceived(payload);
        break;
      case 'security_new_device':
        await this.handleSecurityAlert(payload);
        break;
      // ... handle other types
    }
  }
  
  private async handleTransactionReceived(payload: any) {
    // Update local transaction cache
    const { transactionId } = payload;
    // Fetch and cache transaction details
  }
  
  private async handleSecurityAlert(payload: any) {
    // Clear session if suspicious activity
    // Force re-authentication
  }
}

export const pushNotificationService = new PushNotificationService();
```

#### 2.2 Notification Handler Hook
```typescript
// hooks/use-push-notifications.ts
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { pushNotificationService } from '@/services/push-notification-service';
import notifee, { EventType } from '@notifee/react-native';
import { useRouter } from 'next/navigation';

export function usePushNotifications() {
  const { authStatus } = useAuth();
  const { refetchBalance, refetchTransactions } = useData();
  const router = useRouter();
  
  useEffect(() => {
    if (authStatus === 'authenticated') {
      // Initialize push notifications
      pushNotificationService.initialize();
      
      // Handle notification interactions
      const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS) {
          handleNotificationPress(detail.notification?.data);
        }
      });
      
      return unsubscribe;
    }
  }, [authStatus]);
  
  const handleNotificationPress = (data: any) => {
    if (!data) return;
    
    const { type, transactionId, requestId } = data;
    
    switch (type) {
      case 'transaction_received':
      case 'transaction_sent_confirmed':
        router.push(`/transactions/${transactionId}`);
        refetchBalance();
        refetchTransactions();
        break;
        
      case 'money_request_received':
        router.push(`/requests/${requestId}`);
        break;
        
      case 'security_new_device':
        router.push('/settings/security');
        break;
        
      default:
        break;
    }
  };
}

### 3. Push Notification Providers

#### 3.1 Firebase Cloud Messaging (FCM)
- **Use for**: Android and iOS
- **Setup**: Follow Firebase setup guide
- **Features**: Rich notifications, topics, analytics

#### 3.2 Apple Push Notification Service (APNs)
- **Use for**: iOS specific features
- **Setup**: Requires Apple Developer account
- **Features**: Silent notifications, critical alerts

#### 3.3 Web Push API
- **Use for**: Progressive Web App
- **Setup**: Service worker implementation
- **Features**: Background sync, offline support

### 4. Security Considerations

1. **Token Validation**:
   - Validate push tokens on each request
   - Remove invalid/expired tokens automatically
   - Implement token rotation

2. **Payload Encryption**:
   - Encrypt sensitive data in notification payloads
   - Use data messages instead of notification messages for sensitive info
   - Never include full transaction details in notifications

3. **Rate Limiting**:
   - Implement per-user notification limits
   - Prevent notification spam
   - Queue and batch non-critical notifications

4. **User Privacy**:
   - Allow granular notification preferences
   - Respect Do Not Disturb settings
   - Implement quiet hours

### 5. Testing Strategy

#### 5.1 Unit Tests
```typescript
// __tests__/push-notification-service.test.ts
describe('PushNotificationService', () => {
  it('should register token successfully', async () => {
    // Mock FCM token
    // Mock API call
    // Assert token stored
  });
  
  it('should handle notification types correctly', async () => {
    // Test each notification type
    // Assert correct handler called
  });
});
```

#### 5.2 Integration Tests
- Test end-to-end notification flow
- Test deep linking
- Test notification preferences

#### 5.3 Manual Testing Checklist
- [ ] App in foreground - notification displayed
- [ ] App in background - notification displayed and handled
- [ ] App killed - notification displayed and handled on app open
- [ ] Deep links work correctly
- [ ] Notification preferences respected
- [ ] Multiple device handling
- [ ] Token refresh handling

### 6. Monitoring & Analytics

#### 6.1 Metrics to Track
- Delivery rate by notification type
- Open rate by notification type
- Time to open
- Opt-out rate
- Failed delivery reasons

#### 6.2 Error Tracking
```typescript
interface NotificationError {
  userId: string;
  notificationType: string;
  errorCode: string;
  errorMessage: string;
  platform: string;
  timestamp: Date;
}
```

### 7. Localization

All notification content should be localized based on user's language preference:

```typescript
// locales/en.ts
export const notifications = {
  transaction_received: {
    title: "Money Received!",
    body: "You received {{amount}} from {{sender}}"
  },
  // ... other notifications
};

// locales/ar.ts
export const notifications = {
  transaction_received: {
    title: "تم استلام الأموال!",
    body: "لقد تلقيت {{amount}} من {{sender}}"
  },
  // ... other notifications
};
```

### 8. Future Enhancements

1. **Rich Media Notifications**:
   - Transaction receipt images
   - User avatars
   - Action buttons

2. **Smart Notifications**:
   - ML-based send time optimization
   - User behavior-based filtering
   - Predictive notifications

3. **Interactive Notifications**:
   - Quick reply for payment requests
   - Approve/Reject actions
   - Amount input for requests

## Implementation Timeline

### Phase 1 (Week 1-2): Core Infrastructure
- Set up push token management
- Implement notification queue
- Create API endpoints
- Basic FCM integration

### Phase 2 (Week 3-4): Transaction Notifications
- Money received notifications
- Send confirmation notifications
- Payment request notifications
- Testing and optimization

### Phase 3 (Week 5-6): Security & Account Notifications
- Security alerts
- Profile updates
- Limit notifications
- Deep linking implementation

### Phase 4 (Week 7-8): Enhancement & Polish
- Promotional notifications
- Rich media support
- Analytics integration
- Performance optimization

## Conclusion

This push notification system will provide users with real-time updates about their transactions and account security while maintaining privacy and allowing granular control over notification preferences. The implementation should prioritize transaction notifications as they provide the most immediate value to users.
