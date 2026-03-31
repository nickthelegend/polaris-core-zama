import { useState, useCallback, useEffect } from 'react';
import { ethers, BrowserProvider, JsonRpcProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { CONTRACTS, ABIS, NETWORKS } from '@/lib/contracts';
import { logger } from '@/lib/logger';
import { parseRevertReason } from '@/lib/revert-mapper';
import { computeCreditLine, generateBNPLSchedule } from '@/lib/credit-utils';

export function usePolaris() {
    const { address, isConnected, chainId: wagmiChainId } = useAccount();
    const { data: walletClient } = useWalletClient();

    // Build a chainId string in the same "eip155:XXXX" or plain format the rest of the code expects
    const chainId = wagmiChainId ? String(wagmiChainId) : undefined;

    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const getSpokeConfig = useCallback((networkId: number) => {
        if (networkId === 11155111) return CONTRACTS.SPOKES.SEPOLIA;
        return CONTRACTS.SPOKES.SEPOLIA; // Default to Sepolia
    }, []);

    const getMasterConfig = useCallback(() => {
        return { config: CONTRACTS.MASTER, id: 11155111 };
    }, []);

    const getContract = useCallback(async (contractAddress: string, abi: any, networkId: number, useSigner = true) => {
        const actualAbi = abi.abi || abi;

        if (useSigner) {
            if (!address) throw new Error("Wallet not connected");
            const provider = new BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            return new Contract(contractAddress, actualAbi, signer);
        } else {
            // For read-only, use the configured Sepolia RPC
            const rpc = process.env.NEXT_PUBLIC_NETWORK_URL || "https://ethereum-sepolia-rpc.publicnode.com";
            const provider = new JsonRpcProvider(rpc);
            return new Contract(contractAddress, actualAbi, provider);
        }
    }, [address]);

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

            if (address) {
                const balance = await token.balanceOf(address);
                if (balance < amountWei) {
                    const isTestnet = networkId === NETWORKS.SEPOLIA.id;
                    if (isTestnet) {
                        logger.info('POLARIS_CORE', `Insufficient balance(${formatUnits(balance, decimals)}). Auto-minting...`, { address, networkId });
                        try {
                            const mintAmount = amountWei * BigInt(10);
                            const mintTx = await token.mint(address, mintAmount);
                            await mintTx.wait();
                            logger.info('POLARIS_CORE', "Auto-mint successful.");
                        } catch (mintErr) {
                            logger.error('POLARIS_CORE', "Auto-mint failed", { error: mintErr });
                            throw new Error("Insufficient balance and faucet failed.");
                        }
                    } else {
                        throw new Error(`Insufficient Balance.You have ${formatUnits(balance, decimals)} ${await token.symbol()} `);
                    }
                }
            }

            logger.info('POLARIS_CORE', `Approving token on chain ${networkId}...`, { tokenAddress, vault: config.LIQUIDITY_VAULT });
            const approveTx = await token.approve(config.LIQUIDITY_VAULT, amountWei);
            await approveTx.wait();

            logger.info('POLARIS_CORE', `Depositing into vault on chain ${networkId}...`, { tokenAddress });
            const depositTx = await vault.deposit(tokenAddress, amountWei);
            const receipt = await depositTx.wait();

            setTxHash(receipt.hash);
            return receipt;
        } catch (error) {
            const friendlyError = parseRevertReason(error);
            logger.error('POLARIS_CORE', "Deposit failed", { error, friendlyError, tokenAddress });
            throw new Error(friendlyError);
        } finally {
            setLoading(false);
        }
    }, [getSpokeConfig, getContract, address]);

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
        const module = 'POLARIS_SYNC';
        try {
            logger.info(module, `Starting proof submission for block ${proof.blockHeight} on chain ${proof.chainKey}`);

            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id);

            const continuityBlocks = proof.continuityRoots?.length || 1;
            const calculatedGas = 100000 + (continuityBlocks * 10000) + 100000;
            logger.info(module, `Calculated Gas Limit: ${calculatedGas} for ${continuityBlocks} continuity blocks.`);

            logger.info(module, "Running Pre-Flight staticCall verification...");
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
                logger.info(module, "Pre-Flight Passed.");
            } catch (staticError: any) {
                const reason = staticError.reason || staticError.message || "";
                logger.warn(module, "Pre-Flight Verification Failed", { reason });

                if (reason.includes("already processed") || reason.includes("replay")) {
                    logger.info(module, "Sync already completed previously.");
                    setTxHash("ALREADY_SYNCED");
                    return { hash: "ALREADY_SYNCED", status: 1 };
                }

                if (reason.includes("Continuity proof") || reason.includes("checkpoint") || reason.includes("match attestation")) {
                    logger.warn(module, "Hub Oracle Delay: Continuity roots not yet pushing to state.");
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

            logger.info(module, `Transaction Broadcasted: ${tx.hash}`);
            const receipt = await tx.wait();

            if (!receipt || receipt.status === 0) {
                throw new Error("TRANSACTION_FAILED: The transaction was mined but reverted.");
            }

            logger.info(module, `Sync Successful! Hub Tx: ${receipt.hash}`);
            setTxHash(receipt.hash);
            return receipt;

        } catch (error: any) {
            const friendlyError = parseRevertReason(error);
            logger.error(module, "FinalizeSync Failed", { error, friendlyError });
            if (friendlyError.includes("HUB_NOT_SYNCED") || error.message === "HUB_NOT_SYNCED") {
                throw new Error("The Hub hasn't registered this block's continuity roots yet. Please wait 2-3 minutes for the Oracle and try again.");
            }
            throw new Error(friendlyError);
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
            logger.error('POLARIS_READ', "Fetch liquidity failed", { error, tokenAddress });
            return "0";
        }
    }, [getMasterConfig, getContract]);

    const getTokenBalance = useCallback(async (tokenAddress: string, networkId: number) => {
        try {
            if (!address) return "0";
            const token = await getContract(tokenAddress, ABIS.MockERC20, networkId, false);
            const balance = await token.balanceOf(address);

            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            return formatUnits(balance, decimals);
        } catch (error) {
            logger.error('POLARIS_READ', "Fetch balance failed", { error, tokenAddress });
            return "0";
        }
    }, [address, getContract]);

    const getLPBalance = useCallback(async (tokenAddress: string) => {
        try {
            if (!address) return "0";
            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id, false);
            const balance = await poolManager.getAssetBalance(address, tokenAddress);

            const token = await getContract(tokenAddress, ABIS.MockERC20, id, false);
            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            return formatUnits(balance, decimals);
        } catch (error) {
            logger.error('POLARIS_READ', "Fetch LP balance failed", { error, tokenAddress });
            return "0";
        }
    }, [address, getMasterConfig, getContract]);

    const getUserTotalCollateral = useCallback(async () => {
        try {
            if (!address) return "0";
            const { config, id } = getMasterConfig();
            const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id, false);
            const total = await poolManager.getUserTotalCollateral(address);
            return formatUnits(total, 18);
        } catch (error) {
            logger.error('POLARIS_READ', "Fetch total collateral failed", { error });
            return "0";
        }
    }, [address, getMasterConfig, getContract]);

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
            logger.error('POLARIS_READ', "Fetch total TVL failed", { error });
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
            logger.error('POLARIS_READ', "Fetch physical vault balance failed", { error, tokenAddress });
            return "0";
        }
    }, [getSpokeConfig, getContract]);

    const getScore = useCallback(async () => {
        try {
            if (!address) return "0";
            const { config, id } = getMasterConfig();
            const scoreManager = await getContract(config.SCORE_MANAGER, ABIS.ScoreManager, id, false);
            const score = await scoreManager.getScore(address);
            const scoreNum = Number(score);
            return scoreNum === 0 ? "300" : scoreNum.toString();
        } catch (error) {
            logger.error('POLARIS_READ', "Fetch score failed", { error });
            return "300";
        }
    }, [address, getMasterConfig, getContract]);

    const getCreditLimit = useCallback(async () => {
        try {
            if (!address) return "0";
            const { config, id } = getMasterConfig();

            const scoreManager = await getContract(config.SCORE_MANAGER, ABIS.ScoreManager, id, false);
            const totalLimit = await scoreManager.getCreditLimit(address);

            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id, false);
            const activeDebt = await loanEngine.userActiveDebt(address);

            const available = totalLimit > activeDebt ? totalLimit - activeDebt : BigInt(0);
            const limitVal = parseFloat(formatUnits(available, 18));

            if (limitVal === 0 && activeDebt === BigInt(0)) {
                const equity = await getUserTotalCollateral();
                return (parseFloat(equity) * 0.3).toString();
            }

            return limitVal.toString();
        } catch (error) {
            logger.error('POLARIS_READ', "Fetch credit limit failed", { error });
            return "0";
        }
    }, [address, getMasterConfig, getContract, getUserTotalCollateral]);

    const createLoan = useCallback(async (amount: string, tokenAddress: string) => {
        setLoading(true);
        try {
            const { config, id } = getMasterConfig();
            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id);

            const token = await getContract(tokenAddress, ABIS.MockERC20, id, false);
            let decimals = 18;
            try { decimals = Number(await token.decimals()); } catch (e) { }

            const amountWei = parseUnits(amount, decimals);

            const tx = await loanEngine.createLoan(address, amountWei, tokenAddress, { gasLimit: 5000000 });
            const receipt = await tx.wait();
            setTxHash(receipt.hash);
            return receipt;
        } catch (error) {
            const friendlyError = parseRevertReason(error);
            logger.error('POLARIS_LENDING', "Create loan failed", { error, friendlyError, amount, tokenAddress });
            throw new Error(friendlyError);
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract, address]);

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
            const friendlyError = parseRevertReason(error);
            logger.error('POLARIS_LENDING', "Repay loan failed", { error, friendlyError, loanId, amount });
            throw new Error(friendlyError);
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract]);

    const getLoans = useCallback(async () => {
        try {
            if (!address) return [];
            const { config, id } = getMasterConfig();
            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id, false);
            const count = await loanEngine.loanCount();
            const loans = [];

            for (let i = 0; i < count; i++) {
                const loan = await loanEngine.loans(i);
                if (loan.borrower.toLowerCase() === address.toLowerCase()) {
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
            logger.error('POLARIS_READ', "Fetch loans failed", { error });
            return [];
        }
    }, [address, getMasterConfig, getContract]);

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
            const friendlyError = parseRevertReason(error);
            logger.error('POLARIS_SETTLEMENT', "Withdrawal request failed", { error, friendlyError, tokenAddress, amount });
            throw new Error(friendlyError);
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

            logger.info('POLARIS_PAY', `Paying merchant ${merchantAddress} via Hub...`, { amount, tokenAddress });
            const tx = await router.payWithCredit(merchantAddress, tokenAddress, amountWei, { gasLimit: 1000000 });
            const receipt = await tx.wait();
            setTxHash(receipt.hash);
            return receipt;
        } catch (error) {
            const friendlyError = parseRevertReason(error);
            logger.error('POLARIS_PAY', "Payment failed", { error, friendlyError, merchantAddress, amount });
            throw new Error(friendlyError);
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

            logger.info('POLARIS_CORE', `Minting tokens on chain ${networkId}...`, { tokenAddress, amount });
            const tx = await token.mint(address, amountWei);
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            const friendlyError = parseRevertReason(error);
            logger.error('POLARIS_CORE', "Mint failed", { error, friendlyError, tokenAddress, amount });
            throw new Error(friendlyError);
        } finally {
            setLoading(false);
        }
    }, [getContract, address]);

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
                address,
                attestation.collateral,
                attestation.debt,
                attestation.timestamp,
                attestation.signature
            );
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            logger.error('POLARIS_CORE', "Profile update failed", { error });
            throw error;
        } finally {
            setLoading(false);
        }
    }, [getMasterConfig, getContract, address]);

    const getExternalNetValue = useCallback(async () => {
        try {
            if (!address) return "0";
            const { config, id } = getMasterConfig();
            const oracle = await getContract((config as any).CREDIT_ORACLE, ABIS.CreditOracle, id, false);
            const value = await oracle.getExternalNetValue(address);
            return formatUnits(value, 18);
        } catch (error: any) {
            if (error.code === 'BAD_DATA') return "0";
            logger.error('POLARIS_READ', "Fetch external net value failed", { error });
            return "0";
        }
    }, [address, getMasterConfig, getContract]);

    const getCreditLine = useCallback(async (): Promise<number> => {
        try {
            if (!address) return 0;
            const collateralStr = await getUserTotalCollateral();
            const collateral = parseFloat(collateralStr);

            const { config, id } = getMasterConfig();
            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id, false);
            const activeDebtWei = await loanEngine.userActiveDebt(address);
            const activeDebt = parseFloat(formatUnits(activeDebtWei, 18));

            return computeCreditLine(collateral, activeDebt);
        } catch (error) {
            logger.error('POLARIS_READ', "Fetch credit line failed", { error });
            return 0;
        }
    }, [address, getMasterConfig, getContract, getUserTotalCollateral]);

    const getLoanSchedule = useCallback(async (loanId: number): Promise<number[]> => {
        try {
            const { config, id } = getMasterConfig();
            const loanEngine = await getContract(config.LOAN_ENGINE, ABIS.LoanEngine, id, false);
            const loan = await loanEngine.loans(loanId);
            const startTime = Number(loan.startTime);
            return generateBNPLSchedule(startTime);
        } catch (error) {
            logger.error('POLARIS_READ', "Fetch loan schedule failed", { error, loanId });
            return [];
        }
    }, [getMasterConfig, getContract]);

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
        authenticated: isConnected,
        address,
        chainId,
        getAPY,
        updateCreditProfile,
        getExternalNetValue,
        getCreditLine,
        getLoanSchedule
    };
}
