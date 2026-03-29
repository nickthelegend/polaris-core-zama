import { useState, useCallback, useEffect } from 'react';
import { ethers, BrowserProvider, JsonRpcProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { CONTRACTS, ABIS, NETWORKS } from '@/lib/contracts';

export function usePolaris() {
    const { authenticated } = usePrivy();
    const { wallets } = useWallets();
    const wallet = wallets[0];

    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const getSpokeConfig = useCallback((networkId: number) => {
        if (networkId === NETWORKS.SEPOLIA.id) return CONTRACTS.SPOKES.SEPOLIA;
        if (networkId === NETWORKS.FUJI.id) return CONTRACTS.SPOKES.FUJI;
        if (networkId === NETWORKS.BASE_SEPOLIA.id) return CONTRACTS.SPOKES.BASE_SEPOLIA;
        if (networkId === NETWORKS.CRONOS.id) return CONTRACTS.SPOKES.CRONOS;
        if (networkId === NETWORKS.GANACHE.id) return CONTRACTS.SPOKES.GANACHE;
        return CONTRACTS.SOURCE; // Fallback
    }, []);

    const getMasterConfig = useCallback(() => {
        const chainIdStr = wallet?.chainId?.toString() || '';
        const isLocal = chainIdStr.includes('1337') || chainIdStr === '0x539' || chainIdStr === '539';

        console.log(`[POLARIS_DEBUG] Chain: ${chainIdStr}, isLocal: ${isLocal}`);

        return isLocal
            ? { config: CONTRACTS.SPOKES.GANACHE, id: NETWORKS.GANACHE.id }
            : { config: CONTRACTS.MASTER, id: NETWORKS.USC.id };
    }, [wallet?.chainId]);

    const getContract = useCallback(async (address: string, abi: any, networkId: number, useSigner = true) => {
        const net = Object.values(NETWORKS).find(n => n.id === networkId);
        if (!net) throw new Error(`Network config not found for ID ${networkId}`);

        const actualAbi = abi.abi || abi;

        if (useSigner) {
            if (!wallet) throw new Error("Wallet not connected");

            const chainIdPart = wallet.chainId.includes(':') ? wallet.chainId.split(':')[1] : wallet.chainId;
            const currentChainId = parseInt(chainIdPart);

            if (currentChainId !== networkId) {
                // For local networks (Hardhat/Ganache), try switchChain but fall through
                // if the wallet doesn't support it — the user must switch manually.
                const isLocal = networkId === 31337 || networkId === 1337;
                if (!isLocal) {
                    console.log(`[POLARIS] Switching from ${currentChainId} to ${networkId}...`);
                    await wallet.switchChain(networkId);
                } else {
                    console.warn(`[POLARIS] On chain ${currentChainId}, expected ${networkId}. Switch MetaMask to the local Hardhat network manually.`);
                }
            }

            // Always use the wallet's current provider — if the user is on the right
            // chain this works; if not, the transaction will fail with a clear error.
            const provider = new BrowserProvider(await wallet.getEthereumProvider());
            const signer = await provider.getSigner();
            return new Contract(address, actualAbi, signer);
        } else {
            // For read-only calls always use the configured RPC directly.
            const provider = new JsonRpcProvider(net.rpc);
            return new Contract(address, actualAbi, provider);
        }
    }, [wallet]);

    const depositLiquidity = useCallback(async (tokenAddress: string, amount: string, networkId: number) => {
        setLoading(true);
        try {
            const config = getSpokeConfig(networkId);
            const vault = await getContract(config.LIQUIDITY_VAULT, ABIS.LiquidityVault, networkId);
            const token = await getContract(tokenAddress, ABIS.MockERC20, networkId);

            let decimals = 18;
            try {
                const d = await token.decimals();
                decimals = Number(d);
            } catch (e) {
                console.warn("Could not fetch decimals, defaulting to 18");
            }

            const amountWei = parseUnits(amount, decimals);

            if (wallet?.address) {
                const balance = await token.balanceOf(wallet.address);
                if (balance < amountWei) {
                    const isTestnet = networkId === NETWORKS.SEPOLIA.id ||
                        networkId === NETWORKS.FUJI.id ||
                        networkId === NETWORKS.BASE_SEPOLIA.id ||
                        networkId === NETWORKS.CRONOS.id ||
                        networkId === NETWORKS.GANACHE.id;
                    if (isTestnet) {
                        console.log(`[POLARIS] Insufficient balance(${formatUnits(balance, decimals)}).Auto - minting...`);
                        try {
                            const mintAmount = amountWei * BigInt(10);
                            const mintTx = await token.mint(wallet.address, mintAmount);
                            await mintTx.wait();
                            console.log("[POLARIS] Auto-mint successful.");
                        } catch (mintErr) {
                            console.error("Auto-mint failed", mintErr);
                            throw new Error("Insufficient balance and faucet failed.");
                        }
                    } else {
                        throw new Error(`Insufficient Balance.You have ${formatUnits(balance, decimals)} ${await token.symbol()} `);
                    }
                }
            }

            console.log(`[POLARIS] Approving token on chain ${networkId}...`);
            const approveTx = await token.approve(config.LIQUIDITY_VAULT, amountWei);
            await approveTx.wait();

            console.log(`[POLARIS] Depositing into vault on chain ${networkId}...`);
            const depositTx = await vault.deposit(tokenAddress, amountWei);
            const receipt = await depositTx.wait();

            setTxHash(receipt.hash);
            return receipt;
        } catch (error) {
            console.error("Deposit failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getSpokeConfig, getContract, wallet?.address]);

    const addLiquidityFromProof = useCallback(async (proof: {
        chainKey: any;
        blockHeight: any;
        encodedTransaction: string;
        merkleRoot: string;
        siblings: any[];
        lowerEndpointDigest: string;
        continuityRoots: string[];
    }) => {
        setLoading(true);
        try {
            console.log(`[POLARIS] 🚀 FINALIZING_SYNC: Starting proof submission for block ${proof.blockHeight} on chain ${proof.chainKey} `);

            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id);

            const continuityBlocks = proof.continuityRoots?.length || 1;
            const calculatedGas = 100000 + (continuityBlocks * 10000) + 100000;
            console.log(`[POLARIS] ⏳ Calculated Gas Limit: ${calculatedGas} for ${continuityBlocks} continuity blocks.`);

            console.log("[POLARIS] 🔍 Running Pre-Flight staticCall verification...");
            try {
                await poolManager.addLiquidityFromProof.staticCall(
                    proof.chainKey,
                    proof.blockHeight,
                    proof.encodedTransaction,
                    proof.merkleRoot,
                    proof.siblings,
                    proof.lowerEndpointDigest,
                    proof.continuityRoots
                );
                console.log("[POLARIS] ✅ Pre-Flight Passed.");
            } catch (staticError: any) {
                const reason = staticError.reason || staticError.message || "";
                console.warn("[POLARIS] ⚠️ Pre-Flight Verification Failed:", reason);

                if (reason.includes("already processed") || reason.includes("replay")) {
                    console.info("[POLARIS] Sync already completed previously.");
                    setTxHash("ALREADY_SYNCED");
                    return { hash: "ALREADY_SYNCED", status: 1 };
                }

                if (reason.includes("Continuity proof") || reason.includes("checkpoint") || reason.includes("match attestation")) {
                    console.warn("[POLARIS] ⏳ Hub Oracle Delay: Continuity roots not yet pushing to state.");
                    throw new Error("HUB_NOT_SYNCED");
                }

                if (reason.includes("Native verification failed")) {
                    throw new Error("VERIFICATION_FAILED: The specific cryptographic proof failed to verify against the current Hub state.");
                }

                throw new Error(`CONTRACT_REVERT: ${reason} `);
            }

            console.log("[POLARIS] 💸 Sending proof submission to PoolManager...");
            const tx = await poolManager.addLiquidityFromProof(
                proof.chainKey,
                proof.blockHeight,
                proof.encodedTransaction,
                proof.merkleRoot,
                proof.siblings,
                proof.lowerEndpointDigest,
                proof.continuityRoots,
                { gasLimit: calculatedGas }
            );

            console.log(`[POLARIS] 🛰️ Transaction Broadcasted: ${tx.hash} `);
            const receipt = await tx.wait();

            if (!receipt || receipt.status === 0) {
                throw new Error("TRANSACTION_FAILED: The transaction was mined but reverted.");
            }

            console.log(`[POLARIS] 🏁 Sync Successful! Hub Tx: ${receipt.hash} `);
            setTxHash(receipt.hash);
            return receipt;

        } catch (error: any) {
            console.error("[POLARIS] ❌ FinalizeSync Failed:", error);
            if (error.message === "HUB_NOT_SYNCED") {
                throw new Error("The Hub hasn't registered this block's continuity roots yet. Please wait 2-3 minutes for the Oracle and try again.");
            }
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract]);

    const getPoolLiquidity = useCallback(async (tokenAddress: string) => {
        try {
            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id, false);
            const liquidity = await poolManager.getPoolLiquidity(tokenAddress);

            const token = await getContract(tokenAddress, ABIS.MockERC20, id, false);
            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            return formatUnits(liquidity, decimals);
        } catch (error) {
            console.error("Fetch liquidity failed:", error);
            return "0";
        }
    }, [getMasterConfig, getContract]);

    const getTokenBalance = useCallback(async (tokenAddress: string, networkId: number) => {
        try {
            if (!wallet?.address) return "0";
            const token = await getContract(tokenAddress, ABIS.MockERC20, networkId, false);
            const balance = await token.balanceOf(wallet.address);

            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            return formatUnits(balance, decimals);
        } catch (error) {
            console.error("Fetch balance failed:", error);
            return "0";
        }
    }, [wallet?.address, getContract]);

    const getLPBalance = useCallback(async (tokenAddress: string) => {
        try {
            if (!wallet?.address) return "0";
            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id, false);
            const balance = await poolManager.getAssetBalance(wallet.address, tokenAddress);

            const token = await getContract(tokenAddress, ABIS.MockERC20, id, false);
            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            return formatUnits(balance, decimals);
        } catch (error) {
            console.error("Fetch LP balance failed:", error);
            return "0";
        }
    }, [wallet?.address, getMasterConfig, getContract]);

    const getUserTotalCollateral = useCallback(async () => {
        try {
            if (!wallet?.address) return "0";
            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id, false);
            const total = await poolManager.getUserTotalCollateral(wallet.address);
            return formatUnits(total, 18);
        } catch (error) {
            console.error("Fetch total collateral failed:", error);
            return "0";
        }
    }, [wallet?.address, getMasterConfig, getContract]);

    const getTotalTVL = useCallback(async () => {
        try {
            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id, false);

            let totalUSD = 0;
            let i = 0;

            while (i < 10) {
                try {
                    const tokenAddr = await poolManager.whitelistedTokens(i);
                    if (!tokenAddr || tokenAddr === ethers.ZeroAddress) break;

                    const liquidity = await poolManager.getPoolLiquidity(tokenAddr);

                    const token = await getContract(tokenAddr, ABIS.MockERC20, id, false);
                    let decimals = 18;
                    try { decimals = Number(await token.decimals()); } catch (e) { }

                    const formatted = parseFloat(formatUnits(liquidity, decimals));
                    totalUSD += formatted;
                    i++;
                } catch (e) {
                    break;
                }
            }
            return totalUSD.toString();
        } catch (error) {
            console.error("Fetch total TVL failed:", error);
            return "0";
        }
    }, [getMasterConfig, getContract]);

    const getVaultPhysicalBalance = useCallback(async (tokenAddress: string, networkId: number) => {
        try {
            const config = getSpokeConfig(networkId);
            const token = await getContract(tokenAddress, ABIS.MockERC20, networkId, false);
            const balance = await token.balanceOf(config.LIQUIDITY_VAULT);

            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            return formatUnits(balance, decimals);
        } catch (error) {
            console.error("Fetch physical vault balance failed:", error);
            return "0";
        }
    }, [getSpokeConfig, getContract]);

    const getScore = useCallback(async () => {
        try {
            if (!wallet?.address) return "0";
            const { config, id } = getMasterConfig();
            const scoreManager = await getContract(config.SCORE_MANAGER, ABIS.ScoreManager, id, false);
            const score = await scoreManager.getScore(wallet.address);
            const scoreNum = Number(score);
            return scoreNum === 0 ? "300" : scoreNum.toString();
        } catch (error) {
            console.error("Fetch score failed:", error);
            return "300";
        }
    }, [wallet?.address, getMasterConfig, getContract]);

    const getCreditLimit = useCallback(async () => {
        try {
            if (!wallet?.address) return "0";
            const { config, id } = getMasterConfig();

            const scoreManager = await getContract(config.SCORE_MANAGER, ABIS.ScoreManager, id, false);
            const totalLimit = await scoreManager.getCreditLimit(wallet.address);

            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id, false);
            const activeDebt = await loanEngine.userActiveDebt(wallet.address);

            const available = totalLimit > activeDebt ? totalLimit - activeDebt : BigInt(0);
            const limitVal = parseFloat(formatUnits(available, 18));

            if (limitVal === 0 && activeDebt === BigInt(0)) {
                const equity = await getUserTotalCollateral();
                return (parseFloat(equity) * 0.3).toString();
            }

            return limitVal.toString();
        } catch (error) {
            console.error("Fetch credit limit failed:", error);
            return "0";
        }
    }, [wallet?.address, getMasterConfig, getContract, getUserTotalCollateral]);

    const createLoan = useCallback(async (amount: string, tokenAddress: string) => {
        setLoading(true);
        try {
            const { config, id } = getMasterConfig();
            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id);

            const token = await getContract(tokenAddress, ABIS.MockERC20, id, false);
            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            const amountWei = parseUnits(amount, decimals);

            const tx = await loanEngine.createLoan(wallet?.address, amountWei, tokenAddress, { gasLimit: 5000000 });
            const receipt = await tx.wait();
            setTxHash(receipt.hash);
            return receipt;
        } catch (error) {
            console.error("Create loan failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract, wallet?.address]);

    const repayLoan = useCallback(async (loanId: number, amount: string) => {
        setLoading(true);
        try {
            const { config, id } = getMasterConfig();
            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id);

            const loan = await loanEngine.loans(loanId);
            const tokenAddress = loan.poolToken;

            const token = await getContract(tokenAddress, ABIS.MockERC20, id, false);
            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            const amountWei = parseUnits(amount, decimals);

            const tx = await loanEngine.repay(loanId, amountWei);
            const receipt = await tx.wait();
            setTxHash(receipt.hash);
            return receipt;
        } catch (error) {
            console.error("Repay loan failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract]);

    const getLoans = useCallback(async () => {
        try {
            if (!wallet?.address) return [];
            const { config, id } = getMasterConfig();
            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id, false);
            const count = await loanEngine.loanCount();
            const loans = [];

            for (let i = 0; i < count; i++) {
                const loan = await loanEngine.loans(i);
                if (loan.borrower.toLowerCase() === wallet.address.toLowerCase()) {
                    loans.push({
                        id: i,
                        principal: formatUnits(loan.principal, 18),
                        interest: formatUnits(loan.interestAmount, 18),
                        totalDebt: formatUnits(loan.principal + loan.interestAmount, 18),
                        repaid: formatUnits(loan.repaid, 18),
                        startTime: Number(loan.startTime),
                        status: Number(loan.status),
                        poolToken: loan.poolToken
                    });
                }
            }
            return loans;
        } catch (error) {
            console.error("Fetch loans failed:", error);
            return [];
        }
    }, [wallet?.address, getMasterConfig, getContract]);

    const requestWithdrawal = useCallback(async (tokenAddress: string, amount: string, destChainId: number) => {
        setLoading(true);
        try {
            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id);
            const amountWei = parseUnits(amount, 18);

            const tx = await poolManager.requestWithdrawal(tokenAddress, amountWei, destChainId);
            const receipt = await tx.wait();
            setTxHash(receipt.hash);
            return receipt;
        } catch (error) {
            console.error("Withdrawal request failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract]);

    const payWithCredit = useCallback(async (merchantAddress: string, amount: string, tokenAddress: string) => {
        setLoading(true);
        try {
            const { config, id } = getMasterConfig();
            const router = await getContract((config as any).MERCHANT_ROUTER, ABIS.MerchantRouter, id);

            const token = await getContract(tokenAddress, ABIS.MockERC20, id, false);
            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            const amountWei = parseUnits(amount, decimals);

            console.log(`[POLARIS] Paying merchant ${merchantAddress} via Hub...`);
            const tx = await router.payWithCredit(merchantAddress, tokenAddress, amountWei, { gasLimit: 1000000 });
            const receipt = await tx.wait();
            setTxHash(receipt.hash);
            return receipt;
        } catch (error) {
            console.error("Payment failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract]);

    const mintTokens = useCallback(async (tokenAddress: string, amount: string, networkId: number) => {
        setLoading(true);
        try {
            const token = await getContract(tokenAddress, ABIS.MockERC20, networkId);

            let decimals = 18;
            try {
                const d = await token.decimals();
                decimals = Number(d);
            } catch (e) {
                console.warn("Could not fetch decimals, defaulting to 18");
            }

            const amountWei = parseUnits(amount, decimals);

            console.log(`[POLARIS] Minting tokens on chain ${networkId}...`);
            const tx = await token.mint(wallet?.address, amountWei);
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            console.error("Mint failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getContract, wallet?.address]);

    const getAPY = useCallback(async () => {
        try {
            const { config, id } = getMasterConfig();
            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id, false);
            const rate = await loanEngine.INTEREST_RATE_BPS();
            const fee = await loanEngine.PROTOCOL_FEE_BPS();

            const baseRateNum = Number(rate) / 100; // e.g. 10.00
            const feeFactor = (10000 - Number(fee)) / 10000;
            return (baseRateNum * feeFactor).toFixed(2);
        } catch (e) {
            return "8.00";
        }
    }, [getMasterConfig, getContract]);

    const updateCreditProfile = useCallback(async (attestation: {
        collateral: string;
        debt: string;
        timestamp: number;
        signature: string;
    }) => {
        setLoading(true);
        try {
            const { config, id } = getMasterConfig();
            const oracle = await getContract((config as any).CREDIT_ORACLE, ABIS.CreditOracle, id);

            console.log("[POLARIS] Updating Credit Profile on Hub...");
            const tx = await oracle.updateProfile(
                wallet?.address,
                attestation.collateral,
                attestation.debt,
                attestation.timestamp,
                attestation.signature
            );
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            console.error("Profile update failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract, wallet?.address]);

    const getExternalNetValue = useCallback(async () => {
        try {
            if (!wallet?.address) return "0";
            const { config, id } = getMasterConfig();
            const oracle = await getContract((config as any).CREDIT_ORACLE, ABIS.CreditOracle, id, false);
            const value = await oracle.getExternalNetValue(wallet.address);
            return formatUnits(value, 18);
        } catch (error: any) {
            if (error.code === 'BAD_DATA') return "0";
            console.error("Fetch external net value failed:", error);
            return "0";
        }
    }, [wallet?.address, getMasterConfig, getContract]);

    return {
        loading,
        txHash,
        depositLiquidity,
        addLiquidityFromProof,
        getPoolLiquidity,
        getTokenBalance,
        getLPBalance,
        getUserTotalCollateral,
        getTotalTVL,
        getVaultPhysicalBalance,
        getScore,
        getCreditLimit,
        createLoan,
        payWithCredit,
        repayLoan,
        getLoans,
        requestWithdrawal,
        mintTokens,
        getMasterConfig,
        getContract,
        authenticated,
        address: wallet?.address,
        chainId: wallet?.chainId,
        getAPY,
        updateCreditProfile,
        getExternalNetValue
    };
}
