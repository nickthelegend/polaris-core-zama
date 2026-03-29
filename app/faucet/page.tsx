"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Info, Loader2, CheckCircle2, ExternalLink, ShieldCheck, Coins } from "lucide-react"
import { TokenIcon } from "@/components/token-icon"

const FAUCET_TOKENS = [
  { symbol: "ETH",  color: "bg-blue-400",   amount: "0.5" },
  { symbol: "USDC", color: "bg-blue-500",   amount: "1,000" },
  { symbol: "WBTC", color: "bg-orange-500", amount: "0.01" },
  { symbol: "BNB",  color: "bg-yellow-500", amount: "2" },
]

function TokenDropdown({ options, value, onChange }: {
  options: { symbol: string; color: string; amount: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.symbol === value) ?? options[0]
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 bg-[#1a1d24] border border-border/40 hover:border-primary/40 rounded-xl px-3 py-2.5 transition-colors min-w-[110px]">
        <TokenIcon symbol={selected.symbol} size={20} className="flex-shrink-0" />
        <span className="text-sm font-semibold text-white">{selected.symbol}</span>
        <ChevronDown size={13} className={`text-foreground/40 transition-transform ml-auto ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d0f14] border border-border/40 rounded-xl overflow-hidden shadow-2xl min-w-[140px]">
          {options.map(opt => (
            <button key={opt.symbol} type="button" onClick={() => { onChange(opt.symbol); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary/10 transition-colors text-left">
              <TokenIcon symbol={opt.symbol} size={20} className="flex-shrink-0" />
              <span className="text-sm text-white">{opt.symbol}</span>
              {opt.symbol === value && <Check size={12} className="text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FaucetPage() {
  const [token, setToken] = useState("USDC")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [txHash, setTxHash] = useState("")
  const selected = FAUCET_TOKENS.find(t => t.symbol === token) ?? FAUCET_TOKENS[0]

  const handleDispense = async () => {
    setStatus("loading")
    setTimeout(() => {
      setStatus("success")
      setTxHash("0x" + Math.random().toString(16).slice(2, 66))
    }, 2000)
  }

  return (
    <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">Confidential_Faucet // sepolia_only</span>
        <h1 className="text-white text-3xl tracking-tighter font-black uppercase">Testnet Resources</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-[#0d0f14] border border-border/30 rounded-3xl overflow-hidden">
          <div className="p-8 space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white">Request Test Tokens</h3>
              <p className="text-xs text-foreground/40 mt-1 leading-relaxed">
                Get testnet tokens for Sepolia. Tokens are minted directly to your wallet for testing the confidential lending protocol.
              </p>
            </div>

            {/* Token selector */}
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-5 space-y-2">
              <label className="text-xs text-foreground/40">Select token</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-4xl font-light text-foreground/60">{selected.amount}</div>
                  <div className="text-xs text-foreground/30 mt-1">Amount to dispense</div>
                </div>
                <TokenDropdown options={FAUCET_TOKENS} value={token} onChange={setToken} />
              </div>
            </div>

            {/* Network */}
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-5 space-y-2">
              <label className="text-xs text-foreground/40">Network</label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">S</div>
                  <div>
                    <div className="text-sm font-semibold text-white">Ethereum Sepolia</div>
                    <div className="text-[10px] text-foreground/30">Chain ID: 11155111</div>
                  </div>
                </div>
                <span className="text-[10px] text-primary font-bold px-3 py-1 bg-primary/10 rounded-full border border-primary/20">TESTNET</span>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="flex items-center gap-2 bg-[#05080f]/40 border border-border/20 rounded-xl px-4 py-3">
              <Info size={14} className="text-foreground/30 flex-shrink-0" />
              <span className="text-xs text-foreground/40">Tokens are for testing only and have no real-world value</span>
            </div>

            <button
              onClick={handleDispense}
              disabled={status === "loading"}
              className="w-full py-4 rounded-2xl bg-purple-500/70 hover:bg-purple-500/90 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <><Loader2 size={16} className="animate-spin" /> Requesting...</>
              ) : (
                `Request ${selected.amount} ${token}`
              )}
            </button>

            {status === "success" && (
              <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 size={14} /> Dispensed Successfully
                  </div>
                  <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer"
                    className="text-[10px] text-green-400 underline uppercase font-bold flex items-center gap-1">
                    View <ExternalLink size={10} />
                  </a>
                </div>
                <div className="text-[10px] text-green-400/40 font-mono truncate">HASH: {txHash}</div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#05080f]/40 border border-border/40 rounded-3xl p-8 backdrop-blur-md space-y-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/50">Policy Audit</span>
            </div>
            <p className="text-[11px] text-foreground/40 leading-relaxed uppercase italic">
              These tokens are minted for testing on Polaris V2. They bear no real-world value and are encrypted by default when supplied to any confidential pool.
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-6 relative overflow-hidden group">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Coins size={16} /> Dispense Limits
            </h3>
            <div className="space-y-3 font-mono text-[10px]">
              {FAUCET_TOKENS.map(t => (
                <div key={t.symbol} className="flex justify-between border-b border-primary/10 pb-2 last:border-0">
                  <span className="text-foreground/40">{t.symbol}</span>
                  <span className="text-primary font-bold">{t.amount} / request</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
