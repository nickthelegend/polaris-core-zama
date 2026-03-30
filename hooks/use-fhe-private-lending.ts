import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePolaris } from '@/hooks/use-polaris';
import { CONTRACTS, ABIS, NETWORKS } from '@/lib/contracts';

import { getZamaInstance, encrypt64 } from '@/lib/fhevm';
import { logger } from '@/lib/logger';
import { parseRevertReason } from '@/lib/revert-mapper';

// ─── State shape ────────────────────────────────────────────────────────────

interface FhePrivateLendingState {
  collateralBalance: bigint | null;
  debtBalance: bigint | null;
  suppliedBalance: bigint | null;
  loading: boolean;
  error: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFhePrivateLending() {
  const { getContract, address, chainId } = usePolaris();

  const [state, setState] = useState<FhePrivateLendingState>({
    collateralBalance: null,
    debtBalance: null,
    suppliedBalance: null,
    loading: false,
    error: null,
  });

  // Resolve the network ID from the connected wallet's chainId string.
  // Unknown chains fall back to LOCAL_HARDHAT so the FHE contracts still resolve.
  const getNetworkId = useCallback((): number => {
    if (!chainId) return NETWORKS.LOCAL_HARDHAT.id;
    const part = chainId.includes(':') ? chainId.split(':')[1] : chainId;
    const parsed = parseInt(part, 10);
    // Only return the parsed ID if it's a known network, otherwise use LOCAL_HARDHAT
    const known = Object.values(NETWORKS).some(n => n.id === parsed);
    return known ? parsed : NETWORKS.LOCAL_HARDHAT.id;
  }, [chainId]);

  // Resolve the right contract addresses for the connected network.
  const getAddresses = useCallback(() => {
    const networkId = getNetworkId();
    if (networkId === NETWORKS.SEPOLIA.id) return CONTRACTS.PRIVATE_LENDING;
    // Everything else (local Hardhat, unknown chains) uses LOCAL_HARDHAT addresses
    return CONTRACTS.LOCAL_HARDHAT;
  }, [getNetworkId]);

  // ── encryptAmount ──────────────────────────────────────────────────────────
  // Requirements 7.1, 7.2, 7.3
  const encryptAmount = useCallback(
    async (
      amount: bigint,
      contractAddress: string
    ): Promise<{ handle: string; proof: string }> => {
      if (!address) throw new Error('Wallet not connected');

      const { handles, inputProof } = await encrypt64(contractAddress as `0x${string}`, address as `0x${string}`, amount);
      return { handle: handles[0], proof: inputProof };
    },
    [address]
  );

  // ── Generic user-decrypt helper ────────────────────────────────────────────
  // Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
  const userDecrypt = useCallback(
    async (encryptedHandle: string, contractAddress: string): Promise<bigint | null> => {
      if (!address) return null;
      try {
        const fhevm = await getZamaInstance();
        const { publicKey, privateKey } = fhevm.generateKeypair();
        const eip712 = fhevm.createEIP712(publicKey, contractAddress);

        // Request EIP-712 signature from the connected wallet.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const signature = await signer.signTypedData(
          (eip712 as { domain: object }).domain as Parameters<typeof signer.signTypedData>[0],
          (eip712 as { types: object }).types as Parameters<typeof signer.signTypedData>[1],
          (eip712 as { message: object }).message as Parameters<typeof signer.signTypedData>[2]
        );

        const result = await fhevm.userDecrypt(
          encryptedHandle,
          privateKey,
          publicKey,
          signature,
          contractAddress,
          address
        );
        return result;
      } catch (err) {
        logger.error('FHE_PRIVATE_LENDING', 'userDecrypt failed', { error: err, contractAddress });
        return null;
      }
    },
    [address]
  );

  // ── decryptCollateral ──────────────────────────────────────────────────────
  // Requirement 6.2
  const decryptCollateral = useCallback(
    async (contractAddress: string): Promise<bigint | null> => {
      if (!address) return null;
      try {
        const networkId = getNetworkId();
        const vault = await getContract(contractAddress, ABIS.PrivateCollateralVault, networkId, false);
        const handle: string = await vault.getCollateralAmount(address);
        return await userDecrypt(handle, contractAddress);
      } catch (err) {
        logger.error('FHE_PRIVATE_LENDING', 'decryptCollateral failed', { error: err, contractAddress });
        return null;
      }
    },
    [address, getContract, getNetworkId, userDecrypt]
  );

  // ── decryptDebt ────────────────────────────────────────────────────────────
  // Requirement 6.3
  const decryptDebt = useCallback(
    async (contractAddress: string): Promise<bigint | null> => {
      if (!address) return null;
      try {
        const networkId = getNetworkId();
        const borrow = await getContract(contractAddress, ABIS.PrivateBorrowManager, networkId, false);
        const handle: string = await borrow.getDebtAmount(address);
        return await userDecrypt(handle, contractAddress);
      } catch (err) {
        logger.error('FHE_PRIVATE_LENDING', 'decryptDebt failed', { error: err, contractAddress });
        return null;
      }
    },
    [address, getContract, getNetworkId, userDecrypt]
  );

  // ── decryptSupplied ────────────────────────────────────────────────────────
  // Requirement 6.4
  const decryptSupplied = useCallback(
    async (contractAddress: string): Promise<bigint | null> => {
      if (!address) return null;
      try {
        const networkId = getNetworkId();
        const pool = await getContract(contractAddress, ABIS.PrivateLendingPool, networkId, false);
        const handle: string = await pool.getSuppliedAmount(address);
        return await userDecrypt(handle, contractAddress);
      } catch (err) {
        logger.error('FHE_PRIVATE_LENDING', 'decryptSupplied failed', { error: err, contractAddress });
        return null;
      }
    },
    [address, getContract, getNetworkId, userDecrypt]
  );

  // ── depositCollateral ──────────────────────────────────────────────────────
  // Requirement 2.1
  const depositCollateral = useCallback(
    async (amount: bigint): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      const module = 'FHE_LENDING_COLLATERAL';
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_COLLATERAL_VAULT;
        
        logger.logFheLifecycle(module, 'ENCRYPTION_START', { amount: amount.toString(), contractAddress });
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        logger.logFheLifecycle(module, 'ENCRYPTION_SUCCESS', { handle });

        const vault = await getContract(contractAddress, ABIS.PrivateCollateralVault, networkId);
        
        logger.logFheLifecycle(module, 'BROADCAST');
        const tx = await vault.depositCollateral(handle, proof);
        const receipt = await tx.wait();
        logger.logFheLifecycle(module, 'CONFIRMED', { txHash: receipt.hash });

        const balance = await decryptCollateral(contractAddress);
        setState(s => ({ ...s, collateralBalance: balance, loading: false }));
        return receipt.hash;
      } catch (err: unknown) {
        const msg = parseRevertReason(err);
        logger.error(module, 'depositCollateral failed', { error: err, msg });
        setState(s => ({ ...s, loading: false, error: msg }));
        throw new Error(msg);
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptCollateral]
  );

  // ── withdrawCollateral ─────────────────────────────────────────────────────
  // Requirement 2.2
  const withdrawCollateral = useCallback(
    async (amount: bigint): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      const module = 'FHE_LENDING_COLLATERAL';
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_COLLATERAL_VAULT;
        
        logger.logFheLifecycle(module, 'ENCRYPTION_START', { amount: amount.toString(), contractAddress });
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        logger.logFheLifecycle(module, 'ENCRYPTION_SUCCESS', { handle });

        const vault = await getContract(contractAddress, ABIS.PrivateCollateralVault, networkId);
        
        logger.logFheLifecycle(module, 'BROADCAST');
        const tx = await vault.withdrawCollateral(handle, proof);
        const receipt = await tx.wait();
        logger.logFheLifecycle(module, 'CONFIRMED', { txHash: receipt.hash });

        const balance = await decryptCollateral(contractAddress);
        setState(s => ({ ...s, collateralBalance: balance, loading: false }));
        return receipt.hash;
      } catch (err: unknown) {
        const msg = parseRevertReason(err);
        logger.error(module, 'withdrawCollateral failed', { error: err, msg });
        setState(s => ({ ...s, loading: false, error: msg }));
        throw new Error(msg);
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptCollateral]
  );

  // ── writePosition ──────────────────────────────────────────────────────────
  // Internal helper — Requirements 7.1, 7.2, 7.3, 7.4, 7.5
  const writePosition = useCallback(
    (payload: {
      walletAddress: string;
      type: 'SUPPLY' | 'BORROW';
      symbol: string;
      entryAmount: number;
      txHash: string;
    }) => {
      fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => logger.error('FHE_PRIVATE_LENDING', 'positions sync failed', { error: err }));
    },
    []
  );

  // ── borrow ─────────────────────────────────────────────────────────────────
  // Requirement 3.1
  const borrow = useCallback(
    async (amount: bigint, symbol: string): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      const module = 'FHE_LENDING_BORROW';
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_BORROW_MANAGER;
        
        logger.logFheLifecycle(module, 'ENCRYPTION_START', { amount: amount.toString(), symbol, contractAddress });
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        logger.logFheLifecycle(module, 'ENCRYPTION_SUCCESS', { handle });

        const borrowMgr = await getContract(contractAddress, ABIS.PrivateBorrowManager, networkId);
        
        logger.logFheLifecycle(module, 'BROADCAST');
        const tx = await borrowMgr.borrow(handle, proof);
        const receipt = await tx.wait();
        logger.logFheLifecycle(module, 'CONFIRMED', { txHash: receipt.hash });

        const balance = await decryptDebt(contractAddress);
        setState(s => ({ ...s, debtBalance: balance, loading: false }));

        // Requirement 7.2 — record position after confirmed tx
        if (address) {
          writePosition({
            walletAddress: address.toLowerCase(),
            type: 'BORROW',
            symbol,
            entryAmount: Number(amount) / 1e18,
            txHash: receipt.hash,
          });
        }

        return receipt.hash;
      } catch (err: unknown) {
        const msg = parseRevertReason(err);
        logger.error(module, 'borrow failed', { error: err, symbol, amount: amount.toString(), msg });
        setState(s => ({ ...s, loading: false, error: msg }));
        throw new Error(msg);
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptDebt, address, writePosition]
  );

  // ── repay ──────────────────────────────────────────────────────────────────
  // Requirement 3.3
  const repay = useCallback(
    async (amount: bigint, symbol: string): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      const module = 'FHE_LENDING_REPAY';
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_BORROW_MANAGER;
        
        logger.logFheLifecycle(module, 'ENCRYPTION_START', { amount: amount.toString(), symbol, contractAddress });
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        logger.logFheLifecycle(module, 'ENCRYPTION_SUCCESS', { handle });

        const borrowMgr = await getContract(contractAddress, ABIS.PrivateBorrowManager, networkId);
        
        logger.logFheLifecycle(module, 'BROADCAST');
        const tx = await borrowMgr.repay(handle, proof);
        const receipt = await tx.wait();
        logger.logFheLifecycle(module, 'CONFIRMED', { txHash: receipt.hash });

        const balance = await decryptDebt(contractAddress);
        setState(s => ({ ...s, debtBalance: balance, loading: false }));

        // Requirement 7.3 — close borrow position after repay
        if (address) {
          writePosition({
            walletAddress: address.toLowerCase(),
            type: 'BORROW',
            symbol,
            entryAmount: 0,
            txHash: receipt.hash,
          });
        }

        return receipt.hash;
      } catch (err: unknown) {
        const msg = parseRevertReason(err);
        logger.error(module, 'repay failed', { error: err, symbol, amount: amount.toString(), msg });
        setState(s => ({ ...s, loading: false, error: msg }));
        throw new Error(msg);
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptDebt, address, writePosition]
  );

  // ── supply ─────────────────────────────────────────────────────────────────
  // Requirement 4.1
  const supply = useCallback(
    async (amount: bigint, symbol: string): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      const module = 'FHE_LENDING_SUPPLY';
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_LENDING_POOL;
        
        logger.logFheLifecycle(module, 'ENCRYPTION_START', { amount: amount.toString(), symbol, contractAddress });
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        logger.logFheLifecycle(module, 'ENCRYPTION_SUCCESS', { handle });

        const pool = await getContract(contractAddress, ABIS.PrivateLendingPool, networkId);
        
        logger.logFheLifecycle(module, 'BROADCAST');
        const tx = await pool.supply(handle, proof);
        const receipt = await tx.wait();
        logger.logFheLifecycle(module, 'CONFIRMED', { txHash: receipt.hash });

        const balance = await decryptSupplied(contractAddress);
        setState(s => ({ ...s, suppliedBalance: balance, loading: false }));

        // Requirement 7.1 — record position after confirmed tx
        if (address) {
          writePosition({
            walletAddress: address.toLowerCase(),
            type: 'SUPPLY',
            symbol,
            entryAmount: Number(amount) / 1e18,
            txHash: receipt.hash,
          });
        }

        return receipt.hash;
      } catch (err: unknown) {
        const msg = parseRevertReason(err);
        logger.error(module, 'supply failed', { error: err, symbol, amount: amount.toString(), msg });
        setState(s => ({ ...s, loading: false, error: msg }));
        throw new Error(msg);
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptSupplied, address, writePosition]
  );

  // ── withdrawSupply ─────────────────────────────────────────────────────────
  // Requirement 4.2
  const withdrawSupply = useCallback(
    async (amount: bigint, symbol: string): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      const module = 'FHE_LENDING_WITHDRAW';
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_LENDING_POOL;
        
        logger.logFheLifecycle(module, 'ENCRYPTION_START', { amount: amount.toString(), symbol, contractAddress });
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        logger.logFheLifecycle(module, 'ENCRYPTION_SUCCESS', { handle });

        const pool = await getContract(contractAddress, ABIS.PrivateLendingPool, networkId);
        
        logger.logFheLifecycle(module, 'BROADCAST');
        const tx = await pool.withdraw(handle, proof);
        const receipt = await tx.wait();
        logger.logFheLifecycle(module, 'CONFIRMED', { txHash: receipt.hash });

        const balance = await decryptSupplied(contractAddress);
        setState(s => ({ ...s, suppliedBalance: balance, loading: false }));

        // Requirement 7.4 — close supply position after full withdrawal
        if (address) {
          writePosition({
            walletAddress: address.toLowerCase(),
            type: 'SUPPLY',
            symbol,
            entryAmount: 0,
            txHash: receipt.hash,
          });
        }

        return receipt.hash;
      } catch (err: unknown) {
        const msg = parseRevertReason(err);
        logger.error(module, 'withdrawSupply failed', { error: err, symbol, amount: amount.toString(), msg });
        setState(s => ({ ...s, loading: false, error: msg }));
        throw new Error(msg);
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptSupplied, address, writePosition]
  );

  return {
    // State — Requirements 6.5
    collateralBalance: state.collateralBalance,
    debtBalance: state.debtBalance,
    suppliedBalance: state.suppliedBalance,
    loading: state.loading,
    error: state.error,

    // Encrypt / decrypt helpers — Requirements 7.1, 6.2–6.4
    encryptAmount,
    decryptCollateral,
    decryptDebt,
    decryptSupplied,

    // Transaction actions — Requirements 2.1, 2.2, 3.1, 3.3, 4.1, 4.2
    depositCollateral,
    withdrawCollateral,
    borrow,
    repay,
    supply,
    withdrawSupply,
  };
}
