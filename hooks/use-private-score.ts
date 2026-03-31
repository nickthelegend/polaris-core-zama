import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePolaris } from '@/hooks/use-polaris';
import { CONTRACTS, ABIS, NETWORKS } from '@/lib/contracts';
import { getZamaInstance } from '@/lib/fhevm';
import { logger } from '@/lib/logger';

interface PrivateScoreState {
  decryptedScore: number | null;
  isInitialized: boolean | null;
  loading: boolean;
  decrypting: boolean;
  error: string | null;
}

export function usePrivateScore() {
  const { getContract, address, chainId } = usePolaris();

  const [state, setState] = useState<PrivateScoreState>({
    decryptedScore: null,
    isInitialized: null,
    loading: false,
    decrypting: false,
    error: null,
  });

  const getContractAddress = useCallback(() => {
    return (CONTRACTS.PRIVATE_LENDING as any).PRIVATE_SCORE_MANAGER || "";
  }, []);

  const getNetworkId = useCallback((): number => {
    if (!chainId) return NETWORKS.SEPOLIA.id;
    const part = chainId.includes(':') ? chainId.split(':')[1] : chainId;
    return parseInt(part, 10) || NETWORKS.SEPOLIA.id;
  }, [chainId]);

  /**
   * Check if the user's score has been initialized on-chain.
   */
  const checkInitialized = useCallback(async (): Promise<boolean> => {
    if (!address) return false;
    try {
      const addr = getContractAddress();
      if (!addr) return false;
      const nid = getNetworkId();
      const contract = await getContract(addr, ABIS.PrivateScoreManager, nid, false);
      const initialized = await contract.hasScore(address);
      setState(s => ({ ...s, isInitialized: initialized }));
      return initialized;
    } catch (err) {
      logger.error('PRIVATE_SCORE', 'checkInitialized failed', { error: err });
      return false;
    }
  }, [address, getContractAddress, getNetworkId, getContract]);

  /**
   * Initialize the user's encrypted score to 300 (MIN_SCORE).
   */
  const initializeScore = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const addr = getContractAddress();
      const nid = getNetworkId();
      const contract = await getContract(addr, ABIS.PrivateScoreManager, nid);
      const tx = await contract.initializeScore(address);
      await tx.wait();
      setState(s => ({ ...s, loading: false, isInitialized: true }));
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message }));
      throw err;
    }
  }, [address, getContractAddress, getNetworkId, getContract]);

  /**
   * Decrypt the user's encrypted credit score using Zama's EIP-712 re-encryption.
   * Only the connected user can decrypt their own score.
   */
  const decryptScore = useCallback(async (): Promise<number | null> => {
    if (!address) return null;
    setState(s => ({ ...s, decrypting: true, error: null }));

    try {
      const contractAddr = getContractAddress();
      const nid = getNetworkId();
      const contract = await getContract(contractAddr, ABIS.PrivateScoreManager, nid, false);

      // Get the encrypted handle from the contract
      const encryptedHandle = await contract.getEncryptedScore(address);

      if (!encryptedHandle || encryptedHandle === '0x' + '0'.repeat(64)) {
        setState(s => ({ ...s, decrypting: false, decryptedScore: null }));
        return null;
      }

      // Use Zama's re-encryption flow
      const fhevm = await getZamaInstance();
      const { publicKey, privateKey } = fhevm.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 1;
      const contractAddresses = [contractAddr];

      // Create EIP-712 typed data for the user to sign
      const eip712 = fhevm.createEIP712(publicKey, contractAddresses, startTimestamp, durationDays);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const { EIP712Domain, ...types } = (eip712 as any).types;

      // User signs the EIP-712 message — this is the consent step
      const signature = await signer.signTypedData(
        (eip712 as any).domain,
        types,
        (eip712 as any).message
      );

      // Decrypt using the Zama gateway
      const results = await fhevm.userDecrypt(
        [{ handle: encryptedHandle, contractAddress: contractAddr }],
        privateKey,
        publicKey,
        signature,
        contractAddresses,
        address,
        startTimestamp,
        durationDays
      );

      const clearValue = results[encryptedHandle as `0x${string}`];
      const score = clearValue === undefined ? null : Number(BigInt(clearValue));

      setState(s => ({ ...s, decrypting: false, decryptedScore: score }));
      return score;
    } catch (err: any) {
      logger.error('PRIVATE_SCORE', 'decryptScore failed', { error: err });
      setState(s => ({ ...s, decrypting: false, error: err.message }));
      throw err;
    }
  }, [address, getContractAddress, getNetworkId, getContract]);

  return {
    ...state,
    checkInitialized,
    initializeScore,
    decryptScore,
    contractAddress: getContractAddress(),
  };
}
