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
  const getNetworkId = useCallback((): number => {
    if (!chainId) return NETWORKS.LOCAL_HARDHAT.id;
    const part = chainId.includes(':') ? chainId.split(':')[1] : chainId;
    const parsed = parseInt(part, 10);
    const known = Object.values(NETWORKS).some(n => n.id === parsed);
    return known ? parsed : NETWORKS.LOCAL_HARDHAT.id;
  }, [chainId]);

  const getAddresses = useCallback(() => {
    const nid = getNetworkId();
    if (nid === NETWORKS.SEPOLIA.id) return CONTRACTS.PRIVATE_LENDING;
    return CONTRACTS.LOCAL_HARDHAT;
  }, [getNetworkId]);

  const encryptAmount = useCallback(
    async (amount: bigint, contractAddress: string): Promise<{ handle: string; proof: string }> => {
      if (!address) throw new Error('Wallet not connected');
      const { handles, inputProof } = await encrypt64(contractAddress as `0x${string}`, address as `0x${string}`, amount);
      return { handle: handles[0], proof: inputProof };
    },
    [address]
  );

  const userDecrypt = useCallback(
    async (encryptedHandle: string, contractAddress: string): Promise<bigint | null> => {
      if (!address) return null;
      if (!encryptedHandle || encryptedHandle === '0x' + '0'.repeat(64)) return BigInt(0);

      try {
        const fhevm = await getZamaInstance();
        const { publicKey, privateKey } = fhevm.generateKeypair();
        const startTimestamp = Math.floor(Date.now() / 1000);
        const durationDays = 1;
        const contractAddresses = [contractAddress];

        const eip712 = fhevm.createEIP712(publicKey, contractAddresses, startTimestamp, durationDays);
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const { EIP712Domain, ...types } = (eip712 as any).types;

        const signature = await signer.signTypedData((eip712 as any).domain, types, (eip712 as any).message);

        const results = await fhevm.userDecrypt(
          [{ handle: encryptedHandle, contractAddress }],
          privateKey,
          publicKey,
          signature,
          contractAddresses,
          address,
          startTimestamp,
          durationDays
        );
        
        const clearValue = results[encryptedHandle as `0x${string}`];
        return clearValue === undefined ? null : BigInt(clearValue);
      } catch (err) {
        logger.error('FHE_PRIVATE_LENDING', 'userDecrypt failed', { error: err, contractAddress });
        throw err;
      }
    },
    [address]
  );

  const decryptAllPositions = useCallback(async (
    poolAddress: string,
    borrowAddress: string,
    vaultAddress: string
  ) => {
    if (!address) return;
    setState(s => ({ ...s, loading: true }));
    try {
      const nid = getNetworkId();
      const pool = await getContract(poolAddress, ABIS.PrivateLendingPool, nid);
      const borrow = await getContract(borrowAddress, ABIS.PrivateBorrowManager, nid);
      const vault = await getContract(vaultAddress, ABIS.PrivateCollateralVault, nid);

      const [sHandle, dHandle, cHandle] = await Promise.all([
        pool.getSuppliedAmount(address),
        borrow.getDebtAmount(address),
        vault.getCollateralAmount(address)
      ]);

      const fhevm = await getZamaInstance();
      const { publicKey, privateKey } = fhevm.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 1;
      
      const contractAddresses = [poolAddress, borrowAddress, vaultAddress];
      const handleContractPairs = [
        { handle: sHandle, contractAddress: poolAddress },
        { handle: dHandle, contractAddress: borrowAddress },
        { handle: cHandle, contractAddress: vaultAddress }
      ].filter(p => p.handle && p.handle !== '0x' + '0'.repeat(64));

      if (handleContractPairs.length === 0) {
        setState(s => ({ ...s, suppliedBalance: 0n, debtBalance: 0n, collateralBalance: 0n, loading: false }));
        return;
      }

      const eip712 = fhevm.createEIP712(publicKey, contractAddresses, startTimestamp, durationDays);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const { EIP712Domain, ...types } = (eip712 as any).types;
      const signature = await signer.signTypedData((eip712 as any).domain, types, (eip712 as any).message);

      const results = await fhevm.userDecrypt(
        handleContractPairs,
        privateKey,
        publicKey,
        signature,
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );

      const parse = (h: string) => {
        const val = results[h as `0x${string}`];
        return val === undefined ? 0n : BigInt(val);
      };

      setState(s => ({
        ...s,
        suppliedBalance: parse(sHandle),
        debtBalance: parse(dHandle),
        collateralBalance: parse(cHandle),
        loading: false
      }));
    } catch (err) {
      logger.error('FHE_PRIVATE_LENDING', 'decryptAllPositions failed', { error: err });
      setState(s => ({ ...s, loading: false }));
      throw err;
    }
  }, [address, getNetworkId, getContract]);

  const supply = useCallback(async (amount: bigint, symbol: string): Promise<string> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const nid = getNetworkId();
      const addr = getAddresses().PRIVATE_LENDING_POOL;
      const { handle, proof } = await encryptAmount(amount, addr);
      const pool = await getContract(addr, ABIS.PrivateLendingPool, nid);
      const tx = await pool.supply(handle, proof);
      const receipt = await tx.wait();
      setState(s => ({ ...s, loading: false }));
      return receipt.hash;
    } catch (err: any) {
      const msg = parseRevertReason(err);
      setState(s => ({ ...s, loading: false, error: msg }));
      throw new Error(msg);
    }
  }, [encryptAmount, getContract, getNetworkId, getAddresses]);

  const borrow = useCallback(async (amount: bigint, symbol: string): Promise<string> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const nid = getNetworkId();
      const addr = getAddresses().PRIVATE_BORROW_MANAGER;
      const { handle, proof } = await encryptAmount(amount, addr);
      const borrowMgr = await getContract(addr, ABIS.PrivateBorrowManager, nid);
      const tx = await borrowMgr.borrow(handle, proof);
      const receipt = await tx.wait();
      setState(s => ({ ...s, loading: false }));
      return receipt.hash;
    } catch (err: any) {
      const msg = parseRevertReason(err);
      setState(s => ({ ...s, loading: false, error: msg }));
      throw new Error(msg);
    }
  }, [encryptAmount, getContract, getNetworkId, getAddresses]);

  const depositCollateral = useCallback(async (amount: bigint): Promise<string> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const nid = getNetworkId();
      const addr = getAddresses().PRIVATE_COLLATERAL_VAULT;
      const { handle, proof } = await encryptAmount(amount, addr);
      const vault = await getContract(addr, ABIS.PrivateCollateralVault, nid);
      const tx = await vault.depositCollateral(handle, proof);
      const receipt = await tx.wait();
      setState(s => ({ ...s, loading: false }));
      return receipt.hash;
    } catch (err: any) {
      const msg = parseRevertReason(err);
      setState(s => ({ ...s, loading: false, error: msg }));
      throw new Error(msg);
    }
  }, [encryptAmount, getContract, getNetworkId, getAddresses]);

  return {
    ...state,
    decryptAllPositions,
    supply,
    borrow,
    depositCollateral,
    encryptAmount
  };
}
