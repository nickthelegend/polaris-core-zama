"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CONTRACTS, NETWORKS } from "@/lib/contracts"
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Zap, Database, Wallet, ExternalLink, ChevronRight, Coins, ShieldCheck } from "lucide-react"
import { useObolus } from "@/hooks/use-obolus"
import { ConnectGate } from "@/components/connect-gate"
import { CryptoIcon } from '@ledgerhq/crypto-icons'
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "react-toastify"
import { useObolusWallet } from "@/lib/hooks/useObolusWallet"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function FaucetPage() {
    const { connected: authenticated, address } = useObolusWallet()
    const { getTokenBalance } = useObolus()
    const [network, setNetwork] = useState<string>("SEPOLIA")
    const [token, setToken] = useState<string>("USDC")
    const [amount, setAmount] = useState<string>("1000")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [txHash, setTxHash] = useState<string>("")
    const [errorMsg, setErrorMsg] = useState<string>("")

    // Balances
    const [balances, setBalances] = useState<Record<string, string>>({})
    const [loadingBalances, setLoadingBalances] = useState(false)

    const TOKEN_METADATA: Record<string, { ledgerId: string, color: string, name: string }> = {
        USDC: { ledgerId: "ethereum/erc20/usd_coin__erc20_", color: "blue", name: "USD Coin" },
        USDT: { ledgerId: "ethereum/erc20/usd_tether__erc20_", color: "green", name: "Tether USD" },
        AVAX: { ledgerId: "avalanche", color: "red", name: "Avalanche" },
        WBTC: { ledgerId: "bitcoin", color: "orange", name: "Wrapped Bitcoin" },
        WETH: { ledgerId: "ethereum", color: "purple", name: "Wrapped Ethereum" },
        LINK: { ledgerId: "chainlink", color: "blue", name: "Chainlink" },
        BNB: { ledgerId: "binance_smart_chain", color: "yellow", name: "Binance Coin" }
    };

    const walletAddress = address

    // Convex Data
    const dbBalances = useQuery(api.merchants.getUserBalances,
        address ? { userAddress: address, network } : "skip"
    );
    const updateDbBalance = useMutation(api.merchants.updateBalance);

    // Sync local state with DB balances if they exist
    useEffect(() => {
        if (dbBalances) {
            const balancesObj: Record<string, string> = {};
            dbBalances.forEach(b => {
                balancesObj[b.symbol] = b.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            });
            setBalances(prev => ({ ...prev, ...balancesObj }));
        }
    }, [dbBalances]);

    const fetchBalances = async () => {
        if (!address || !authenticated) return;
        setLoadingBalances(true);
        try {
            const netId = (NETWORKS as any)[network]?.id;
            const spokeConfig = (CONTRACTS.SPOKES as any)[network];

            if (netId && spokeConfig) {
                // Fetch each balance in parallel for speed improvements
                await Promise.all(Object.keys(TOKEN_METADATA).map(async (symbol) => {
                    if (spokeConfig[symbol]) {
                        try {
                            const b = await getTokenBalance(spokeConfig[symbol], netId);
                            const balanceNum = parseFloat(b);

                            // 1. Update DB (Convex will then update dbBalances query)
                            await updateDbBalance({
                                userAddress: address,
                                network: network,
                                symbol: symbol,
                                balance: balanceNum
                            });

                            // 2. Local state fallback (optional since useQuery handles it)
                            setBalances(prev => ({
                                ...prev,
                                [symbol]: balanceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            }));
                        } catch (e) {
                            console.warn(`Failed to fetch ${symbol} balance`, e);
                        }
                    }
                }));
            }
        } catch (e) {
            console.error("Failed to fetch balances:", e);
        } finally {
            setLoadingBalances(false);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, [network, authenticated, address]);

    const handleMint = async () => {
        if (!address) return
        setStatus("loading")
        setErrorMsg("")
        setTxHash("")

        toast.info(`Requesting ${amount} ${token} on ${network}...`, { toastId: 'minting' });

        try {
            const response = await fetch("/api/faucet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    address: address,
                    token: token,
                    network: network,
                    amount: amount
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to mint from backend");
            }

            setTxHash(data.txHash);
            setStatus("success");
            toast.success(`${amount} ${token} minted successfully!`, { toastId: 'minting' });

            // Refresh balances after a short delay
            setTimeout(fetchBalances, 3000);
        } catch (e: any) {
            console.error(e)
            setStatus("error")
            setErrorMsg(e.message || "Failed to mint")
            toast.error(e.message || "Minting failed", { toastId: 'minting' });
        }
    }

    return (
        <ConnectGate>
            <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">
                        Aggregated_Faucet_System // dev_bridge_v2
                    </span>
                    <h1 className="text-white text-2xl tracking-tighter font-bold uppercase">
                        Testnet Resources Terminal
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Minting Panel */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <div className="glass-card rounded-lg border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                            <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex justify-between items-center">
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">Minting_Terminal</span>
                                <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                    READY_TO_MINT
                                </div>
                            </div>

                            <div className="p-8 flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-2">
                                            <Zap className="w-3 h-3 text-primary" /> Target_Network
                                        </label>
                                        <Select value={network} onValueChange={setNetwork}>
                                            <SelectTrigger className="bg-white/5 border-white/10 h-12 uppercase text-xs tracking-widest font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-950 border-white/10">
                                                <SelectItem value="SEPOLIA" className="text-xs uppercase font-bold text-white">Ethereum Sepolia</SelectItem>
                                                <SelectItem value="FUJI" className="text-xs uppercase font-bold text-white">Avalanche Fuji</SelectItem>
                                                <SelectItem value="BASE_SEPOLIA" className="text-xs uppercase font-bold text-white">Base Sepolia</SelectItem>
                                                <SelectItem value="CRONOS" className="text-xs uppercase font-bold text-white">Cronos Testnet</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest flex items-center gap-2">
                                            <Coins className="w-3 h-3 text-primary" /> Asset_Symbol
                                        </label>
                                        <Select value={token} onValueChange={setToken}>
                                            <SelectTrigger className="bg-white/5 border-white/10 h-12 uppercase text-xs tracking-widest font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-950 border-white/10">
                                                {Object.keys(TOKEN_METADATA).map(t => (
                                                    <SelectItem key={t} value={t} className="text-xs uppercase font-bold text-white">
                                                        <div className="flex items-center gap-2">
                                                            <div className="size-4 shrink-0">
                                                                <CryptoIcon ledgerId={TOKEN_METADATA[t].ledgerId} ticker={t} network="ethereum" size="16px" />
                                                            </div>
                                                            {t} • {TOKEN_METADATA[t].name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Amount_to_Request</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["100", "1000", "10000"].map((amt) => (
                                            <button
                                                key={amt}
                                                onClick={() => setAmount(amt)}
                                                className={`py-3 rounded-sm border transition-all text-xs font-bold font-mono tracking-widest ${amount === amt
                                                    ? 'bg-primary/20 border-primary text-primary'
                                                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'
                                                    }`}
                                            >
                                                {parseInt(amt).toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <Button
                                        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                        onClick={handleMint}
                                        disabled={!authenticated || status === "loading"}
                                    >
                                        {status === "loading" ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                COMMITTING_TRANSACTION...
                                            </div>
                                        ) : (
                                            "EXECUTE_MINT_REQUEST"
                                        )}
                                    </Button>
                                </div>

                                {/* Status Feedback */}
                                {status === "success" && txHash && (
                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-sm flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Mint_Successful
                                            </div>
                                            <a
                                                href={getExplorerLink(network, txHash)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-green-400 underline uppercase font-bold flex items-center gap-1 hover:text-green-300 transition-colors"
                                            >
                                                View_Explorer <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                        <div className="text-[10px] text-green-400/60 font-mono truncate">
                                            TX_ID: {txHash}
                                        </div>
                                    </div>
                                )}

                                {status === "error" && (
                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-sm flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-red-500 text-xs font-bold uppercase tracking-wider">Mint_Failed</span>
                                            <span className="text-[10px] text-red-500/60 uppercase line-clamp-1">{errorMsg}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Additional Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card border border-white/5 p-6 rounded-lg flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-white/60">
                                    <Database className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Gasless_Execution</span>
                                </div>
                                <p className="text-[10px] text-white/30 leading-relaxed uppercase">
                                    This faucet uses a centralized relayer to cover gas costs for testnet tokens, ensuring a seamless onboarding experience for new developers.
                                </p>
                            </div>
                            <div className="glass-card border border-white/5 p-6 rounded-lg flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-white/60">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Security_Policy</span>
                                </div>
                                <p className="text-[10px] text-white/30 leading-relaxed uppercase">
                                    Rate limits apply based on wallet address and IP. Please only request tokens needed for active feature validation.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Inventory */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="glass-card rounded-lg border border-white/10 overflow-hidden shadow-2xl flex flex-col flex-1">
                            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex justify-between items-center text-white">
                                <span className="text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-2">
                                    <Wallet className="w-3 h-3" /> Wallet_Inventory
                                </span>
                                <button
                                    onClick={fetchBalances}
                                    disabled={loadingBalances}
                                    className="p-1 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-3 w-3 text-primary ${loadingBalances ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            <div className="flex flex-col divide-y divide-white/5">
                                <div className="px-6 py-4 bg-primary/5 flex flex-col gap-1">
                                    <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Active_Network</span>
                                    <span className="text-white text-xs font-black uppercase tracking-tighter flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                        {NETWORKS[network as keyof typeof NETWORKS]?.name}
                                    </span>
                                </div>

                                <div className="px-6 py-4 grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Connection_Status</span>
                                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">LIVE_CONNECTED</span>
                                    </div>
                                    <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Auth_Provider</span>
                                        <span className="text-[10px] text-white/60 font-bold">CARDANO_MESH</span>
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col gap-4">
                                    <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Asset_Holdings</span>

                                    <div className="flex flex-col gap-3">
                                        {Object.keys(TOKEN_METADATA).map((sym) => (
                                            <div
                                                key={sym}
                                                className="group flex items-center justify-between p-3 rounded-sm bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/[0.08] transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-8 bg-${TOKEN_METADATA[sym].color}-500/10 rounded-sm flex items-center justify-center border border-${TOKEN_METADATA[sym].color}-500/20`}>
                                                        <CryptoIcon ledgerId={TOKEN_METADATA[sym].ledgerId} ticker={sym} network="ethereum" size="16px" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-white uppercase">{sym}</span>
                                                        <span className="text-[9px] text-white/30 uppercase leading-none">{TOKEN_METADATA[sym].name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {loadingBalances ? (
                                                        <Skeleton className="h-4 w-16 bg-white/5" />
                                                    ) : (
                                                        <span className="text-sm font-black font-mono tracking-tighter text-white">
                                                            {balances[sym] || "0.00"}
                                                        </span>
                                                    )}
                                                    <ChevronRight className="w-3 h-3 text-white/20 group-hover:translate-x-1 group-hover:text-primary transition-all" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 mt-auto">
                                <div className="bg-zinc-900/50 rounded p-4 flex flex-col gap-2 border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-3 h-3 text-yellow-400" />
                                        <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest">Network_Notice</span>
                                    </div>
                                    <p className="text-[9px] text-white/40 leading-relaxed uppercase">
                                        Balances shown are local to the selected spoke chain. Switch network above to view holdings on other testnets.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ConnectGate>
    )
}

function getExplorerLink(network: string, hash: string) {
    const base = (NETWORKS as any)[network]?.explorer
    return base ? `${base}/tx/${hash}` : "#"
}
