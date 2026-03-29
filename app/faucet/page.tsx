"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Database, 
  Wallet, 
  ExternalLink, 
  Coins, 
  ShieldCheck,
  Lock
} from "lucide-react"

export default function FaucetPage() {
    const [token, setToken] = useState<string>("USDC")
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [txHash, setTxHash] = useState<string>("")

    const tokens = [
      { symbol: "USDC", name: "USD Coin" },
      { symbol: "WETH", name: "Wrapped Ethereum" },
      { symbol: "WBTC", name: "Wrapped Bitcoin" },
      { symbol: "LINK", name: "Chainlink" }
    ]

    const handleMint = async () => {
        setStatus("loading")
        // Mocking a successful mint on Sepolia
        setTimeout(() => {
          setStatus("success")
          setTxHash("0x" + Math.random().toString(16).slice(2, 66))
        }, 2000)
    }

    return (
        <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white max-w-6xl mx-auto">
            <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">
                  Confidential_Faucet // sepolia_only
                </span>
                <h1 className="text-white text-3xl tracking-tighter font-black uppercase">
                  Testnet Resources
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 flex flex-col gap-8">
                    <div className="bg-[#05080f]/40 border border-primary/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-xl">
                        <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Resource_Terminal</span>
                            <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                READY_FOR_DISPENSE
                            </div>
                        </div>

                        <div className="p-10 flex flex-col gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-[0.3em]">1. Select Asset</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {tokens.map((t) => (
                                        <button 
                                          key={t.symbol}
                                          onClick={() => setToken(t.symbol)}
                                          className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${token === t.symbol ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-background/50 border border-border/20 flex items-center justify-center font-bold text-xs">
                                              {t.symbol[0]}
                                            </div>
                                            <span className="text-xs font-black">{t.symbol}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] text-white/40 uppercase font-bold tracking-[0.3em]">2. Protocol Network</label>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Database size={20} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold">Ethereum Sepolia</p>
                                        <p className="text-[10px] text-foreground/30 uppercase">Required for Confidential Lending</p>
                                      </div>
                                   </div>
                                   <div className="text-[10px] text-primary font-bold px-3 py-1 bg-primary/10 rounded-full border border-primary/20">LOCKED</div>
                                </div>
                            </div>

                            <Button
                                className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
                                onClick={handleMint}
                                disabled={status === "loading"}
                            >
                                {status === "loading" ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        COMMITTING_MINT_TX...
                                    </div>
                                ) : (
                                    "INITIATE_DISPENSE_SEQUENCE"
                                )}
                            </Button>

                            {status === "success" && (
                                <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Dispensed_Successfully
                                        </div>
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] text-green-400 underline uppercase font-bold flex items-center gap-1"
                                        >
                                            View_Scan <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <div className="text-[10px] text-green-400/40 font-mono truncate">
                                        HASH: {txHash}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-[#05080f]/40 border border-border/40 rounded-3xl p-8 backdrop-blur-md space-y-6">
                        <div className="flex items-center gap-2 text-white/60">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest text-foreground/50">Policy Audit</span>
                        </div>
                        <p className="text-[11px] text-foreground/40 leading-relaxed uppercase italic">
                            These tokens are minted directly into your wallet for testing purposes on Polaris V2. They bear no real-world value and are encrypted by default when supplied to any confidential pool.
                        </p>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-6 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                          <Lock size={120} className="text-primary" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                          <Coins size={16} /> Asset_Safety
                        </h3>
                        <div className="space-y-4 font-mono text-[10px]">
                           <div className="flex justify-between border-b border-primary/10 pb-2">
                              <span className="text-foreground/40">FHE_COMPLIANT</span>
                              <span className="text-primary font-bold tracking-tighter">YES</span>
                           </div>
                           <div className="flex justify-between border-b border-primary/10 pb-2">
                              <span className="text-foreground/40">KMS_AUTHORIZED</span>
                              <span className="text-primary font-bold tracking-tighter">YES</span>
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
