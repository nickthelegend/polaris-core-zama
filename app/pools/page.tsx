"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

import { ConnectGate } from "@/components/connect-gate"
import {
    Plus,
    RotateCcw,
    Search,
    ArrowDown,
    Zap,
    Database,
    LayoutDashboard,
    Coins,
    ShieldCheck,
    Lock,
    RefreshCw,
    Wallet,
    ChevronDown,
    Info,
    ExternalLink
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { CryptoIcon } from '@ledgerhq/crypto-icons';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useObolus } from "@/hooks/use-obolus"
import { CONTRACTS, NETWORKS, ABIS } from "@/lib/contracts"
import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { BridgeStatus } from "@/components/bridge-status"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

// Helper for chain icons
const getChainIcon = (chain: string) => {
    const icons: Record<string, string> = {
        ethereum: "https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg",
        base: "https://icons.llamao.fi/icons/chains/rsz_base.jpg",
        arbitrum: "https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg",
        polygon: "https://icons.llamao.fi/icons/chains/rsz_polygon.jpg",
    };
    return icons[chain.toLowerCase()] || icons.ethereum;
};

import { useSearchParams } from "next/navigation"

export default function PoolsPage() {
    const searchParams = useSearchParams();
    const syncParam = searchParams.get("sync");

    const {
        address,
        depositLiquidity,
        addLiquidityFromProof,
        requestWithdrawal,
        getPoolLiquidity,
        getTokenBalance,
        getLPBalance,
        getUserTotalCollateral,
        getTotalTVL,
        getAPY,
        getVaultPhysicalBalance,
        loading,
        authenticated,
        chainId,
        getScore,
        getCreditLimit,
        createLoan,
        repayLoan,
        getLoans,
        getMasterConfig,
        getContract,
        mintTokens
    } = useObolus();

    // Liquidity & Balance State (Dynamic)
    const [poolStats, setPoolStats] = useState<Record<string, any>>({});
    const [totalEquity, setTotalEquity] = useState("0");
    const [totalTVL, setTotalTVL] = useState("0");
    const [apy, setApy] = useState("8.00");

    // Token Metadata for Icons
    const TOKEN_METADATA: Record<string, { ledgerId: string, color: string }> = {
        USDC: { ledgerId: "ethereum/erc20/usd_coin__erc20_", color: "blue" },
        USDT: { ledgerId: "ethereum/erc20/usd_tether__erc20_", color: "green" },
        AVAX: { ledgerId: "avalanche", color: "red" },
        WBTC: { ledgerId: "bitcoin", color: "orange" },
        WETH: { ledgerId: "ethereum", color: "purple" },
        LINK: { ledgerId: "chainlink", color: "blue" },
        BNB: { ledgerId: "binance_smart_chain", color: "yellow" }
    };

    // Default to USC View, but allows selecting which SPOKE to view
    const [selectedView, setSelectedView] = useState<keyof typeof NETWORKS>("USC");
    const [refreshing, setRefreshing] = useState(false);

    // Credit & Loan State
    const [userScore, setUserScore] = useState("0");
    const [creditLimit, setCreditLimit] = useState("0");
    const [activeLoans, setActiveLoans] = useState<any[]>([]);

    // Modal State
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [depositTarget, setDepositTarget] = useState<{ token: string, symbol: string, chainKey: keyof typeof NETWORKS } | null>(null);
    const [depositAmount, setDepositAmount] = useState("100");

    const [isLoanOpen, setIsLoanOpen] = useState(false);
    const [loanAmount, setLoanAmount] = useState("50");

    // Bridge State
    const [isSyncOpen, setIsSyncOpen] = useState(false);
    const [syncProofData, setSyncProofData] = useState("");

    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("50");
    const [withdrawTarget, setWithdrawTarget] = useState<{ token: string, symbol: string } | null>(null);
    const [lastDepositTx, setLastDepositTx] = useState<string | null>(null);
    const [triedSync, setTriedSync] = useState<string | null>(null);

    // Deep link sync
    useEffect(() => {
        if (syncParam && authenticated && triedSync !== syncParam) {
            console.log(`[OBOLUS] Deep-link sync triggering for: ${syncParam}`);
            setTriedSync(syncParam);
            autoSyncProof(syncParam, "SEPOLIA");
        }
    }, [syncParam, authenticated, triedSync]);

    // Proof Viewer State
    const [isProofViewerOpen, setIsProofViewerOpen] = useState(false);
    const [generatedProof, setGeneratedProof] = useState<any>(null);

    // When modal closes, we can allow re-trying if needed
    useEffect(() => {
        if (!isProofViewerOpen) {
            setTriedSync(null); // Allow re-triggering the same hash if clicked again
        }
    }, [isProofViewerOpen]);

    const pools = useQuery(api.merchants.listPools) ?? []
    const dbDeposits = useQuery(api.merchants.listDeposits, { userAddress: address }) ?? []

    const usdcPool = pools.find((p: any) => p.name === 'USDC_VAULT')
    const usdtPool = pools.find((p: any) => p.name === 'USDT_VAULT')

    const updatePoolStats = useMutation(api.merchants.updatePoolStats);
    const updateBalance = useMutation(api.merchants.updateBalance);

    // Initial load from Convex for instant rendering
    useEffect(() => {
        if (pools.length > 0) {
            console.log("[OBOLUS] Initializing state from Convex cache...");
            const newStats: Record<string, any> = { ...poolStats };

            pools.forEach((p: any) => {
                const symbol = p.name.replace("_VAULT", "");
                newStats[symbol] = {
                    ...newStats[symbol],
                    physical: p.physicalBalance?.toString() || "0",
                    tvl: p.tvl?.toString() || "0",
                    lpBalance: p.lpBalance?.toString() || "0",
                    apr: p.apr?.toString() || "12.0"
                };
            });

            setPoolStats(newStats);

            // Sync Total TVL from DB
            const tvlSum = pools.reduce((acc: number, p: any) => acc + (Number(p.tvl) || 0), 0);
            setTotalTVL(tvlSum.toString());
        }

        if (dbDeposits.length > 0) {
            // Your Equity from DB Deposits
            const equitySum = dbDeposits.reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0);
            setTotalEquity(equitySum.toString());

            // Update individual LP balances from DB if specific records exist
            if (selectedView === "USC") {
                const newStats = { ...poolStats };
                Object.keys(TOKEN_METADATA).forEach(symbol => {
                    const depTotal = dbDeposits
                        .filter((d: any) => d.asset === symbol)
                        .reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0);

                    if (depTotal > 0) {
                        newStats[symbol] = {
                            ...newStats[symbol],
                            lpBalance: depTotal.toString()
                        };
                    }
                });
                setPoolStats(newStats);
            }
        }
    }, [pools, dbDeposits, selectedView]);

    useEffect(() => {
        if (authenticated) {
            refreshData();
        }
    }, [authenticated, selectedView, address, chainId]);


    const refreshData = async () => {
        setRefreshing(true);
        try {
            // 1. Initial parallel fetch for core metrics
            const [aggregatedEquity, aggregatedTVL, dynamicApy, score, limit, loans] = await Promise.all([
                getUserTotalCollateral(),
                getTotalTVL(),
                getAPY(),
                getScore(),
                getCreditLimit(),
                getLoans()
            ]);

            // 2. Update state for core metrics
            if (parseFloat(aggregatedEquity) > 0) {
                setTotalEquity(aggregatedEquity);
            }
            setTotalTVL(aggregatedTVL);
            setApy(dynamicApy);
            setUserScore(score);
            setActiveLoans(loans);

            // Optimistic limit logic
            if (parseFloat(limit) > 0) {
                setCreditLimit(limit);
            } else if (parseFloat(totalEquity) > 0) {
                setCreditLimit((parseFloat(totalEquity) * 0.5).toString());
            } else {
                setCreditLimit("0");
            }

            // 3. Parallel fetch and cache for all pools and user balances
            const newStats: Record<string, any> = { ...poolStats };
            const spokeChains = ["SEPOLIA", "FUJI", "BASE_SEPOLIA", "CRONOS"];

            await Promise.all(Object.keys(TOKEN_METADATA).map(async (symbol) => {
                let totalRes = 0;
                let totalLP = 0;

                // Inner loop parallelized for all networks
                await Promise.all(spokeChains.map(async (spokeKey) => {
                    const spoke = (CONTRACTS.SPOKES as any)[spokeKey];
                    const tokenAddr = spoke[symbol];
                    if (tokenAddr) {
                        try {
                            const [res, lp] = await Promise.all([
                                getPoolLiquidity(tokenAddr),
                                getLPBalance(tokenAddr)
                            ]);
                            totalRes += parseFloat(res);
                            totalLP += parseFloat(lp);
                        } catch (e) {
                            // Skip if network/RPC fails for this token
                        }
                    }
                }));

                newStats[symbol] = {
                    ...newStats[symbol],
                    tvl: totalRes.toString(),
                    physical: totalRes.toString(),
                    lpBalance: totalLP.toString()
                };

                // ASYNC Update Convex with global pool stats
                updatePoolStats({
                    name: `${symbol}_VAULT`,
                    asset: symbol,
                    tvl: totalRes,
                    apr: 12.0,
                    lpBalance: totalLP,
                    physicalBalance: totalRes,
                    status: "active"
                }).catch(e => console.warn("Failed to update pool stats", e));

                // Fetch current user wallet balance for selected spoke
                const currentNetId = (NETWORKS as any)[selectedView]?.id;
                const currentSpoke = (CONTRACTS.SPOKES as any)[selectedView];
                if (address && selectedView !== "USC" && currentSpoke && currentSpoke[symbol]) {
                    try {
                        const ub = await getTokenBalance(currentSpoke[symbol], currentNetId);
                        newStats[symbol].userBalance = ub;

                        // ASYNC Persist user wallet balance to DB
                        updateBalance({
                            userAddress: address,
                            network: selectedView,
                            symbol: symbol,
                            balance: parseFloat(ub)
                        }).catch(e => console.warn("Failed to update user balance", e));
                    } catch (e) { }
                }
            }));

            setPoolStats(newStats);
            console.log(`[OBOLUS] Refresh Complete. Aggregated TVL: $${aggregatedTVL}`);
        } catch (err) {
            console.error("Refresh failed:", err);
        } finally {
            setRefreshing(false);
        }
    };

    const handleViewChange = (view: keyof typeof NETWORKS) => {
        setSelectedView(view);
        toast.info(`View switched to ${NETWORKS[view].name}`);
    };

    const openDepositModal = (token: string, symbol: string) => {
        if (selectedView === "USC") {
            toast.warn("Switch to a Spoke Chain (e.g. Sepolia) to deposit");
            return;
        }
        setDepositTarget({ token, symbol, chainKey: selectedView });
        setIsDepositOpen(true);
    };

    const executeDeposit = async () => {
        if (!depositTarget) return;
        try {
            toast.info(`Initiating ${depositAmount} ${depositTarget.symbol} deposit on ${NETWORKS[depositTarget.chainKey].name}...`);
            const receipt = await depositLiquidity(depositTarget.token, depositAmount, NETWORKS[depositTarget.chainKey].id);
            toast.success("Deposit successful! Auto-syncing credit limit...");

            setLastDepositTx(receipt.hash);
            setIsDepositOpen(false); // Close Modal immediately

            // 1. Push to Database (Fire & Forget)
            try {
                await fetch("/api/proof", {
                    method: "POST",
                    body: JSON.stringify({
                        txHash: receipt.hash,
                        chainKey: NETWORKS[depositTarget.chainKey].id,
                        userAddress: address,
                        amount: depositAmount,
                        tokenAddress: depositTarget.token,
                        asset: depositTarget.symbol
                    })
                });
                toast.success("Deposit recorded. Syncing in background...");
            } catch (e) {
                console.warn("Failed to push to DB", e);
            }

            // 2. Trigger Auto-Sync (Polling)
            autoSyncProof(receipt.hash, depositTarget.chainKey);

            refreshData();
        } catch (error) {
            console.error("Deposit error:", error);
            toast.error("Deposit failed. Check console.");
        }
    };

    const autoSyncProof = async (txHash: string, sourceChainKey: keyof typeof NETWORKS) => {
        console.log(`[OBOLUS] autoSyncProof started for ${txHash} on ${sourceChainKey}`);
        setSyncProofData(txHash); // Set this so finalizeSync knows which tx to update in DB
        try {
            // Polling Logic
            let attempts = 0;
            const maxAttempts = 150;
            let proof = null;

            toast.info("⏳ Syncing Protocol State... (You can browse freely)");

            while (attempts < maxAttempts) {
                try {
                    const chainKeyId = (NETWORKS as any)[sourceChainKey].id;
                    console.log(`[OBOLUS] Attempt ${attempts + 1} - Polling for: ${txHash}`);

                    const response = await fetch(`/api/proof?txHash=${txHash}&chainKey=${chainKeyId}`);
                    const data = await response.json();

                    // DEBUG: LOG FULL RESPONSE
                    console.log("[OBOLUS] Received Data:", data);

                    const actual = data.data || data;

                    if (actual.merkleRoot || (actual.merkleProof && actual.merkleProof.root)) {
                        console.log("[OBOLUS] ✅ Proof Found!");
                        const { ProofUtils } = await import("@/lib/proof-utils");

                        if (data.data) {
                            proof = {
                                chainKey: data.data.chainKey,
                                blockHeight: data.data.headerNumber,
                                encodedTransaction: data.data.txBytes,
                                merkleRoot: data.data.merkleProof.root,
                                siblings: data.data.merkleProof.siblings.map((s: any) => ({
                                    hash: s.hash,
                                    isLeft: s.isLeft
                                })),
                                lowerEndpointDigest: data.data.continuityProof.lowerEndpointDigest,
                                continuityRoots: data.data.continuityProof.roots || []
                            };
                        } else {
                            proof = ProofUtils.formatProof(actual);
                        }
                        break;
                    } else {
                        console.log("[OBOLUS] ❌ Still waiting. Status:", data.status || "WAITING_PROVER");
                    }
                } catch (e: any) {
                    console.error("[OBOLUS] Polling error:", e.message);
                }

                await new Promise(r => setTimeout(r, 8000));
                attempts++;
            }

            if (!proof) {
                console.error("[OBOLUS] Sync timed out after 20 minutes.");
                throw new Error("Sync timed out. Please try Manual Sync.");
            }

            // 2. Pre-verify with Hub before opening modal
            console.log("[OBOLUS] 🔍 Proof obtained. Verifying Hub readiness...");

            // Re-poll the staticCall if Hub is delayed
            let isHubReady = false;
            while (attempts < maxAttempts && !isHubReady) {
                try {
                    const { config, id } = getMasterConfig();
                    const poolManager = await getContract(config.POOL_MANAGER, ABIS.PoolManager, id);

                    await poolManager.addLiquidityFromProof.staticCall(
                        proof.chainKey,
                        proof.blockHeight,
                        proof.encodedTransaction,
                        proof.merkleRoot,
                        proof.siblings,
                        proof.lowerEndpointDigest,
                        proof.continuityRoots
                    );

                    isHubReady = true;
                    console.log("[OBOLUS] ✅ Hub is Ready!");
                } catch (staticError: any) {
                    const reason = (staticError.reason || staticError.message || "").toLowerCase();
                    if (reason.includes("already processed") || reason.includes("replay")) {
                        toast.success("Transaction already synced on Master Hub.");
                        return;
                    }

                    console.log("[OBOLUS] ⏳ Proof ready, but Hub still syncing roots... waiting 15s");
                    // Use a constant toastId to update the same toast instead of stacking them
                    toast.info("⏳ Proof found! Waiting for Hub to sync continuity roots...", {
                        toastId: "sync-status",
                        autoClose: 10000
                    });
                    await new Promise(r => setTimeout(r, 15000));
                    attempts++;
                }
            }

            // Open Proof Viewer only when actually ready to submit
            console.log("[OBOLUS] Hub ready. Opening Proof Viewer Modal...");
            setGeneratedProof(proof);
            setIsProofViewerOpen(true);
            toast.success("✨ Everything Ready! Click 'FINALIZE' to complete.");

        } catch (error: any) {
            console.error("Auto-sync failed:", error);
            // Don't show redundant "requires manual approval" if it was just a timeout
            if (error.message !== "HUB_NOT_SYNCED") {
                toast.warn("Sync process paused. You can try again from the Monitor.");
            }
            setSyncProofData(txHash);
        }
    };

    const finalizeSync = async () => {
        if (!generatedProof) return;

        // Check if already synced to avoid redundant reverts
        const sourceTx = lastDepositTx || syncProofData;
        const isSynced = dbDeposits.find((d: any) => d.tx_hash === sourceTx && d.status === 'Synced');
        if (isSynced) {
            toast.success("This transaction is already synced on the Master Hub!");
            setIsProofViewerOpen(false);
            return;
        }

        try {
            // Switch to Hub if needed - handle Privy's eip155: prefix
            const currentChainId = chainId?.toString().includes(':')
                ? parseInt(chainId.toString().split(':')[1])
                : parseInt(chainId?.toString() || "0");

            console.log(`[OBOLUS] finalizeSync: currentChainId=${currentChainId}, target=${NETWORKS.USC.id}`);

            if (currentChainId !== NETWORKS.USC.id) {
                toast.info("Switching to Master Hub (USC) to finalize...");
            }

            toast.info("Submitting Proof to Master Chain...");
            const receipt = await addLiquidityFromProof(generatedProof);

            if (sourceTx) {
                try {
                    await fetch("/api/proof", {
                        method: "POST",
                        body: JSON.stringify({
                            txHash: sourceTx,
                            hubTxHash: receipt.hash,
                            status: 'Synced'
                        })
                    });
                } catch (e) { console.warn("DB Update failed", e); }
            }

            toast.success(
                <div className="flex flex-col gap-1">
                    <span className="font-bold">✅ Protocol Synced!</span>
                    <a
                        href={`https://explorer.usc-testnet2.creditcoin.network/tx/${receipt.hash}`}
                        target="_blank"
                        className="text-[10px] text-primary underline flex items-center gap-1 font-mono uppercase"
                    >
                        View Hub Transaction <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                </div>
            );

            setIsProofViewerOpen(false);
            setGeneratedProof(null);
            setSelectedView("USC");
            refreshData();
        } catch (e: any) {
            console.error(e);
            const msg = (e.message || "").toLowerCase();
            const isSyncIssue = msg.includes("continuity") || msg.includes("attestation") || msg.includes("checkpoint") || msg.includes("hub_not_synced");

            if (isSyncIssue) {
                toast.warning(
                    <div className="flex flex-col gap-1">
                        <span className="font-bold">⏳ Hub Still Syncing</span>
                        <span className="text-[10px]">The Master Hub hasn't seen this block yet. Please wait ~5 minutes and try again.</span>
                    </div>,
                    { autoClose: 10000 }
                );
            } else {
                toast.error(e.reason || e.message || "Sync failed on chain.");
            }
        }
    };


    const executeLoan = async () => {
        try {
            toast.info(`Requesting ${loanAmount} USDC Loan...`);
            // Loans are created against the Hub's primary collateral token reference
            await createLoan(loanAmount, CONTRACTS.SPOKES.SEPOLIA.USDC);
            toast.success("Loan Approved & Funded!");
            setIsLoanOpen(false);
            refreshData();
        } catch (error) {
            console.error("Loan failed:", error);
            toast.error("Loan request rejected.");
        }
    };

    const executeRepay = async (id: number, amount: string) => {
        try {
            toast.info(`Repaying Loan #${id}...`);
            await repayLoan(id, amount);
            toast.success("Repayment successful!");
            refreshData();
        } catch (error) {
            console.error("Repay failed:", error);
            toast.error("Repayment failed.");
        }
    };

    const executeSyncProof = async () => {
        try {
            toast.info("Submitting V2 proof to Hub...");
            const proof = JSON.parse(syncProofData);
            await addLiquidityFromProof(proof);
            toast.success("Liquidity Synced with V2 Native Verification!");
            setIsSyncOpen(false);
            setSyncProofData("");
            refreshData();
        } catch (error) {
            console.error("Sync failed:", error);
            toast.error("Sync failed. Ensure proof JSON is valid.");
        }
    };

    const openWithdrawModal = (token: string, symbol: string) => {
        if (selectedView !== "USC") {
            toast.warn("Switch to USC Hub to request withdrawals");
            return;
        }
        setWithdrawTarget({ token, symbol });
        setIsWithdrawOpen(true);
    };

    const executeWithdrawal = async () => {
        if (!withdrawTarget) return;
        try {
            toast.info(`Requesting withdrawal of ${withdrawAmount} ${withdrawTarget.symbol}...`);
            await requestWithdrawal(CONTRACTS.SPOKES.SEPOLIA.USDC, withdrawAmount, NETWORKS.SEPOLIA.id);
            toast.success("Withdrawal Authorized! Check monitor for status.");
            setIsWithdrawOpen(false);
            refreshData();
        } catch (error) {
            console.error("Withdrawal failed:", error);
            toast.error("Withdrawal failed.");
        }
    };

    const executeMint = async () => {
        if (!depositTarget) return;
        try {
            toast.info(`Minting 1000 ${depositTarget.symbol}...`);
            await mintTokens(depositTarget.token, "1000", NETWORKS[depositTarget.chainKey].id);
            toast.success("Tokens minted successfully!");
            refreshData();
        } catch (error) {
            console.error("Mint failed:", error);
            toast.error("Mint failed.");
        }
    };

    return (
        <ConnectGate>
            <div className="flex-1 flex flex-col py-8 gap-6 w-full font-mono text-white">
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">Aggregated_Credit_System // multi_chain_v2</span>
                    <h1 className="text-white text-xl tracking-tighter font-bold uppercase">Cross-Chain Liquidity Terminal</h1>
                </div>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="glass-card rounded-lg border border-white/10 overflow-hidden shadow-2xl col-span-1 lg:col-span-2">
                        <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center text-white">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Global_Status</span>
                            <span className="text-primary text-[10px] animate-pulse flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <span className="hidden sm:inline">CONNECTED:</span> {selectedView}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10 text-white">
                            <div className="p-4 sm:p-6 flex flex-col gap-1">
                                <span className="text-[10px] text-white/40 tracking-wider uppercase">Aggregated_Value_Locked</span>
                                <div className="flex items-baseline gap-2 text-white">
                                    <span className="text-white text-2xl sm:text-3xl font-bold tracking-tighter">
                                        {refreshing ? <Skeleton className="h-8 w-32" /> : `$${Number(totalTVL).toLocaleString()}`}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 flex flex-col gap-1">
                                <span className="text-[10px] text-white/40 tracking-wider uppercase">Your_Equity</span>
                                <div className="flex items-baseline gap-2 text-white">
                                    <span className="text-white text-2xl sm:text-3xl font-bold tracking-tighter">
                                        {refreshing ? <Skeleton className="h-8 w-32" /> : `$${Number(totalEquity).toLocaleString()}`}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 flex flex-col gap-1">
                                <span className="text-[10px] text-white/40 tracking-wider uppercase">Active_Debt</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-red-400 text-2xl sm:text-3xl font-bold tracking-tighter">{activeLoans.filter(l => l.status === 0).length}</span>
                                    <span className="text-white/40 text-[10px] uppercase">LOANS</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-lg border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                        <div className="bg-white/5 px-4 py-2 border-b border-white/10 text-white">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Global_Risk_Score</span>
                        </div>
                        <div className="p-6 flex flex-col gap-4 flex-1 justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <ShieldCheck className="w-24 h-24 text-primary" />
                            </div>
                            <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-start gap-1 z-10">
                                <span className="text-[10px] text-white/40 tracking-wider uppercase">Obolus_FICO</span>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl sm:text-4xl font-black tracking-tighter ${Number(userScore) > 700 ? 'text-primary' : Number(userScore) > 500 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {userScore}
                                    </span>
                                    <span className="text-white/40 text-[10px] font-bold">/ 850</span>
                                </div>
                            </div>
                            <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-start gap-1 z-10">
                                <span className="text-[10px] text-white/40 tracking-wider uppercase">Credit_Limit</span>
                                <span className="text-white text-lg sm:text-xl font-bold tracking-tight">
                                    {loading ? <Skeleton className="h-6 w-32" /> : `$${Number(creditLimit).toLocaleString()} USDC`}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsLoanOpen(true)}
                                className="mt-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 py-2.5 rounded-sm font-bold text-[10px] uppercase tracking-widest transition-all"
                            >
                                Get_Credit_Line
                            </button>

                            {/* Sync Warning */}
                            {Object.values(poolStats).some(s => parseFloat(s.lpBalance) > 0) && Number(creditLimit) === 0 && (
                                <div className="mt-2 bg-red-500/10 border border-red-500/20 p-2 rounded-sm flex items-center gap-2 animate-pulse cursor-pointer" onClick={() => setIsSyncOpen(true)}>
                                    <RefreshCw className="w-3 h-3 text-red-400" />
                                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">
                                        SYNC_REQUIRED
                                    </span>
                                </div>
                            )}
                        </div>
                        <BridgeStatus address={address} />
                    </div>
                </section>

                <div className="flex flex-col gap-6">
                    <section className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <LayoutDashboard className="w-4 h-4 text-primary" />
                                <h2 className="text-white text-xs font-bold uppercase tracking-widest">Fleet_Operations</h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-sm hover:bg-white/10 transition-all cursor-pointer min-w-[140px] sm:min-w-[180px]">
                                            <span className={`w-1.5 h-1.5 rounded-full ${selectedView === 'USC' ? 'bg-primary' : 'bg-blue-400'}`} />
                                            <span className="text-[9px] sm:text-[10px] text-white font-bold tracking-widest uppercase flex-1 text-left">
                                                {NETWORKS[selectedView].name}
                                            </span>
                                            <ChevronDown className="w-3 h-3 text-white/40" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 min-w-[200px]">
                                        {Object.entries(NETWORKS).map(([key, net]) => (
                                            <DropdownMenuItem
                                                key={key}
                                                onClick={() => handleViewChange(key as keyof typeof NETWORKS)}
                                                className="text-[10px] uppercase font-bold tracking-tighter cursor-pointer focus:bg-primary/20 flex items-center gap-2 py-3"
                                            >
                                                <div className={`size-1.5 rounded-full ${key === 'USC' ? 'bg-primary' : 'bg-blue-400'}`} />
                                                {net.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsSyncOpen(true)}
                                        className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-2 rounded-sm hover:bg-primary/20 transition-all text-[9px] sm:text-[10px] text-primary uppercase tracking-widest"
                                    >
                                        <Zap className="hidden sm:block w-3 h-3" />
                                        SYNC
                                    </button>

                                    <button
                                        onClick={refreshData}
                                        className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-sm hover:bg-white/10 transition-all text-[9px] sm:text-[10px] text-white/70 uppercase tracking-widest"
                                    >
                                        <RefreshCw className={`w-3 h-3 text-primary ${loading ? "animate-spin" : ""}`} />
                                        REFRESH
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card rounded-lg border border-white/10 overflow-hidden flex flex-col flex-1">
                            <div className="hidden md:grid grid-cols-12 bg-white/5 border-b border-white/10 px-6 py-4">
                                <div className="col-span-3">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Asset_Type</span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Global_Reserves</span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Your_Aggregate</span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">APR</span>
                                </div>
                                <div className="col-span-3 text-right">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Control</span>
                                </div>
                            </div>

                            <div className="overflow-y-auto divide-y divide-white/5">
                                {Object.keys(TOKEN_METADATA).map((symbol) => {
                                    const meta = TOKEN_METADATA[symbol];
                                    const stats = poolStats[symbol] || { tvl: "0", lpBalance: "0", apr: "12.0", userBalance: "0" };

                                    // Identify current chain view
                                    const poolName = selectedView === "USC" ? `${symbol}_HUB` : `${symbol}_${selectedView.toUpperCase()}`;
                                    const poolId = `${symbol}_${selectedView}`;

                                    return (
                                        <div key={poolId} className="flex flex-col md:grid md:grid-cols-12 px-4 sm:px-6 py-5 hover:bg-white/[0.04] transition-all items-start md:items-center gap-4 md:gap-0">
                                            <div className="w-full md:col-span-3 flex items-center gap-4">
                                                <div className={`size-10 bg-${meta.color}-500/10 rounded-sm flex items-center justify-center border border-${meta.color}-500/20 shrink-0`}>
                                                    <CryptoIcon ledgerId={meta.ledgerId} ticker={symbol} network="ethereum" size="20px" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white text-sm font-bold uppercase">{poolName}</span>
                                                        <img src={getChainIcon(NETWORKS[selectedView as keyof typeof NETWORKS].icon)} className="size-3 opacity-50" alt="chain" />
                                                    </div>
                                                    <span className="text-[10px] text-white/30 uppercase">{NETWORKS[selectedView as keyof typeof NETWORKS].name}</span>
                                                </div>
                                            </div>

                                            {/* Mobile Stats Row */}
                                            <div className="grid grid-cols-3 w-full md:contents">
                                                <div className="flex flex-col md:block md:col-span-2 md:text-right">
                                                    <span className="md:hidden text-[8px] text-white/20 uppercase font-bold mb-1">Reserves</span>
                                                    <span className="text-primary/80 text-sm tracking-tighter font-bold font-mono">
                                                        {refreshing ? <Skeleton className="h-4 w-16" /> : `$${Number(stats.tvl).toLocaleString()}`}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col md:block md:col-span-2 md:text-right">
                                                    <span className="md:hidden text-[8px] text-white/20 uppercase font-bold mb-1">Equity</span>
                                                    <span className="text-white text-sm tracking-tighter font-medium font-mono">
                                                        {refreshing ? <Skeleton className="h-4 w-16" /> : `$${Number(stats.lpBalance).toLocaleString()}`}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col md:block md:col-span-2 md:text-right">
                                                    <span className="md:hidden text-[8px] text-white/20 uppercase font-bold mb-1">APR</span>
                                                    <span className="text-primary text-sm tracking-tighter font-bold">{stats.apr}%</span>
                                                </div>
                                            </div>

                                            <div className="w-full md:col-span-3 flex justify-end gap-3 mt-2 md:mt-0">
                                                <button
                                                    onClick={() => openDepositModal(selectedView === 'USC' ? (CONTRACTS.SPOKES.SEPOLIA as any)[symbol] : (CONTRACTS.SPOKES as Record<string, any>)[selectedView][symbol], symbol)}
                                                    className="flex-1 md:flex-none bg-primary/90 hover:bg-primary text-primary-foreground px-4 py-2 md:py-1.5 rounded-sm font-black text-[10px] uppercase cursor-pointer transition-all active:scale-95"
                                                >
                                                    Deposit
                                                </button>
                                                <button
                                                    onClick={() => openWithdrawModal(selectedView === 'USC' ? (CONTRACTS.SPOKES.SEPOLIA as any)[symbol] : (CONTRACTS.SPOKES as Record<string, any>)[selectedView][symbol], symbol)}
                                                    className="flex-1 md:flex-none border border-white/10 text-white/60 hover:text-white hover:bg-white/5 px-4 py-2 md:py-1.5 rounded-sm font-bold text-[10px] uppercase transition-all active:scale-95"
                                                >
                                                    Withdraw
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-primary" />
                            <h2 className="text-white text-xs font-bold uppercase tracking-widest">Credit_Registry</h2>
                        </div>
                        <div className="glass-card rounded-lg border border-white/10 overflow-hidden flex flex-col divide-y divide-white/5">
                            {activeLoans.length === 0 ? (
                                <div className="p-8 text-center text-white/20 text-[10px] uppercase">No Active Agreements</div>
                            ) : (
                                activeLoans.map((loan) => (
                                    <div key={loan.id} className="p-4 grid grid-cols-4 items-center gap-4">
                                        <span className="text-xs font-bold text-white uppercase">ID: #{loan.id}</span>
                                        <div className="flex flex-col text-right">
                                            <span className="text-xs text-white uppercase">{loan.totalDebt} USDC</span>
                                            <span className="text-[8px] text-white/40 uppercase">Principal: {loan.principal} + Int: {loan.interest}</span>
                                        </div>
                                        <span className={`text-[9px] uppercase font-bold text-center ${loan.status === 0 ? 'text-primary' : 'text-white/40'}`}>
                                            {loan.status === 0 ? "LIVE" : "CLOSED"}
                                        </span>
                                        <div className="flex justify-end">
                                            {loan.status === 0 && (
                                                <button
                                                    onClick={() => executeRepay(loan.id, (parseFloat(loan.totalDebt) - parseFloat(loan.repaid)).toFixed(6))}
                                                    className="bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold px-3 py-1.5 rounded-sm uppercase tracking-widest transition-all"
                                                >
                                                    Repay_Full
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Modals Updated for Multi-Chain Context */}
            <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
                <DialogContent className="bg-zinc-950 border border-white/10 text-white font-mono rounded-lg shadow-2xl p-0 gap-0">
                    <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center text-white">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">SPOKE_DEPOSIT // {depositTarget?.chainKey}</span>
                    </div>
                    <div className="p-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <DialogTitle className="text-xl font-bold uppercase tracking-tighter">Deposit {depositTarget?.symbol}</DialogTitle>
                            <DialogDescription className="text-[10px] text-white/40 uppercase">
                                Funding the {depositTarget?.symbol} vault on {NETWORKS[depositTarget?.chainKey as keyof typeof NETWORKS]?.name}.
                            </DialogDescription>
                        </div>
                        <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm py-4 px-6 text-2xl font-black text-white focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="0.00"
                        />
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={executeDeposit}
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground py-4 rounded-sm font-black text-xs uppercase cursor-pointer"
                            >
                                {loading ? "INITIALIZING..." : "CONFIRM DEPOSIT"}
                            </button>

                            <div className="flex justify-center">
                                <span className="text-[10px] text-white/40 uppercase cursor-pointer hover:text-white transition-colors border-b border-transparent hover:border-white/40" onClick={executeMint}>
                                    [ TESTNET FAUCET: MINT 1000 TOKENS ]
                                </span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isLoanOpen} onOpenChange={setIsLoanOpen}>
                <DialogContent className="bg-zinc-950 border border-white/10 text-white font-mono rounded-lg shadow-2xl p-0 gap-0">
                    <div className="bg-white/5 px-4 py-2 border-b border-white/10">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">HUB_CREDIT_REQUEST</span>
                    </div>
                    <div className="p-8 flex flex-col gap-6">
                        <DialogTitle className="text-xl font-bold uppercase tracking-tighter">Enter Loan Amount</DialogTitle>
                        <input
                            type="number"
                            value={loanAmount}
                            onChange={(e) => setLoanAmount(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-sm py-4 px-6 text-2xl font-black text-white focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                            onClick={executeLoan}
                            className="w-full bg-primary py-4 rounded-sm font-black text-xs uppercase"
                        >
                            REQUEST CREDIT
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sync proof and withdraw modals remain largely the same, just UI polish */}
            <Dialog open={isSyncOpen} onOpenChange={setIsSyncOpen}>
                <DialogContent className="bg-zinc-950 border border-white/10 text-white font-mono rounded-lg shadow-2xl p-0 gap-0">
                    <div className="bg-white/5 px-4 py-2 border-b border-white/10">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">MANUAL_ORACLE_SYNC</span>
                    </div>
                    <div className="p-8 flex flex-col gap-6">
                        <DialogTitle className="text-xl font-bold uppercase tracking-tighter">Sync Transaction</DialogTitle>
                        <DialogDescription className="text-[10px] text-white/40 uppercase">
                            Enter the Source Chain Transaction Hash to generate a proof and sync liquidity.
                        </DialogDescription>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase text-white/60">Source Tx Hash</label>
                            <input
                                value={syncProofData}
                                onChange={(e) => setSyncProofData(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm py-3 px-4 text-xs font-mono text-white focus:outline-none"
                                placeholder="0x..."
                            />
                        </div>

                        <button
                            onClick={async () => {
                                if (!syncProofData.startsWith("0x")) {
                                    toast.error("Invalid Hash");
                                    return;
                                }
                                try {
                                    toast.info("Generating Proof... (This may take a minute)");
                                    // Dynamically import to avoid server-side issues if any
                                    const { ProofUtils } = await import("@/lib/proof-utils");
                                    // Use Chain Key 1 (Sepolia) by default or detect from context?
                                    // Ideally we let user select, but for now assuming Sepolia (1)
                                    // If user is on Localnet, we use 1337
                                    const chainKey = selectedView === "USC" ? 1 : (NETWORKS[selectedView]?.id === 1337 ? 1337 : 1);

                                    const proof = await ProofUtils.fetchProof(syncProofData, chainKey);

                                    // Open Proof Viewer instead of auto-submit
                                    setLastDepositTx(syncProofData); // For display in viewer
                                    setGeneratedProof(proof);
                                    setIsProofViewerOpen(true);
                                    setIsSyncOpen(false); // Close input modal

                                    /* 
                                    toast.info("Proof Generated! Submitting to Hub...");
                                    await addLiquidityFromProof(proof);

                                    toast.success("Liquidity Synced Successfully!");
                                    setIsSyncOpen(false);
                                    setSyncProofData("");
                                    refreshData(); 
                                    */
                                } catch (e: any) {
                                    console.error(e);
                                    toast.error(e.message || "Sync Failed");
                                }
                            }}
                            className="w-full bg-white hover:bg-white/90 text-black py-4 font-black uppercase tracking-widest text-xs rounded-sm transition-all"
                        >
                            VERIFY_AND_SYNC
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogContent className="bg-zinc-950 border border-white/10 text-white font-mono rounded-lg shadow-2xl p-0 gap-0">
                    <div className="p-8 flex flex-col gap-6">
                        <DialogTitle className="text-xl font-bold uppercase tracking-tighter">Withdraw Liquidity</DialogTitle>
                        <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 py-4 px-6 text-2xl font-black text-white"
                        />
                        <button onClick={executeWithdrawal} className="w-full bg-red-500 py-4 font-black">REQUEST WITHDRAWAL</button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Proof Viewer Modal */}
            <Dialog open={isProofViewerOpen} onOpenChange={setIsProofViewerOpen}>
                <DialogContent className="bg-zinc-950 border border-white/10 text-white font-mono rounded-lg shadow-2xl p-0 gap-0 max-w-2xl">
                    <DialogTitle className="sr-only">Proof Explorer</DialogTitle>
                    <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">NATIVE_VERIFICATION_LAYER // PROOF_EXPLORER</span>
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-green-500 font-bold uppercase">VERIFIED</span>
                        </div>
                    </div>
                    <div className="p-0 flex flex-col">
                        <div className="p-6 bg-black/50 overflow-x-auto max-h-[400px] text-[10px] text-white/70 font-mono">
                            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(generatedProof, (key, value) => {
                                if (key === 'siblings') return `[Array(${value.length})]`; // Truncate siblings for cleaner view
                                return value;
                            }, 2)}</pre>
                        </div>

                        <div className="p-6 border-t border-white/10 flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-white text-lg font-bold uppercase tracking-tighter">Oracle Verification Complete</span>
                                <span className="text-[10px] text-white/40 uppercase">
                                    The integrity of your deposit has been cryptographically verified by the Creditcoin V2 Oracle.
                                </span>
                                <span className="text-[10px] text-yellow-400 mt-2 uppercase font-bold animate-pulse">
                                    ⚠ Action Required: Submit this proof to the Network below.
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white/5 rounded-sm border border-white/10">
                                    <span className="block text-[8px] text-white/40 uppercase tracking-widest mb-1">Merkle Root</span>
                                    <span className="block text-[10px] text-primary truncate">{generatedProof?.merkleRoot}</span>
                                </div>
                                <div className="p-3 bg-white/5 rounded-sm border border-white/10">
                                    <span className="block text-[8px] text-white/40 uppercase tracking-widest mb-1">Tx Hash</span>
                                    <span className="block text-[10px] text-white/60 truncate">{lastDepositTx}</span>
                                </div>
                            </div>

                            <button
                                onClick={finalizeSync}
                                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground py-4 rounded-sm font-black text-xs uppercase cursor-pointer"
                            >
                                FINALIZE SYNC ON MASTER HUB
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </ConnectGate>
    )
}
