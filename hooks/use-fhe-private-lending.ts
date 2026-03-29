import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePolaris } from '@/hooks/use-polaris';
import { CONTRACTS, ABIS, NETWORKS } from '@/lib/contracts';

// FHEVM SDK types — resolved at runtime to support both mock (Hardhat) and
// production (Zama relayer) environments without hard-coding a single import.
type FhevmInstance = {
  createEncryptedInput: (contractAddress: string, userAddress: string) => {
    add64: (value: bigint) => { encrypt: () => Promise<{ handles: Uint8Array[]; inputProof: Uint8Array }> };
  };
  generateKeypair: () => { publicKey: Uint8Array; privateKey: Uint8Array };
  createEIP712: (publicKey: Uint8Array, contractAddress: string) => object;
  userDecrypt: (
    handle: string,
    privateKey: Uint8Array,
    publicKey: Uint8Array,
    signature: string,
    contractAddress: string,
    userAddress: string
  ) => Promise<bigint>;
};

// Lazily resolved FHEVM instance (mock or production).
let _fhevmInstance: FhevmInstance | null = null;

async function getFhevmInstance(): Promise<FhevmInstance> {
  if (_fhevmInstance) return _fhevmInstance;

  // Try the Zama relayer SDK first (production), fall back to the Hardhat mock.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createInstance } = require('@zama-fhe/relayer-sdk');
    _fhevmInstance = await createInstance();
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createInstance } = require('@fhevm/hardhat-plugin/lib/utils/instance');
    _fhevmInstance = await createInstance();
  }

  return _fhevmInstance!;
}

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
    if (!chainId) return NETWORKS.SEPOLIA.id;
    const part = chainId.includes(':') ? chainId.split(':')[1] : chainId;
    return parseInt(part, 10) || NETWORKS.SEPOLIA.id;
  }, [chainId]);

  // ── encryptAmount ──────────────────────────────────────────────────────────
  // Requirements 7.1, 7.2, 7.3
  const encryptAmount = useCallback(
    async (
      amount: bigint,
      contractAddress: string
    ): Promise<{ handle: string; proof: string }> => {
      if (!address) throw new Error('Wallet not connected');

      const fhevm = await getFhevmInstance();
      const input = fhevm.createEncryptedInput(contractAddress, address);
      const { handles, inputProof } = await input.add64(amount).encrypt();

      // handles[0] is the externalEuint64 bytes32 handle; inputProof is the ZK proof.
      const handle = '0x' + Buffer.from(handles[0]).toString('hex');
      const proof = '0x' + Buffer.from(inputProof).toString('hex');
      return { handle, proof };
    },
    [address]
  );

  // ── Generic user-decrypt helper ────────────────────────────────────────────
  // Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
  const userDecrypt = useCallback(
    async (encryptedHandle: string, contractAddress: string): Promise<bigint | null> => {
      if (!address) return null;
      try {
        const fhevm = await getFhevmInstance();
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
        console.error('[FHE] userDecrypt failed:', err);
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
        console.error('[FHE] decryptCollateral failed:', err);
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
        console.error('[FHE] decryptDebt failed:', err);
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
        console.error('[FHE] decryptSupplied failed:', err);
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
      try {
        const networkId = getNetworkId();
        const contractAddress = CONTRACTS.PRIVATE_LENDING.PRIVATE_COLLATERAL_VAULT;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const vault = await getContract(contractAddress, ABIS.PrivateCollateralVault, networkId);
        const tx = await vault.depositCollateral(handle, proof);
        const receipt = await tx.wait();

        const balance = await decryptCollateral(contractAddress);
        setState(s => ({ ...s, collateralBalance: balance, loading: false }));
        return receipt.hash;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, decryptCollateral]
  );

  // ── withdrawCollateral ─────────────────────────────────────────────────────
  // Requirement 2.2
  const withdrawCollateral = useCallback(
    async (amount: bigint): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = CONTRACTS.PRIVATE_LENDING.PRIVATE_COLLATERAL_VAULT;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const vault = await getContract(contractAddress, ABIS.PrivateCollateralVault, networkId);
        const tx = await vault.withdrawCollateral(handle, proof);
        const receipt = await tx.wait();

        const balance = await decryptCollateral(contractAddress);
        setState(s => ({ ...s, collateralBalance: balance, loading: false }));
        return receipt.hash;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, decryptCollateral]
  );

  // ── borrow ─────────────────────────────────────────────────────────────────
  // Requirement 3.1
  const borrow = useCallback(
    async (amount: bigint): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = CONTRACTS.PRIVATE_LENDING.PRIVATE_BORROW_MANAGER;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const borrowMgr = await getContract(contractAddress, ABIS.PrivateBorrowManager, networkId);
        const tx = await borrowMgr.borrow(handle, proof);
        const receipt = await tx.wait();

        const balance = await decryptDebt(contractAddress);
        setState(s => ({ ...s, debtBalance: balance, loading: false }));
        return receipt.hash;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, decryptDebt]
  );

  // ── repay ──────────────────────────────────────────────────────────────────
  // Requirement 3.3
  const repay = useCallback(
    async (amount: bigint): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = CONTRACTS.PRIVATE_LENDING.PRIVATE_BORROW_MANAGER;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const borrowMgr = await getContract(contractAddress, ABIS.PrivateBorrowManager, networkId);
        const tx = await borrowMgr.repay(handle, proof);
        const receipt = await tx.wait();

        const balance = await decryptDebt(contractAddress);
        setState(s => ({ ...s, debtBalance: balance, loading: false }));
        return receipt.hash;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, decryptDebt]
  );

  // ── supply ─────────────────────────────────────────────────────────────────
  // Requirement 4.1
  const supply = useCallback(
    async (amount: bigint): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = CONTRACTS.PRIVATE_LENDING.PRIVATE_LENDING_POOL;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const pool = await getContract(contractAddress, ABIS.PrivateLendingPool, networkId);
        const tx = await pool.supply(handle, proof);
        const receipt = await tx.wait();

        const balance = await decryptSupplied(contractAddress);
        setState(s => ({ ...s, suppliedBalance: balance, loading: false }));
        return receipt.hash;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, decryptSupplied]
  );

  // ── withdrawSupply ─────────────────────────────────────────────────────────
  // Requirement 4.2
  const withdrawSupply = useCallback(
    async (amount: bigint): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = CONTRACTS.PRIVATE_LENDING.PRIVATE_LENDING_POOL;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const pool = await getContract(contractAddress, ABIS.PrivateLendingPool, networkId);
        const tx = await pool.withdraw(handle, proof);
        const receipt = await tx.wait();

        const balance = await decryptSupplied(contractAddress);
        setState(s => ({ ...s, suppliedBalance: balance, loading: false }));
        return receipt.hash;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, decryptSupplied]
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
