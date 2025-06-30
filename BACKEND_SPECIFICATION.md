# Backend API Specification for 7awel Crypto Wallet

## Overview
This document provides a comprehensive specification for building the backend API for the 7awel crypto wallet application using Node.js. The frontend expects a RESTful API with consistent response formats, JWT-based authentication, and proper error handling.

## Technology Stack Recommendations
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js or Fastify
- **Database**: 
  - PostgreSQL for relational data (users, transactions, sessions)
  - Redis for caching and session management
- **Authentication**: JWT tokens (access + refresh)
- **OTP Service**: Twilio/SendGrid for SMS/Email
- **Queue**: Bull/Redis for background jobs
- **Logging**: Winston or Pino
- **Monitoring**: DataDog, New Relic, or Prometheus
- **API Documentation**: OpenAPI/Swagger

## API Response Format
All API responses must follow this structure:
```typescript
interface ApiResponse<T> {
  statusCode: number       // HTTP-like status code (2xx for success)
  message: string          // Human readable message
  data?: T                 // Response payload (optional for 204)
  error?: string           // Error description (for non-2xx)
  errorCode?: ErrorCode    // Machine-readable error code
  traceId: string          // Unique ID for log correlation
}
```

## Authentication & Security

### JWT Token Structure
- **Access Token**: 1 hour expiry
- **Refresh Token**: 7 days expiry
- Both tokens should include:
  - `sub`: User identifier (phone/email)
  - `type`: Token type ("access" or "refresh")
  - `iat`: Issued at timestamp
  - `exp`: Expiration timestamp

### Security Requirements
- All endpoints except auth endpoints require valid access token
- Implement rate limiting (especially for OTP endpoints)
- Hash sensitive data (passwords, PINs)
- Validate all inputs
- Use HTTPS in production
- Implement CORS properly
- Log security events

## API Endpoints

### 1. Authentication Service (`/api/v1/auth`)

#### Check Availability
```
GET /auth/check-availability?medium={phone|email}&value={value}
```
- Check if phone/email is already registered
- Returns: `{ available: boolean }`

#### Send OTP
```
POST /auth/otp/send
Body: {
  medium: "phone" | "email",
  value: string,
  channel: "whatsapp" | "sms" | "email"
}
```
- Send OTP to specified medium
- Implement rate limiting (max 3 attempts per 5 minutes)
- OTP should expire in 5 minutes
- Returns: `{ requiresOtp: true, expires: timestamp }`

#### Verify OTP
```
POST /auth/otp/verify
Body: {
  medium: "phone" | "email",
  value: string,
  otp: string
}
```
- Verify 6-digit OTP code
- Lock after 5 failed attempts
- Returns: `{ valid: boolean }`

#### Login
We need to make sure this endpiont is very secure because someone may send only this request to get auth without verifying OTP on phone/email
```
POST /auth/login
Body: {
  xxxxxx (??something missing?? - auth userID)
}
```
- Must check that both OTP (phone/email) were validated before
- Returns: `{ accessToken: string, refreshToken: string }`

#### Refresh Token
```
POST /auth/refresh
Body: {
  refreshToken: string
}
```
- Exchange refresh token for new access/refresh tokens
- Invalidate old refresh token
- Returns: `{ accessToken: string, refreshToken: string }`

#### Revoke specific device
This includes logout (revoke current device)

#### Get Devices
```
GET /auth/devices
Headers: Authorization: Bearer {accessToken}
```
- List all active sessions/devices
- Returns: Array of device/session objects

#### Revoke All Sessions
```
DELETE /auth/devices
Headers: Authorization: Bearer {accessToken}
```
- Logout from all devices
- Invalidate all tokens
- Returns: Success response

### 2. User Service (`/api/v1/user`)

#### Get User Profile
```
GET /user
Headers: Authorization: Bearer {accessToken}
```
Returns:
```json
{
  "user": {
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "email": "string",
    "address": "string",
    "country": "string",
    "dob": "YYYY-MM-DD",
    "gender": "male|female|other",
    "avatar": "url",
    "kycLevel": "string",
    "wallets": {
        "main": "string",       // only this for now.
        "investment": "string", // later 
        "saving": "string",     // later
        ....
    }
    iban: "string"
  },
  "settings": {
    "language": "en|ar",
    "theme": "light|dark", // local field
    "notifications": {
      "pushEnabled": boolean,
      "transactionAlerts": boolean,
      "securityAlerts": boolean,
      "promotions": boolean,
      "emailNotifications": boolean,
      "whatsappNotifications": boolean
    },
    "security": {
      "biometricEnabled": boolean, // local field // should be enabled by default when present on device.
      "twoFactorEnabled": boolean,
      "transactionPin": boolean // local field
    }
  }
}
```

#### Update User Profile
This API is called on account registration after acquiring the token and filling mandatory info before accessing the app for the first time.
```
PUT /user
Headers: Authorization: Bearer {accessToken}
Body: Partial<User>
```
- Cannot update email/phone through this endpoint
- Validate required fields (firstName, lastName) + other info (except kyc level)
- Returns: Updated user object

#### Update Individual Profile fields
Not available atm.

But sensitive info such as firstname/lastname will impact KYC so changing them should implicate providing official documents.

Other info such as phonenumber & email should implicate validating the new values before accepting this change.

Other values such as dob should never be updated.

Address could be updated with minimal restrictions.

In short, each will have its own update flow.

#### Update Preferences
```
PUT /user/preferences
Headers: Authorization: Bearer {accessToken}
Body: AppSettings
```
- Update user settings/preferences
- Returns: Updated settings

### 3. Wallet Service (`/api/v1/wallet`)

#### Get Primary Balance
```
GET /wallet/balance
Headers: Authorization: Bearer {accessToken}
```
Returns:
```json
{
  "symbol": "USD",
  "total": 1000.00,
  "available": 950.50,
  "pending": 49.50
}
```

#### Get All Balances
```
GET /wallet/balances
Headers: Authorization: Bearer {accessToken}
```
- Returns array of AssetBalance objects
- Support multiple currencies (USD, EUR, BTC, ETH, etc.)

### 4. Transaction Service (`/api/v1/transactions`)

#### List Transactions
```
GET /transactions?cursor={cursor}&limit={limit}&type={type}&startDate={date}&endDate={date}&search={query}
Headers: Authorization: Bearer {accessToken}
```
- Implement cursor-based pagination
- Support filtering by type, date range, search term
- Default limit: 20, max: 100
- Returns: `Paginated<Transaction>`

#### Get Transaction by ID
```
GET /transactions/{id}
Headers: Authorization: Bearer {accessToken}
```
- Returns single transaction details

#### Send Money Notification
```
POST /transactions/notify
Headers: Authorization: Bearer {accessToken}
Body: {
  tx: string,
  recipientId: string,
  note?: string
}
```
- Notify recipient of incoming transaction
- Send push notification if enabled

#### Request Money (later not now)
```
POST /transactions/request
Headers: Authorization: Bearer {accessToken}
Body: {
  amount: number,
  note?: string,
  contactId?: string,
  channel?: string
}
```
- Create payment request
- Notify recipient

### 5. Cash-out Service (`/api/v1/cashout`) (later not now)

#### Get Cash-out Options
```
GET /cashout/options?location={location}
Headers: Authorization: Bearer {accessToken}
```
- Returns available cash-out methods based on location
- Include fees for each method

#### Initiate Cash-out
```
POST /cashout/initiate
Headers: Authorization: Bearer {accessToken}
Body: {
  fromAccount: string,
  toAccount: string,
  amount: number,
  currency: string
}
```
- Validate sufficient balance
- Create pending transaction
- Returns: CashOutResponse

#### Cancel Cash-out
```
DELETE /cashout/{txId}
Headers: Authorization: Bearer {accessToken}
```
- Cancel pending cash-out
- Refund amount to wallet

#### List Cash-outs
```
GET /cashout?cursor={cursor}&limit={limit}&status={status}
Headers: Authorization: Bearer {accessToken}
```
- List cash-out history with pagination

### 6. Contact Service (`/api/v1/contacts`)

#### Sync Contacts
```
POST /contacts/sync
Headers: Authorization: Bearer {accessToken}
Body: {
  phones: string[] // Hashed phone numbers
}
```
- Match hashed phones with registered users
- Returns: `{ matchedUsers: string[] }`

### 7. Promotion Service (`/api/v1/promotions`)

#### Get Promotions
```
GET /promotions?locale={locale}
Headers: Authorization: Bearer {accessToken}
```
- Returns active promotions for specified locale
- Cache results for performance

### 8. Logging Service (`/api/v1/logs`) (do we really need this or can we deduce the log from called API endpoints)

#### Log Event
```
POST /logs
Headers: Authorization: Bearer {accessToken}
Body: {
  eventType: string,
  payload: any,
  timestamp: number
}
```

#### Batch Log Events
```
POST /logs/batch
Headers: Authorization: Bearer {accessToken}
Body: Array<LogEvent>
```
- Accept multiple events in single request
- Use for analytics and debugging

## Error Codes
Implement all error codes from `types/errors.ts`:
- UNKNOWN = "UNKNOWN"
- NETWORK_ERROR = "NETWORK_ERROR"
- VALIDATION_ERROR = "VALIDATION_ERROR"
- NOT_FOUND = "NOT_FOUND"
- AUTH_REQUIRED = "AUTH_REQUIRED"
- SESSION_EXPIRED = "SESSION_EXPIRED"
- INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS"
- OTP_REQUIRED = "OTP_REQUIRED"
- OTP_INVALID = "OTP_INVALID"
- OTP_EXPIRED = "OTP_EXPIRED"
- OTP_MISSING_MEDIUM = "OTP_MISSING_MEDIUM"
- PHONE_ALREADY_REGISTERED = "PHONE_ALREADY_REGISTERED"
- EMAIL_ALREADY_REGISTERED = "EMAIL_ALREADY_REGISTERED"
- EMAIL_INVALID = "EMAIL_INVALID"
- And many more...

## Implementation Guidelines

### 1. Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── validators/      # Input validation
│   └── app.js          # Express app setup
├── tests/              # Test files
├── .env.example        # Environment variables
└── package.json
```

### 2. Environment Variables
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/hawel
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=xxx
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=xxx
```

### 3. Middleware Stack
1. CORS
2. Body parser
3. Request ID generation
4. Request logging
5. Rate limiting
6. JWT authentication
7. Error handling

### 4. Testing Strategy
- Unit tests for services
- Integration tests for API endpoints
- Load testing for performance
- Security testing for vulnerabilities

### 5. Deployment Considerations
- Use Docker for containerization
- Implement health check endpoints
- Set up proper logging and monitoring
- Use environment-specific configurations
- Implement graceful shutdown
- Set up CI/CD pipeline

## Next Steps
1. Set up project structure and dependencies
2. Implement database schema and migrations
3. Build authentication service first
4. Add user and wallet services
5. Implement transaction services
6. Add remaining services
7. Write comprehensive tests
8. Document API with Swagger
9. Deploy to staging environment
10. Performance testing and optimization
