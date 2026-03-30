import { useState, useCallback } from 'react';
import { usePolaris } from '@/hooks/use-polaris';
import { ABIS, NETWORKS } from '@/lib/contracts';
import { getZamaInstance, encrypt64 } from '@/lib/fhevm';

export function useFhePrivateSwap() {
  const { getContract, address, chainId } = usePolaris();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNetworkId = useCallback((): number => {
    if (!chainId) return NETWORKS.SEPOLIA.id;
    const part = chainId.includes(':') ? chainId.split(':')[1] : chainId;
    return parseInt(part, 10);
  }, [chainId]);

  /**
   * Deposit tokens into the private swap contract.
   */
  const depositEncrypted = useCallback(
    async (swapContractAddress: string, amount: bigint) => {
      setLoading(true);
      setError(null);
      try {
        if (!address) throw new Error('Wallet not connected');

        const { handles, inputProof } = await encrypt64(
          swapContractAddress as `0x${string}`,
          address as `0x${string}`,
          amount
        );

        const networkId = getNetworkId();
        const swapContract = await getContract(swapContractAddress, ABIS.PrivateSwapUSDC, networkId);
        
        // PrivateSwap contracts use einput, which is handles[0]
        const tx = await swapContract.depositEncrypted(handles[0], inputProof);
        const receipt = await tx.wait();
        
        setLoading(false);
        return receipt.hash;
      } catch (err: any) {
        console.error('[Swap] depositEncrypted failed:', err);
        setError(err.message || String(err));
        setLoading(false);
        throw err;
      }
    },
    [address, getContract, getNetworkId]
  );

  /**
   * Swap encrypted tokens.
   */
  const swapEncrypted = useCallback(
    async (swapContractAddress: string, amountIn: bigint, targetToken: string) => {
      setLoading(true);
      setError(null);
      try {
        if (!address) throw new Error('Wallet not connected');

        const { handles, inputProof } = await encrypt64(
          swapContractAddress as `0x${string}`,
          address as `0x${string}`,
          amountIn
        );

        const networkId = getNetworkId();
        const swapContract = await getContract(swapContractAddress, ABIS.PrivateSwapUSDC, networkId);
        
        const tx = await swapContract.swapEncrypted(handles[0], inputProof, targetToken);
        const receipt = await tx.wait();
        
        setLoading(false);
        return receipt.hash;
      } catch (err: any) {
        console.error('[Swap] swapEncrypted failed:', err);
        setError(err.message || String(err));
        setLoading(false);
        throw err;
      }
    },
    [address, getContract, getNetworkId]
  );

  return {
    depositEncrypted,
    swapEncrypted,
    loading,
    error
  };
}
