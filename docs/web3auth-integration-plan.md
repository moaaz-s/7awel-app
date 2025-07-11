# Web3Auth Integration Plan for 7awel Wallet

## 📦 Installation Commands

```bash
# Web3Auth SDKs
npm install @web3auth/modal @web3auth/base @web3auth/solana-provider

# Solana Web3.js
npm install @solana/web3.js @solana/spl-token

# Capacitor plugins for mobile
npm install @capacitor/device @capacitor/app @capacitor/browser

# Additional utilities
npm install bs58 # For address encoding/decoding
```

## 🔧 Environment Variables

Create/update your `.env.local`:

```env
# Web3Auth Configuration
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id_here
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet  # or sapphire_mainnet for production

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_WSS_URL=wss://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Fee Payer (Backend only - for gasless transactions)
FEE_PAYER_PRIVATE_KEY=your_fee_payer_private_key
NEXT_PUBLIC_FEE_PAYER_ADDRESS=your_fee_payer_public_address
```

## 🏗️ Implementation Phases

### **Phase 1: Foundation (Week 1-2)**

#### ✅ Completed:
- [x] Web3Auth service layer (`services/web3auth-service.ts`)
- [x] App configuration (`constants/app-config.ts`)
- [x] Blockchain transaction service (`services/blockchain-transaction-service.ts`)
- [x] Web3Auth manager hook (`context/auth/hooks/useWeb3AuthManager.ts`)
- [x] Updated transaction service with Web3Auth integration
- [x] Extended Contact schema to include `walletAddress`

#### 🔄 Next Steps:
1. **Install Dependencies**
   ```bash
   npm install @web3auth/modal @web3auth/base @web3auth/solana-provider @solana/web3.js
   ```

2. **Initialize Web3Auth in AuthContext**
   ```typescript
   // Add to context/auth/AuthContext.tsx
   import { useWeb3AuthManager } from './hooks/useWeb3AuthManager';
   
   export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
     const web3Auth = useWeb3AuthManager();
     
     // Add to context value
     const value: AuthContextType = {
       ...state,
       web3Auth, // Expose Web3Auth functionality
       // ... other values
     };
   };
   ```

3. **Update Auth Flow for Wallet Creation**
   - Modify signup flow to create wallet after PIN setup
   - Add wallet address to user profile
   - Store wallet info in local repository

### **Phase 2: Backend Integration (Week 2-3)**

#### Required Backend Endpoints:

```typescript
// New endpoints needed in your backend API

POST /api/v1/wallet/prepare-transaction
Body: { from: string, to: string, amount: number, memo?: string }
Response: { feePayer: string, transaction: string }

POST /api/v1/wallet/submit-transaction  
Body: { signedTransaction: string, sendOptions?: object }
Response: { signature: string }

POST /api/v1/transactions/record
Body: { signature: string, toAddress: string, amount: number, note?: string, contactId: string }
Response: Transaction

GET /api/v1/wallet/balance/:address?
Response: { balance: number, symbol: string }
```

#### Backend Fee Subsidy Service:

```typescript
// Example backend service (Node.js/Express)
import { Connection, Keypair, Transaction } from '@solana/web3.js';

class FeeSubsidyService {
  private feePayerKeypair: Keypair;
  private connection: Connection;

  async prepareTransaction(params: PrepareTransactionParams) {
    // 1. Validate user eligibility for subsidy
    // 2. Create transaction with fee payer
    // 3. Return prepared transaction
  }

  async submitTransaction(signedTxData: string) {
    // 1. Deserialize transaction
    // 2. Add fee payer signature
    // 3. Submit to Solana network
    // 4. Return transaction signature
  }
}
```

### **Phase 3: Mobile Platform Integration (Week 3-4)**

#### Capacitor Configuration:

```typescript
// capacitor.config.ts
export default {
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Device: {
      permissions: ["device-info"]
    }
  }
};
```

#### Platform-Specific Web3Auth:

```typescript
// platform/capacitor-web3auth.ts
import { Capacitor } from '@capacitor/core';

export class CapacitorWeb3AuthService extends Web3AuthService {
  async initialize(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor-specific initialization
      await this.initializeNative();
    } else {
      // Use web SDK
      await super.initialize();
    }
  }

  private async initializeNative(): Promise<void> {
    // Mobile-specific Web3Auth initialization
    // Handle deep links, biometric authentication, etc.
  }
}
```

### **Phase 4: UI Components (Week 4-5)**

#### Wallet Status Component:

```typescript
// components/wallet/WalletStatus.tsx
export function WalletStatus() {
  const { web3Auth } = useAuth();
  
  if (!web3Auth.isConnected) {
    return <WalletConnectButton />;
  }

  return (
    <div className="wallet-status">
      <WalletAddress address={web3Auth.walletInfo?.address} />
      <WalletBalance />
      <WalletActions />
    </div>
  );
}
```

#### Transaction Confirmation Modal:

```typescript
// components/transaction/TransactionConfirmModal.tsx
export function TransactionConfirmModal({ transaction, onConfirm, onCancel }) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(transaction);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal>
      <TransactionDetails transaction={transaction} />
      <FeeEstimate />
      <ConfirmationButtons onConfirm={handleConfirm} onCancel={onCancel} />
    </Modal>
  );
}
```

### **Phase 5: Testing & Security (Week 5-6)**

#### Unit Tests:

```typescript
// tests/services/web3auth-service.test.ts
describe('Web3AuthService', () => {
  it('should initialize correctly', async () => {
    await web3AuthService.initialize();
    expect(web3AuthService.isInitialized).toBe(true);
  });

  it('should connect wallet with phone number', async () => {
    const walletInfo = await web3AuthService.connectWallet('+1234567890');
    expect(walletInfo.isConnected).toBe(true);
    expect(walletInfo.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  });
});
```

#### Integration Tests:

```typescript
// tests/integration/transaction-flow.test.ts
describe('End-to-End Transaction Flow', () => {
  it('should complete full transaction flow', async () => {
    // 1. Setup test wallets
    // 2. Connect Web3Auth
    // 3. Prepare transaction
    // 4. Sign and submit
    // 5. Verify on blockchain
  });
});
```

## 🔒 Security Considerations

### **1. Private Key Security**
- ✅ **Never expose private keys** - Web3Auth handles this
- ✅ **Use secure enclaves** on mobile devices
- ✅ **Implement biometric authentication** for sensitive operations

### **2. Transaction Security**
```typescript
// services/transaction-validator.ts
export class TransactionValidator {
  static validateTransaction(tx: TransactionParams): ValidationResult {
    // Check daily limits
    if (tx.amount > DAILY_LIMIT) {
      throw new Error('Amount exceeds daily limit');
    }

    // Verify recipient address
    if (!this.isValidSolanaAddress(tx.toAddress)) {
      throw new Error('Invalid recipient address');
    }

    // Check for suspicious patterns
    if (this.isSuspiciousTransaction(tx)) {
      throw new Error('Transaction flagged for review');
    }

    return { isValid: true };
  }
}
```

### **3. Fee Subsidy Protection**
```typescript
// Backend rate limiting
export class SubsidyRateLimiter {
  private attempts = new Map<string, number[]>();

  async checkEligibility(userId: string): Promise<boolean> {
    const userAttempts = this.attempts.get(userId) || [];
    const recentAttempts = userAttempts.filter(
      time => Date.now() - time < 24 * 60 * 60 * 1000 // 24 hours
    );

    return recentAttempts.length < MAX_DAILY_SUBSIDIES;
  }
}
```

## 📊 Monitoring & Analytics

### **Metrics to Track:**
- Wallet connection success rate
- Transaction completion rate
- Average transaction time
- Fee subsidy usage
- Error rates by type

### **Implementation:**
```typescript
// utils/wallet-analytics.ts
export class WalletAnalytics {
  static trackWalletConnection(success: boolean, duration: number) {
    logService.logEvent('wallet_connection', {
      success,
      duration,
      timestamp: Date.now(),
    });
  }

  static trackTransaction(type: string, amount: number, success: boolean) {
    logService.logEvent('transaction', {
      type,
      amount,
      success,
      timestamp: Date.now(),
    });
  }
}
```

## 🚀 Deployment Checklist

### **Before Production:**
- [ ] Web3Auth client ID configured for production
- [ ] Solana mainnet RPC endpoints configured
- [ ] Fee payer wallet funded and secured
- [ ] Rate limiting implemented
- [ ] Error monitoring setup
- [ ] Backup recovery mechanisms tested
- [ ] Security audit completed

### **Launch Day:**
- [ ] Monitor transaction success rates
- [ ] Watch fee subsidy usage
- [ ] Track user adoption metrics
- [ ] Have rollback plan ready

## 📱 Mobile-Specific Considerations

### **iOS/Android Differences:**
```typescript
// platform/mobile-web3auth.ts
export class MobileWeb3AuthService {
  async handleDeepLink(url: string): Promise<void> {
    if (Capacitor.getPlatform() === 'ios') {
      // iOS-specific deep link handling
    } else {
      // Android-specific deep link handling
    }
  }

  async enableBiometric(): Promise<boolean> {
    const { BiometricAuth } = await import('@capacitor/biometric-auth');
    return BiometricAuth.checkAvailability();
  }
}
```

## 🔧 Troubleshooting Guide

### **Common Issues:**
1. **Web3Auth initialization fails**
   - Check client ID configuration
   - Verify network settings
   - Check console for detailed errors

2. **Transaction signing fails**
   - Ensure wallet is connected
   - Check user permissions
   - Verify transaction parameters

3. **Fee payer errors**
   - Check backend fee payer balance
   - Verify fee payer permissions
   - Monitor rate limiting

### **Debug Commands:**
```bash
# Check Web3Auth status
console.log(await web3AuthService.getWalletInfo());

# Verify Solana connection
console.log(await connection.getVersion());

# Check transaction status
console.log(await connection.getSignatureStatus(signature));
```

This plan provides a comprehensive roadmap for integrating Web3Auth into your existing wallet architecture while maintaining security and user experience standards. 