# Local/Remote Data Architecture Implementation Plan

## Overview
This document tracks the implementation of the local-first data architecture with remote synchronization for the 7awel crypto wallet app.

**Created**: 2025-05-26  
**Last Updated**: 2025-05-26

## Progress Summary
- ✅ Phase 1: Basic Infrastructure (COMPLETED)
- ✅ Phase 2: Core Services (COMPLETED) 
- 🔄 Phase 3: UI Integration (IN PROGRESS - 60% Complete)
- ⏳ Remaining Phases (NOT STARTED)

---

## Phase 1: Core Infrastructure Fixes (Critical) 🔄
1. **Fix production-grade hashing** [User Point 1] ⏳
   - [ ] Replace simple hash with SHA-256 using Web Crypto API
   - [ ] Update ContactHelpers.hashPhoneNumber()

2. **Fix deprecated parsePhoneNumber** [User Point 2] ⏳
   - [ ] Update to parsePhoneNumberWithError()
   - [ ] Handle parsing errors properly

3. **Add missing user profile fields** [User Point 6] ✅
   - [x] Add address, dateOfBirth, gender to LocalDatabase['userProfile']
   - [x] Update all places where user profile is saved/loaded

4. **Add data validation** [User Point 4] ✅
   - [x] Create validation schemas for each data type
   - [x] Add validation in all SET functions
   - [x] Throw errors for invalid data

## Phase 2: Data Layer Architecture [User Point 13] ⏳
1. **Create DataLayer structure**
   ```
   data-layer/
   ├── repositories/
   │   ├── UserRepository.ts
   │   ├── TransactionRepository.ts
   │   ├── ContactRepository.ts
   │   └── BalanceRepository.ts
   ├── sync/
   │   ├── SyncOrchestrator.ts
   │   ├── ConflictResolver.ts
   │   └── OfflineQueue.ts
   ├── validators/
   │   └── schemas.ts
   └── index.ts
   ```

2. **Implement repositories**
   - [ ] Each repository handles CRUD operations for its domain
   - [ ] Repositories use StorageManager for local/remote operations
   - [ ] All data validation happens in repositories

3. **Update DataContext to use DataLayer**
   - [ ] DataContext becomes a thin wrapper around DataLayer
   - [ ] Only manages React state and hooks
   - [ ] Delegates all data operations to DataLayer

## Phase 3: Authentication & Session Management [User Point 5] ✅
1. **Implement soft logout** ✅
   - [x] Clear session and cache only
   - [x] Keep user profile and local data
   - [x] Method: softLogout()

2. **Implement hard logout** ✅
   - [x] Clear everything (session, tokens, cache, local data)
   - [x] Expire server tokens
   - [x] Register logout event
   - [x] Method: hardLogout()

3. **Update logout button to call hardLogout** ✅

## Phase 4: Replace api-service.ts [User Point 7] ⏳
1. **Create new service methods**
   - [ ] UserService.getProfile()
   - [ ] BalanceService.getBalances()
   - [ ] TransactionService.list()
   - [ ] ContactService.list()

2. **Update all api-service imports**
   - [ ] Replace throughout codebase
   - [ ] Remove api-service.ts when complete

## Phase 5: Contact Management Improvements [User Points 3, 11] ⏳
1. **Clarify matchContacts function**
   - [ ] Rename to syncDeviceContactsWithAppUsers()
   - [ ] Better documentation
   - [ ] Clear separation of concerns

2. **Implement proper contact sync flow**
   - [ ] Request device contact permissions
   - [ ] Fetch device contacts
   - [ ] Get app user hashes from server
   - [ ] Match and update local DB
   - [ ] Show UI indicators for who has accounts

## Phase 6: Transaction Improvements [User Points 8, 9] ⏳
1. **Enhance transaction schema**
   - [ ] Add recipientPhoneHash, senderPhoneHash
   - [ ] Add source field (peer/bank/crypto)
   - [ ] Add transactionMethod field

2. **Implement transaction limits**
   - [ ] Define MAX_LOCAL_TRANSACTIONS = 50
   - [ ] Only fetch/store limited transactions
   - [ ] Implement pagination for older transactions

## Phase 7: Background Sync & Offline Queue (Original + User Point 10) 🔄
1. **Complete offline queue implementation**
   - [x] Create offline-queue.ts (COMPLETED)
   - [ ] Handle conflict resolution
   - [ ] Retry logic with exponential backoff

2. **Fix background sync blocking**
   - [ ] Use Promise.all() for parallel operations
   - [ ] Make truly asynchronous
   - [ ] Don't block UI operations

3. **Integrate offline queue with DataLayer**
   - [ ] Queue operations when offline
   - [ ] Process when connection restored

## Phase 8: Granular Data Operations [User Point 12] ⏳
1. **Implement granular refresh methods**
   - [ ] refreshUser()
   - [ ] refreshBalance()
   - [ ] refreshTransactions()
   - [ ] refreshContacts()

2. **Update UI components**
   - [ ] Call specific refresh based on current screen
   - [ ] Add pull-to-refresh with granular updates

## Phase 9: UI Enhancements (Original Plan) ✅/⏳
1. **Loading states** ✅ (Already completed)
   - [x] Transaction list loading indicator
   - [x] Contact list loading indicator

2. **Offline indicators** ✅ (Already exists)
   - [x] Network status bar

3. **Sync indicators** (Modified based on feedback)
   - [ ] Skip explicit sync indicators
   - [ ] Just show loading states when fetching

## Phase 10: Testing & Documentation ⏳
1. **Write unit tests**
   - [ ] Test DataLayer repositories
   - [ ] Test offline queue
   - [ ] Test sync operations

2. **Update documentation**
   - [ ] Document new architecture
   - [ ] API migration guide
   - [ ] Testing guide

## Priority Order:
1. **Critical fixes (Phase 1)** - Security & deprecated APIs
2. **DataLayer architecture (Phase 2)** - Foundation for everything else
3. **Authentication improvements (Phase 3)** - User experience
4. **API migration (Phase 4)** - Technical debt
5. **Feature improvements (Phases 5-8)** - Enhanced functionality
6. **Testing (Phase 10)** - Quality assurance

## Current Status
- Phase 1: Partially complete (validation done, hashing and parsing pending)
- Phase 2: Storage Manager and services created, DataLayer structure pending
- Phase 3: Completed ✅
- Phase 4-10: Not started

## Next Steps
1. Complete critical fixes in Phase 1 (SHA-256 hashing, parsePhoneNumber)
2. Create DataLayer architecture
3. Refactor DataContext to use DataLayer
4. Continue with remaining phases in priority order
