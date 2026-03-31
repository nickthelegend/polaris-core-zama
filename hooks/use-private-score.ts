import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePolaris } from '@/hooks/use-polaris';
import { CONTRACTS, ABIS, NETWORKS } from '@/lib/contracts';
import { getZamaInstance } from '@/lib/fhevm';
import { logger } from '@/lib/logger';

interface PrivateScoreState {
  decryptedScore: number | null;
  decryptedLimit: number | null;
  isInitialized: boolean | null;
  loading: boolean;
  decrypting: boolean;
  error: string | null;
}

export function usePrivateScore() {
  const { getContract, address, chainId } = usePolaris();
  const [state, setState] = useState<PrivateScoreState>({
    decryptedScore: null, decryptedLimit: null,
    isInitialized: null, loading: false, decrypting: false, error: null,
  });

  const getAddr = useCallback(() => {
    return (CONTRACTS.PRIVATE_LENDING as any).PRIVATE_SCORE_MANAGER || "";
  }, []);

  const getNid = useCallback((): number => {
    if (!chainId) return NETWORKS.SEPOLIA.id;
    const p = chainId.includes(':') ? chainId.split(':')[1] : chainId;
    return parseInt(p, 10) || NETWORKS.SEPOLIA.id;
  }, [chainId]);

  const checkInitialized = useCallback(async (): Promise<boolean> => {
    if (!address) return false;
    try {
      const c = await getContract(getAddr(), ABIS.PrivateScoreManager, getNid(), false);
      const init = await c.hasScore(address);
      setState(s => ({ ...s, isInitialized: init }));
      return init;
    } catch { return false; }
  }, [address, getAddr, getNid, getContract]);

  const initializeScore = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const c = await getContract(getAddr(), ABIS.PrivateScoreManager, getNid());
      const tx = await c.initializeScore(address);
      await tx.wait();
      setState(s => ({ ...s, loading: false, isInitialized: true }));
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, [address, getAddr, getNid, getContract]);

  /** Decrypt both score AND credit limit in one EIP-712 consent flow */
  const decryptAll = useCallback(async (): Promise<{ score: number | null; limit: number | null }> => {
    if (!address) return { score: null, limit: null };
    setState(s => ({ ...s, decrypting: true, error: null }));
    try {
      const contractAddr = getAddr();
      const nid = getNid();
      const contract = await getContract(contractAddr, ABIS.PrivateScoreManager, nid, false);

      const scoreHandle = await contract.getEncryptedScore(address);
      const limitHandle = await contract.getEncryptedLimit(address);

      const handles: { handle: string; contractAddress: string }[] = [];
      const zero = '0x' + '0'.repeat(64);
      if (scoreHandle && scoreHandle !== zero) handles.push({ handle: scoreHandle, contractAddress: contractAddr });
      if (limitHandle && limitHandle !== zero) handles.push({ handle: limitHandle, contractAddress: contractAddr });

      if (handles.length === 0) {
        setState(s => ({ ...s, decrypting: false, decryptedScore: null, decryptedLimit: null }));
        return { score: null, limit: null };
      }

      const fhevm = await getZamaInstance();
      const { publicKey, privateKey } = fhevm.generateKeypair();
      const startTs = Math.floor(Date.now() / 1000);
      const days = 1;
      const addrs = [contractAddr];

      const eip712 = fhevm.createEIP712(publicKey, addrs, startTs, days);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const { EIP712Domain, ...types } = (eip712 as any).types;
      const signature = await signer.signTypedData((eip712 as any).domain, types, (eip712 as any).message);

      const results = await fhevm.userDecrypt(handles, privateKey, publicKey, signature, addrs, address, startTs, days);

      const parse = (h: string) => { const v = results[h as `0x${string}`]; return v === undefined ? null : Number(BigInt(v)); };
      const score = scoreHandle && scoreHandle !== zero ? parse(scoreHandle) : null;
      const limit = limitHandle && limitHandle !== zero ? parse(limitHandle) : null;

      setState(s => ({ ...s, decrypting: false, decryptedScore: score, decryptedLimit: limit }));
      return { score, limit };
    } catch (e: any) {
      logger.error('PRIVATE_SCORE', 'decryptAll failed', { error: e });
      setState(s => ({ ...s, decrypting: false, error: e.message }));
      return { score: null, limit: null };
    }
  }, [address, getAddr, getNid, getContract]);

  // Keep single decryptScore for backward compat
  const decryptScore = decryptAll;

  return {
    ...state,
    checkInitialized,
    initializeScore,
    decryptScore,
    decryptAll,
    contractAddress: getAddr(),
  };
}
