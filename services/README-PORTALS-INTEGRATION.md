# Portals Integration Guide

## Overview

This document outlines the integration approach for Portals virtual accounts to handle transaction fees automatically, simplifying the transaction flow by removing backend fee subsidization.

## Current State

### Transaction Flow (Before Portals)
1. User prepares transaction
2. Backend calculates and subsidizes fees  
3. User signs transaction
4. Backend completes transaction with fee handling

### Transaction Flow (With Portals Virtual Accounts)
1. User prepares transaction (no fee calculation needed)
2. User signs transaction with web3auth (will be replaced with Portals)
3. Portals virtual accounts automatically handle fee payments
4. Transaction is submitted and recorded automatically

## Changes Made

### TransactionService Updates
- `sendStablecoinWithPortalsVirtualAccounts()` - New method for Portals integration
- `sendMoney()` - Updated to use Portals for stablecoin transfers
- `sendStablecoinWithPartialSigning()` - Deprecated, redirects to new method

### Key Benefits
- **Simplified fee handling**: No backend subsidization required
- **Reduced complexity**: Fewer API calls and steps
- **Better user experience**: Transparent fee handling

## TODO: Migration Steps

### 1. Custom Web3Auth Service Updates
Update `services/custom-web3auth-service.ts` to support:
```typescript
interface PrepareTransferOptions {
  toAddress: string;
  tokenMint: string;
  amount: number;
  memo?: string;
  skipFeeCalculation?: boolean; // New option for Portals
}
```

### 2. Replace Web3Auth with Portals Signing
When ready to migrate from web3auth to Portals:
1. Replace `customWeb3AuthService.signTransaction()` calls
2. Update transaction preparation to use Portals SDK
3. Update wallet connection flow

### 3. API Endpoint Updates
- Remove fee calculation endpoints (if any)
- Simplify transaction submission endpoints
- Update transaction recording to work with Portals

## Testing

### Current Setup
Use `npm run setup-test-data` to populate dummy contacts with wallet addresses for testing stablecoin transfers.

### Test Scenarios
1. **Traditional Transfer**: Contact without `walletAddress` → Uses API-based transfer
2. **Stablecoin Transfer**: Contact with `walletAddress` → Uses Portals virtual accounts
3. **Fee Validation**: Ensure no fee calculations in client for Portals transfers

## Configuration

### Default Token
Currently defaults to USDC for stablecoin transfers. This can be made configurable:
```typescript
// In sendMoney method
const tokenMint = config.defaultStablecoin || 'USDC';
```

### Virtual Accounts
Portals virtual accounts configuration should be handled in:
- Backend environment variables
- Portals dashboard settings
- Fee policy configuration

## Monitoring

### Metrics to Track
- Transaction success rate with Portals
- Fee handling accuracy
- User experience improvements
- Error rates comparison (before/after)

### Logging
Enhanced logging added for:
- Transfer method selection (API vs Portals)
- Portals virtual accounts operations
- Fee handling status

## Support

For Portals-specific integration questions:
- Portals documentation
- Portals developer support
- Internal team escalation path 