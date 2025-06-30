# Backend Database Specification Plan

## Overview
This document outlines the database requirements for the 7awel crypto wallet backend based on analysis of the current mock API, services, and local database structure.

## Database Schema Design

### 1. Core User Management

#### users
Primary user table for authentication and profile management.

```sql
users {
  id: UUID PRIMARY KEY
  phone: VARCHAR(20) UNIQUE NOT NULL -- Primary identifier
  email: VARCHAR(255) UNIQUE
  phone_verified: BOOLEAN DEFAULT false
  email_verified: BOOLEAN DEFAULT false
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  last_login: TIMESTAMP
  status: ENUM('active', 'suspended', 'deleted') DEFAULT 'active'
  kyc_level: ENUM('none', 'basic', 'enhanced', 'full') DEFAULT 'none'
}

user_profiles {
  user_id: UUID PRIMARY KEY REFERENCES users(id)
  first_name: VARCHAR(100) NOT NULL
  last_name: VARCHAR(100) NOT NULL
  avatar_url: TEXT
  date_of_birth: DATE
  gender: ENUM('male', 'female', 'other')
  country: VARCHAR(2) -- ISO country code
  address: TEXT
  updated_at: TIMESTAMP DEFAULT NOW()
}
```

#### user_auth
Authentication and security settings.

```sql
user_auth {
  user_id: UUID PRIMARY KEY REFERENCES users(id)
  auth_service_id: VARCHAR(255)
  pin_hash: VARCHAR(255) -- Hashed PIN
  pin_salt: VARCHAR(255)
  pin_attempts: INTEGER DEFAULT 0
  pin_locked_until: TIMESTAMP
  biometric_enabled: BOOLEAN DEFAULT false
  two_factor_enabled: BOOLEAN DEFAULT false
  two_factor_secret: VARCHAR(255)
  transaction_pin_enabled: BOOLEAN DEFAULT true
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
}


### 2. User Settings

```sql
user_settings {
  user_id: UUID PRIMARY KEY REFERENCES users(id)
  language: VARCHAR(5) DEFAULT 'en'
  theme: ENUM('light', 'dark', 'system') DEFAULT 'light'
  daily_limit: DECIMAL(15,2)
  updated_at: TIMESTAMP DEFAULT NOW()
}

notification_settings {
  user_id: UUID PRIMARY KEY REFERENCES users(id)
  push_enabled: BOOLEAN DEFAULT true
  transaction_alerts: BOOLEAN DEFAULT true
  security_alerts: BOOLEAN DEFAULT true
  promotions: BOOLEAN DEFAULT true
  email_notifications: BOOLEAN DEFAULT true
  sms_notifications: BOOLEAN DEFAULT true
  updated_at: TIMESTAMP DEFAULT NOW()
}
```

### 4. Sessions & Activity

```sql
user_sessions { # not sure we need this
  id: UUID PRIMARY KEY
  user_id: UUID REFERENCES users(id)
  session_token: VARCHAR(255) UNIQUE NOT NULL
  device_id: VARCHAR(255)
  ip_address: INET
  user_agent: TEXT
  is_active: BOOLEAN DEFAULT true
  pin_verified: BOOLEAN DEFAULT false
  last_activity: TIMESTAMP DEFAULT NOW()
  expires_at: TIMESTAMP NOT NULL
  created_at: TIMESTAMP DEFAULT NOW()
  INDEX idx_user_sessions_active (user_id, is_active, expires_at)
}

activity_logs {
  id: UUID PRIMARY KEY
  user_id: UUID REFERENCES users(id)
  action: VARCHAR(100) NOT NULL
  details: JSONB
  ip_address: INET
  device_id: VARCHAR(255)
  created_at: TIMESTAMP DEFAULT NOW()
  INDEX idx_activity_user_time (user_id, created_at)
}
```

### 5. Wallet & Balances (# not sure we need this)

```sql
wallets {
  id: UUID PRIMARY KEY
  user_id: UUID REFERENCES users(id)
  wallet_address: VARCHAR(255) UNIQUE -- Blockchain address
  wallet_type: ENUM('custodial', 'non_custodial') DEFAULT 'custodial'
  status: ENUM('active', 'frozen', 'closed') DEFAULT 'active'
  created_at: TIMESTAMP DEFAULT NOW()
}

asset_balances {
  id: UUID PRIMARY KEY
  wallet_id: UUID REFERENCES wallets(id)
  asset_symbol: VARCHAR(10) NOT NULL -- USD, EUR, BTC, ETH, etc.
  total: DECIMAL(20,8) DEFAULT 0
  available: DECIMAL(20,8) DEFAULT 0
  pending: DECIMAL(20,8) DEFAULT 0
  last_updated: TIMESTAMP DEFAULT NOW()
  UNIQUE KEY unique_wallet_asset (wallet_id, asset_symbol)
  INDEX idx_balance_wallet (wallet_id)
}

supported_assets {
  symbol: VARCHAR(10) PRIMARY KEY
  name: VARCHAR(100) NOT NULL
  asset_type: ENUM('fiat', 'crypto') NOT NULL
  decimals: INTEGER DEFAULT 2
  min_amount: DECIMAL(20,8)
  max_amount: DECIMAL(20,8)
  is_active: BOOLEAN DEFAULT true
  network: VARCHAR(50) -- For crypto assets
  contract_address: VARCHAR(255) -- For tokens
}
```

### 6. Transactions

```sql
transactions {
  id: UUID PRIMARY KEY
  reference: VARCHAR(100) UNIQUE NOT NULL
  sender_id: UUID REFERENCES users(id)
  recipient_id: UUID REFERENCES users(id)
  type: ENUM('transfer', 'payment', 'cash_out', 'cash_in', 'exchange') NOT NULL
  status: ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL
  amount: DECIMAL(20,8) NOT NULL
  asset_symbol: VARCHAR(10) NOT NULL
  fee: DECIMAL(20,8) DEFAULT 0
  exchange_rate: DECIMAL(20,8) -- For currency exchanges
  note: TEXT
  metadata: JSONB -- Additional transaction data
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  completed_at: TIMESTAMP
  INDEX idx_tx_sender (sender_id, created_at)
  INDEX idx_tx_recipient (recipient_id, created_at)
  INDEX idx_tx_reference (reference)
  INDEX idx_tx_status (status, created_at)
}

transaction_details {
  transaction_id: UUID PRIMARY KEY REFERENCES transactions(id)
  network: VARCHAR(50) -- Blockchain network
  tx_hash: VARCHAR(255) -- Blockchain transaction hash
  confirmations: INTEGER DEFAULT 0
  block_number: BIGINT
  gas_fee: DECIMAL(20,8)
  error_message: TEXT
  raw_response: JSONB
}

cash_out_details { # not needed
  transaction_id: UUID PRIMARY KEY REFERENCES transactions(id)
  method: ENUM('atm', 'agent', 'bank') NOT NULL
  provider: VARCHAR(100)
  provider_reference: VARCHAR(255)
  pickup_code: VARCHAR(50)
  expires_at: TIMESTAMP
  collected_at: TIMESTAMP
  location: JSONB -- Location details for pickup
}
```

### 7. Contacts

```sql
phones { 
  phone_hash: VARCHAR(255) PRIMARY KEY NOT NULL -- For privacy (primary)
  linked_user_id: UUID REFERENCES users(id) NOT NULL -- If they're a 7awel user
}

contacts_with_accounts {
  id: UUID PRIMARY KEY
  owner_id: UUID REFERENCES users(id)
  phone_hash: VARCHAR(255) NOT NULL -- For privacy
  is_favorite: BOOLEAN DEFAULT false
  linked_user_id: UUID REFERENCES users(id) -- If they're a 7awel user
  last_interaction: TIMESTAMP
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  INDEX idx_contacts_owner (owner_id)
  INDEX idx_contacts_phone_hash (phone_hash)
  UNIQUE KEY unique_owner_phone (owner_id, phone_hash)
}

contact_sync_status {
  user_id: UUID PRIMARY KEY REFERENCES users(id)
  last_sync: TIMESTAMP
  device_contacts_count: INTEGER
  synced_contacts_count: INTEGER
  status: ENUM('pending', 'syncing', 'completed', 'failed') DEFAULT 'pending'
}
```

### 8. Payment Requests # later

```sql
payment_requests {
  id: UUID PRIMARY KEY
  requestor_id: UUID REFERENCES users(id)
  recipient_id: UUID REFERENCES users(id)
  amount: DECIMAL(20,8) NOT NULL
  asset_symbol: VARCHAR(10) NOT NULL
  status: ENUM('pending', 'paid', 'declined', 'expired', 'cancelled') NOT NULL
  note: TEXT
  qr_code: TEXT -- Generated QR code data
  expires_at: TIMESTAMP
  paid_at: TIMESTAMP
  transaction_id: UUID REFERENCES transactions(id)
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  INDEX idx_requests_requestor (requestor_id, status)
  INDEX idx_requests_recipient (recipient_id, status)
}
```

### 9. Promotions & Marketing

```sql
promotions {
  id: UUID PRIMARY KEY
  title: VARCHAR(255) NOT NULL
  description: TEXT
  image_url: TEXT
  link_url: TEXT
  background_color: VARCHAR(7) -- Hex color
  target_audience: JSONB -- Targeting rules
  priority: INTEGER DEFAULT 0
  start_date: TIMESTAMP
  end_date: TIMESTAMP
  is_active: BOOLEAN DEFAULT true
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
  INDEX idx_promotions_active (is_active, start_date, end_date)
}

promotion_views {
  id: UUID PRIMARY KEY
  promotion_id: UUID REFERENCES promotions(id)
  user_id: UUID REFERENCES users(id)
  viewed_at: TIMESTAMP DEFAULT NOW()
  clicked_at: TIMESTAMP
  UNIQUE KEY unique_user_promotion (user_id, promotion_id)
}
```

## Indexes Strategy

### Performance Indexes
- User lookups by phone/email
- Transaction history by user and date
- Active sessions by user
- Contact searches by phone hash
- Balance lookups by wallet

### Compliance Indexes
- Transaction monitoring by status and amount
- KYC document expiration tracking
- Activity log searches by user and action

## Data Retention Policies

1. **User Data**: Retain indefinitely while account is active
2. **Sessions**: Delete after 30 days of inactivity
3. **OTP Codes**: Delete after 24 hours
4. **Activity Logs**: Archive after 90 days, delete after 2 years
5. **Transaction Data**: Retain for 7 years (regulatory requirement)
6. **Failed Sync Queue**: Delete after 30 days

## Security Considerations

1. **Encryption at Rest**
   - All sensitive fields (PIN, tokens, document numbers)
   - Use column-level encryption for PII

2. **Data Masking**
   - Phone numbers (show last 4 digits)
   - Email addresses (show first 2 and domain)
   - Transaction amounts for support queries

3. **Access Control**
   - Row-level security for user data
   - Separate read replicas for analytics
   - Audit trail for all data access

## Scalability Considerations

1. **Partitioning**
   - Transactions table by created_at (monthly)
   - Activity logs by created_at (weekly)
   - Sessions by created_at (daily)

2. **Archival Strategy**
   - Move completed transactions older than 1 year to archive
   - Compress activity logs older than 90 days

3. **Caching Requirements**
   - User profiles (5 minutes)
   - Asset balances (30 seconds)
   - Exchange rates (1 minute)
   - Promotion list (5 minutes)

## Migration from Local Database

The current local database structure maps to the backend as follows:

1. `userProfile` → `users` + `user_profiles`
2. `contacts` → `contacts` table
3. `recentTransactions` → `transactions` table
4. `balance` → `asset_balances` table
5. `syncQueue/failedSyncs` → Not needed in backend (local only)

## API Endpoints Mapping

Based on the mock API analysis:

1. **Auth APIs**
   - `/auth/check-availability` → Query users table
   - `/auth/otp/send` → Insert into otp_codes
   - `/auth/otp/verify` → Validate against otp_codes
   - `/auth/login` → Create auth_tokens entry
   - `/auth/refresh` → Validate and rotate tokens

2. **User APIs**
   - `/user` → CRUD on users + user_profiles
   - `/user/settings` → CRUD on user_settings + notification_settings

3. **Wallet APIs**
   - `/wallet/balance` → Query primary asset_balance
   - `/wallet/balances` → Query all asset_balances

4. **Transaction APIs**
   - `/transactions` → Query transactions with filters
   - `/transactions/send` → Create transaction
   - `/transactions/cashout` → Create transaction + cash_out_details

## Next Steps

1. **Database Selection**
   - PostgreSQL recommended for JSONB support and reliability
   - Consider CockroachDB for global distribution

2. **Implementation Priority**
   - Phase 1: Users, Auth, Sessions
   - Phase 2: Wallets, Balances, Transactions
   - Phase 3: Contacts, Payment Requests
   - Phase 4: Promotions, KYC, Compliance

3. **Performance Testing**
   - Load test transaction creation (target: 1000 TPS)
   - Test concurrent balance updates
   - Validate session management at scale

4. **Security Audit**
   - Review encryption implementation
   - Penetration testing on auth flows
   - Compliance review for data retention
