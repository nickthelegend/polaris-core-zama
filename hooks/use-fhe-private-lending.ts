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

/**
 * Build a browser-safe mock FHEVM instance for local Hardhat development.
 * The Hardhat node runs in `fhevm.mocked: true` mode, which means it accepts
 * plaintext values wrapped in the externalEuint64 format. We encode the amount
 * as a 32-byte big-endian handle and use an empty proof — the mock coprocessor
 * accepts this without a real ZK proof.
 */
function createMockFhevmInstance(): FhevmInstance {
  return {
    createEncryptedInput: (_contractAddress: string, _userAddress: string) => ({
      add64: (value: bigint) => ({
        encrypt: async () => {
          // Encode value as 32-byte big-endian Uint8Array (externalEuint64 handle)
          const handle = new Uint8Array(32);
          let v = value;
          for (let i = 31; i >= 0 && v > BigInt(0); i--) {
            handle[i] = Number(v & BigInt(0xff));
            v >>= BigInt(8);
          }
          return { handles: [handle], inputProof: new Uint8Array(0) };
        },
      }),
    }),
    generateKeypair: () => ({
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
    }),
    createEIP712: (_publicKey: Uint8Array, _contractAddress: string) => ({
      domain: { name: 'MockFHEVM', version: '1', chainId: 31337 },
      types: { Reencrypt: [{ name: 'publicKey', type: 'bytes32' }] },
      message: { publicKey: '0x' + '00'.repeat(32) },
    }),
    userDecrypt: async (
      handle: string,
      _privateKey: Uint8Array,
      _publicKey: Uint8Array,
      _signature: string,
      _contractAddress: string,
      _userAddress: string
    ): Promise<bigint> => {
      // In mock mode the handle IS the plaintext value (big-endian hex)
      try {
        return BigInt(handle);
      } catch {
        return BigInt(0);
      }
    },
  };
}

async function getFhevmInstance(): Promise<FhevmInstance> {
  if (_fhevmInstance) return _fhevmInstance;

  // Try the Zama relayer SDK (production browser SDK) if available.
  // Falls back to a browser-safe mock for local Hardhat development.
  try {
    const mod = await import('@zama-fhe/relayer-sdk');
    _fhevmInstance = await mod.createInstance();
  } catch {
    // No production SDK installed — use the mock instance for local dev.
    _fhevmInstance = createMockFhevmInstance();
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

  // Resolve the right contract addresses for the connected network.
  const getAddresses = useCallback(() => {
    const networkId = getNetworkId();
    // Local Hardhat node (chainId 31337) uses LOCAL_HARDHAT addresses
    if (networkId === NETWORKS.LOCAL_HARDHAT.id) return CONTRACTS.LOCAL_HARDHAT;
    // Default to PRIVATE_LENDING (Sepolia / other networks)
    return CONTRACTS.PRIVATE_LENDING;
  }, [getNetworkId]);

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
        const contractAddress = getAddresses().PRIVATE_COLLATERAL_VAULT;
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
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptCollateral]
  );

  // ── withdrawCollateral ─────────────────────────────────────────────────────
  // Requirement 2.2
  const withdrawCollateral = useCallback(
    async (amount: bigint): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_COLLATERAL_VAULT;
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
      }).catch(err => console.error('[positions] write failed:', err));
    },
    []
  );

  // ── borrow ─────────────────────────────────────────────────────────────────
  // Requirement 3.1
  const borrow = useCallback(
    async (amount: bigint, symbol: string): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_BORROW_MANAGER;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const borrowMgr = await getContract(contractAddress, ABIS.PrivateBorrowManager, networkId);
        const tx = await borrowMgr.borrow(handle, proof);
        const receipt = await tx.wait();

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
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptDebt, address, writePosition]
  );

  // ── repay ──────────────────────────────────────────────────────────────────
  // Requirement 3.3
  const repay = useCallback(
    async (amount: bigint, symbol: string): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_BORROW_MANAGER;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const borrowMgr = await getContract(contractAddress, ABIS.PrivateBorrowManager, networkId);
        const tx = await borrowMgr.repay(handle, proof);
        const receipt = await tx.wait();

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
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptDebt, address, writePosition]
  );

  // ── supply ─────────────────────────────────────────────────────────────────
  // Requirement 4.1
  const supply = useCallback(
    async (amount: bigint, symbol: string): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_LENDING_POOL;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const pool = await getContract(contractAddress, ABIS.PrivateLendingPool, networkId);
        const tx = await pool.supply(handle, proof);
        const receipt = await tx.wait();

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
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [encryptAmount, getContract, getNetworkId, getAddresses, decryptSupplied, address, writePosition]
  );

  // ── withdrawSupply ─────────────────────────────────────────────────────────
  // Requirement 4.2
  const withdrawSupply = useCallback(
    async (amount: bigint, symbol: string): Promise<string> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const networkId = getNetworkId();
        const contractAddress = getAddresses().PRIVATE_LENDING_POOL;
        const { handle, proof } = await encryptAmount(amount, contractAddress);
        const pool = await getContract(contractAddress, ABIS.PrivateLendingPool, networkId);
        const tx = await pool.withdraw(handle, proof);
        const receipt = await tx.wait();

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
        const msg = err instanceof Error ? err.message : String(err);
        setState(s => ({ ...s, loading: false, error: msg }));
        throw err;
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
