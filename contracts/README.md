# PayEase Smart Contracts

## Current Status: ⚠️ PARTIALLY LINKED

Your smart contracts are compiled but still using **MOCK contract IDs**.

## What You Have
- ✅ `MainSmartContract.algo.ts` - Compiled successfully
- ✅ `UserAccount.algo.ts` - Individual user account management
- ✅ Frontend integration layer (`lib/algorand/contracts.ts`)
- ✅ **AlgoKit installed and working**
- ✅ **TEAL compilation successful**
- ⚠️ **Using mock contract IDs (123456789, 987654321)**
- ⚠️ **Some functions still have TODO comments**

## To Complete Linking

### 1. Deploy Real Contracts ✅ READY
```bash
# Your contracts are compiled and ready to deploy
node scripts/fund-and-deploy.js
```

### 2. Current Mock IDs
```typescript
// In lib/algorand/contracts.ts
export const MAIN_CONTRACT_ID = 123456789; // ← MOCK ID
export const USER_ACCOUNT_CONTRACT_ID = 987654321; // ← MOCK ID
```

### 3. What Happens After Real Deployment
- ✅ Real contract IDs replace mock ones
- ✅ Actual blockchain transactions
- ✅ Verifiable on AlgoExplorer
- ✅ Real on-chain state management

## Contract Functions

### MainSmartContract
- `createApplication()` - Initialize main contract
- `register(payTxn, userAddress)` - Register user with payment

### UserAccountContract  
- `createApplication(ownerAddress)` - Initialize user account
- `verify(providerName, proofHash, account)` - Verify user identity

## Current Integration Status
- **AlgoKit**: ✅ Installed and working
- **Compilation**: ✅ TEAL files generated successfully
- **Connection Check**: ✅ Algorand client connected
- **Contract IDs**: ⚠️ Using mock placeholders
- **Transaction Creation**: ✅ Real algosdk calls (registerUser, processPayment)
- **Some Functions**: ⚠️ Still have TODO comments

**Next Step**: Run `node scripts/fund-and-deploy.js` to get real contract IDs!