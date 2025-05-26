# Local & Remote Data Architecture Work Plan

## Executive Summary

This document outlines a comprehensive plan for implementing a hybrid local/remote data architecture for the 7awel crypto wallet app. The architecture will handle contact synchronization with phone number hashing, local/remote data management, and ensure critical user information is available at key points like the PIN screen.

## 1. Architecture Overview

### 1.1 Data Classification

#### Local-Only Data
- PIN hash (security-critical, never transmitted)
- Session state (local only)
- tokens (fetched from remote service and can be refreshed)
- full contact information (I don't know how to manage this exactly, but name & actual phone number .. to help with proper display)
- Device-specific settings
- Biometric preferences

#### Remote-Only Data
- Full transaction history (beyond recent)
- Complete contact list (beyond frequent - mainly hashed & if it has an active account)
- User's full activity logs
- Compliance/KYC documents

#### Hybrid Data (Local + Remote)
- User profile (firstName, lastName, avatar, country)
- Recent transactions (last 50)
- Frequent/recent contacts
- Account balances
- App preferences

### 1.2 Data Synchronization Strategy

```
┌─────────────────┐
│   Remote API    │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Sync     │
    │ Manager  │
    └────┬────┘
         │
┌────────▼────────┐
│  Local Storage  │
│   (IndexedDB)   │
└─────────────────┘
```

## 2. Technical Implementation

### 2.1 Storage Layer Architecture

#### Create a unified storage abstraction layer:

```typescript
// storage/storage-manager.ts
interface StorageManager {
  // Local storage operations
  local: {
    get<T>(key: string): Promise<T | null>
    set<T>(key: string, value: T): Promise<void>
    delete(key: string): Promise<void>
    clear(): Promise<void>
  }
  
  // Remote storage operations
  remote: {
    get<T>(endpoint: string, params?: any): Promise<ApiResponse<T>>
    post<T>(endpoint: string, data: any): Promise<ApiResponse<T>>
    put<T>(endpoint: string, data: any): Promise<ApiResponse<T>>
    delete(endpoint: string): Promise<ApiResponse<void>>
  }
  
  // Hybrid operations
  hybrid: {
    // Get from local first, fallback to remote
    getWithFallback<T>(localKey: string, remoteEndpoint: string): Promise<T | null>
    // Sync local and remote
    sync<T>(localKey: string, remoteEndpoint: string, strategy: SyncStrategy): Promise<void>
  }
}
```

### 2.2 Local Database Schema (IndexedDB)

```typescript
// storage/schemas.ts
interface LocalDatabase {
  // User profile store
  userProfile: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    avatar?: string
    country?: string
    lastUpdated: number
  }
  
  // Contacts store
  contacts: {
    id: string
    name: string
    phone: string
    phoneHash: string // SHA256 hash for matching
    email?: string
    lastInteraction?: number
    isFavorite: boolean
    syncedAt: number
  }
  
  // Transactions store
  recentTransactions: {
    id: string
    type: string
    amount: number
    timestamp: number
    // ... other transaction fields
  }
  
  // Sync metadata
  syncMetadata: {
    entity: string
    lastSyncTime: number
    syncVersion: number
  }
}
```

### 2.3 Contact Service Refactoring

#### Phone Number Hashing Implementation

libphonenumber-js is a JavaScript library that works across all platforms (browser, iOS via React Native/Capacitor, Android). No platform abstraction needed.

```typescript
// services/contact-service.ts
import { parsePhoneNumber, formatPhoneNumber } from 'libphonenumber-js'
import { createHash } from 'crypto-js'

class ContactService {
  private localDB: LocalStorageManager
  private remoteAPI: HttpClient
  
  // Hash phone number for privacy-preserving sync
  private hashPhoneNumber(phoneNumber: string, countryCode?: string): string {
    try {
      // Parse and normalize the phone number
      const parsed = parsePhoneNumber(phoneNumber, countryCode)
      if (!parsed || !parsed.isValid()) {
        throw new Error('Invalid phone number')
      }
      
      // Get E.164 format (+1234567890)
      const normalized = parsed.format('E.164')
      
      // SHA256 hash the normalized number
      return createHash('SHA256').update(normalized).toString()
    } catch (error) {
      // Fallback: hash the raw input
      return createHash('SHA256').update(phoneNumber).toString()
    }
  }
  
  // Sync contacts with server
  async syncContacts(deviceContacts: DeviceContact[]): Promise<void> {
    // Step 1: Hash all phone numbers
    const hashedContacts = deviceContacts.map(contact => ({
      ...contact,
      phoneHash: this.hashPhoneNumber(contact.phone, contact.countryCode)
    }))
    
    // Step 2: Send hashes to server
    const response = await this.remoteAPI.post('/contacts/sync', {
      phoneHashes: hashedContacts.map(c => c.phoneHash)
    })
    
    // Step 3: Store matched contacts locally
    const matchedContacts = response.data.matches
    await this.localDB.storeContacts(matchedContacts)
    
    // Step 4: Update sync metadata
    await this.localDB.updateSyncMetadata('contacts', Date.now())
  }
  
  // Get contacts with local-first approach
  async getContacts(options?: { forceRemote?: boolean }): Promise<Contact[]> {
    if (!options?.forceRemote) {
      // Try local first
      const localContacts = await this.localDB.getContacts()
      if (localContacts.length > 0) {
        // Check if data is stale (older than 1 hour)
        const metadata = await this.localDB.getSyncMetadata('contacts')
        if (metadata && Date.now() - metadata.lastSyncTime < 3600000) {
          return localContacts
        }
      }
    }
    
    // Fetch from remote
    const remoteContacts = await this.remoteAPI.get('/contacts')
    
    // Update local cache
    await this.localDB.storeContacts(remoteContacts.data)
    
    return remoteContacts.data
  }
  
  // Record interaction and update both local and remote
  async recordInteraction(contactId: string): Promise<void> {
    // Update locally immediately
    await this.localDB.updateContactInteraction(contactId, Date.now())
    
    // Update remote asynchronously
    this.remoteAPI.post(`/contacts/${contactId}/interaction`).catch(error => {
      // Log error but don't fail the operation
      console.error('Failed to sync interaction:', error)
    })
  }
}
```

### 2.4 DataContext Refactoring

```typescript
// context/DataContext.tsx
export function DataProvider({ children }: { children: ReactNode }) {
  const { authStatus } = useAuth()
  const storageManager = useStorageManager()
  
  // Initialize with local data immediately
  useEffect(() => {
    /*
      [User Rarmak][Remark x1] If user has token locally (PIN entry step), we can at least load user profile (first name last name etc...)
    */

    // [User Rarmak][Remark x2] Once the user get fully authenticated, then load all data
    if (authStatus === AuthStatus.Authenticated) {
      // Load local data first (instant)
      loadLocalData()
      // Then sync with remote (background)
      syncRemoteData()
    }
  }, [authStatus])
  
  const loadLocalData = async () => {
    // Load user profile from local storage
    const localProfile = await storageManager.local.get('userProfile')
    if (localProfile) {
      setUser(localProfile)
    }
    
    // Load recent transactions
    const localTransactions = await storageManager.local.get('recentTransactions')
    if (localTransactions) {
      setTransactions(localTransactions)
    }
    
    // Load contacts
    const localContacts = await storageManager.local.get('contacts')
    if (localContacts) {
      setContacts(localContacts)
    }
  }
  
  const syncRemoteData = async () => {
    try {
      // Sync user profile
      const remoteProfile = await userService.getProfile()
      if (isApiSuccess(remoteProfile)) {
        await storageManager.hybrid.sync('userProfile', remoteProfile.data)
        setUser(remoteProfile.data)
      }
      
      // Sync other data...
    } catch (error) {
      console.error('Remote sync failed:', error)
    }
  }
}
```

### 2.5 PIN Screen User Info Display

```typescript
// components/pin/PinEntry.tsx
export function PinEntry() {
  const { user } = useData()
  const [localUser, setLocalUser] = useState<User | null>(null)
  
  /*
    [User Rarmak][Remark xx1] No need for this I think,i f we loaded minimal data in the DataContext as suggested in [Remark x1], then the `user` variable will contain the required info immediatly.
  */
  useEffect(() => {
    // Load minimal user info from local storage immediately
    loadMinimalUserInfo()
  }, [])
  
  // [User Rarmak][Remark xx2] May not be needed, check [Remark xx1]
  const loadMinimalUserInfo = async () => {
    const stored = await storageManager.local.get('userProfile')
    if (stored) {
      setLocalUser(stored)
    }
  }
  
  const displayUser = user || localUser
  
  return (
    <div>
      {displayUser && (
        <div className="user-info">
          <Avatar src={displayUser.avatar} />
          <h3>{displayUser.firstName} {displayUser.lastName}</h3>
        </div>
      )}
      <PinPad />
    </div>
  )
}
```

## 3. Implementation Phases

### Phase 1: Storage Infrastructure (Week 1)
- [ ] Implement IndexedDB wrapper for local storage (do it directly in @platfom under each platform web & capacitor)
- [ ] Create storage manager abstraction
- [ ] Define data schemas
- [ ] Create migration utilities (what do you mean, our app is not yet in production - we're in dev phase still)

### Phase 2: Contact Service Refactoring (Week 2)
- [ ] Integrate libphonenumber-js
- [ ] Implement phone number hashing
- [ ] Create contact sync logic
- [ ] Add local contact caching
- [ ] Implement recent contacts rotation

### Phase 3: Data Context Refactoring (Week 3)
- [ ] Implement local-first data loading
- [ ] Add background sync mechanism
- [ ] Handle offline scenarios
- [ ] Add sync conflict resolution

### Phase 4: UI Updates (Week 4)
- [ ] Update PIN screen with local user info
- [ ] Add sync status indicators
- [ ] Implement pull-to-refresh
- [ ] Add offline mode indicators

## 4. Key Considerations

### 4.1 Security
- PIN hash never leaves device
- Phone numbers are hashed before sync
- Sensitive data encrypted in local storage
- Session tokens have expiry

### 4.2 Performance
- Local-first approach for instant UI
- Background sync for fresh data
- Indexed queries for fast lookups
- Pagination for large datasets

### 4.3 Offline Support
- Full app functionality with local data
- Queue operations for sync when online
- Clear offline/online indicators
- Graceful degradation

### 4.4 Data Consistency
- Version tracking for sync conflicts
- Last-write-wins for simple conflicts
- Manual resolution for complex conflicts
- Audit trail for changes

## 5. Testing Strategy

### 5.1 Unit Tests
- Storage manager operations
- Phone number hashing
- Sync logic
- Conflict resolution

### 5.2 Integration Tests
- Local/remote sync scenarios
- Offline/online transitions
- Data migration
- Performance benchmarks

### 5.3 E2E Tests
- Full user flows with sync
- Offline mode usage
- Multi-device scenarios
- Data consistency checks

## 6. Monitoring & Analytics

### 6.1 Metrics to Track
- Sync success/failure rates
- Local cache hit rates
- Sync duration
- Data conflicts frequency
- Storage usage

### 6.2 Error Handling
- Graceful fallbacks
- User-friendly error messages
- Automatic retry logic
- Error reporting to backend

## 7. Future Enhancements

### 7.1 Advanced Sync
- Differential sync (only changes)
- Real-time sync via WebSockets
- Peer-to-peer sync
- Multi-device conflict resolution

### 7.2 Storage Optimization
- Data compression
- Automatic cleanup
- Smart prefetching
- Adaptive caching

### 7.3 Enhanced Security
- End-to-end encryption
- Zero-knowledge architecture
- Secure multi-party computation
- Hardware security module integration
