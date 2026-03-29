"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import {
  Zap, History, ShieldCheck, TrendingUp, CreditCard, Target,
  ChevronDown, Info, ArrowLeftRight, Check,
} from "lucide-react"

const BORROW_ASSETS = [
  { symbol: "gUSD", color: "bg-purple-500" },
  { symbol: "USDC", color: "bg-blue-500" },
  { symbol: "USDT", color: "bg-green-600" },
]
const COLLATERAL_ASSETS = [
  { symbol: "gETH", color: "bg-purple-700" },
  { symbol: "WETH", color: "bg-blue-400" },
  { symbol: "WBTC", color: "bg-orange-500" },
]
const TABS = ["Borrow", "Lend", "Swap", "Status"] as const
type Tab = typeof TABS[number]

function TokenDropdown({ options, value, onChange }: {
  options: { symbol: string; color: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.symbol === value) ?? options[0]
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 bg-[#1a1d24] border border-border/40 hover:border-primary/40 rounded-xl px-3 py-2.5 transition-colors min-w-[110px]">
        <div className={`w-5 h-5 rounded-full flex-shrink-0 ${selected.color} flex items-center justify-center text-[9px] font-bold text-white`}>{selected.symbol[0]}</div>
        <span className="text-sm font-semibold text-white">{selected.symbol}</span>
        <ChevronDown size={13} className={`text-foreground/40 transition-transform ml-auto ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d0f14] border border-border/40 rounded-xl overflow-hidden shadow-2xl min-w-[130px]">
          {options.map(opt => (
            <button key={opt.symbol} type="button" onClick={() => { onChange(opt.symbol); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary/10 transition-colors text-left">
              <div className={`w-5 h-5 rounded-full flex-shrink-0 ${opt.color} flex items-center justify-center text-[9px] font-bold text-white`}>{opt.symbol[0]}</div>
              <span className="text-sm text-white">{opt.symbol}</span>
              {opt.symbol === value && <Check size={12} className="text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PrivateActionWidget() {
  const [tab, setTab] = useState<Tab>("Borrow")
  const [borrowAmount, setBorrowAmount] = useState("")
  const [collateralAmount, setCollateralAmount] = useState("")
  const [maxRate, setMaxRate] = useState("10")
  const [duration, setDuration] = useState("30")
  const [borrowAsset, setBorrowAsset] = useState("gUSD")
  const [collateralAsset, setCollateralAsset] = useState("gETH")
  const [lendAmount, setLendAmount] = useState("")
  const [lendAsset, setLendAsset] = useState("gUSD")
  const [minRate, setMinRate] = useState("5")
  const [lendDuration, setLendDuration] = useState("30")

  return (
    <div className="bg-[#0d0f14] border border-border/30 rounded-3xl overflow-hidden">
      <div className="flex items-center gap-1 p-2 bg-[#05080f]/60 border-b border-border/20">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-2xl text-sm font-semibold transition-all ${tab === t ? "bg-[#1a1d24] text-white shadow border border-border/30" : "text-foreground/40 hover:text-foreground/70"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="p-6 space-y-4">
        {tab === "Borrow" && (
          <>
            <div>
              <h3 className="text-lg font-bold text-white">Borrow with Privacy</h3>
              <p className="text-xs text-foreground/40 mt-1 leading-relaxed">Submit a private borrow intent. Your max rate is encrypted and only revealed inside the CRE settlement engine.</p>
            </div>
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-2">
              <label className="text-xs text-foreground/40">{"You're borrowing"}</label>
              <div className="flex items-center gap-3">
                <input type="number" value={borrowAmount} onChange={e => setBorrowAmount(e.target.value)} placeholder="0" className="flex-1 bg-transparent text-3xl font-light text-foreground/60 placeholder:text-foreground/20 focus:outline-none min-w-0" />
                <TokenDropdown options={BORROW_ASSETS} value={borrowAsset} onChange={setBorrowAsset} />
              </div>
            </div>
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-2">
              <label className="text-xs text-foreground/40">Collateral ({collateralAsset})</label>
              <div className="flex items-center gap-3">
                <input type="number" value={collateralAmount} onChange={e => setCollateralAmount(e.target.value)} placeholder="0" className="flex-1 bg-transparent text-3xl font-light text-foreground/60 placeholder:text-foreground/20 focus:outline-none min-w-0" />
                <TokenDropdown options={COLLATERAL_ASSETS} value={collateralAsset} onChange={setCollateralAsset} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-1">
                <label className="text-xs text-foreground/40">Max Rate (%)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={maxRate} onChange={e => setMaxRate(e.target.value)} className="flex-1 bg-transparent text-2xl font-light text-foreground/70 focus:outline-none min-w-0" />
                  <span className="text-foreground/30 text-sm">%</span>
                </div>
              </div>
              <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-1">
                <label className="text-xs text-foreground/40">Duration (days)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="flex-1 bg-transparent text-2xl font-bold text-foreground focus:outline-none min-w-0" />
                  <span className="text-foreground/30 text-sm">d</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#05080f]/40 border border-border/20 rounded-xl px-4 py-3">
              <Info size={14} className="text-foreground/30 flex-shrink-0" />
              <span className="text-xs text-foreground/40">Your max rate is encrypted and hidden from the server</span>
            </div>
            <button className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all">Submit Borrow Intent</button>
          </>
        )}
        {tab === "Lend" && (
          <>
            <div>
              <h3 className="text-lg font-bold text-white">Lend with Privacy</h3>
              <p className="text-xs text-foreground/40 mt-1 leading-relaxed">Supply liquidity privately. Your min rate is encrypted and matched inside the CRE engine.</p>
            </div>
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-2">
              <label className="text-xs text-foreground/40">{"You're lending"}</label>
              <div className="flex items-center gap-3">
                <input type="number" value={lendAmount} onChange={e => setLendAmount(e.target.value)} placeholder="0" className="flex-1 bg-transparent text-3xl font-light text-foreground/60 placeholder:text-foreground/20 focus:outline-none min-w-0" />
                <TokenDropdown options={BORROW_ASSETS} value={lendAsset} onChange={setLendAsset} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-1">
                <label className="text-xs text-foreground/40">Min Rate (%)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={minRate} onChange={e => setMinRate(e.target.value)} className="flex-1 bg-transparent text-2xl font-light text-foreground/70 focus:outline-none min-w-0" />
                  <span className="text-foreground/30 text-sm">%</span>
                </div>
              </div>
              <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-1">
                <label className="text-xs text-foreground/40">Duration (days)</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={lendDuration} onChange={e => setLendDuration(e.target.value)} className="flex-1 bg-transparent text-2xl font-bold text-foreground focus:outline-none min-w-0" />
                  <span className="text-foreground/30 text-sm">d</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#05080f]/40 border border-border/20 rounded-xl px-4 py-3">
              <Info size={14} className="text-foreground/30 flex-shrink-0" />
              <span className="text-xs text-foreground/40">Your min rate is encrypted and hidden from the server</span>
            </div>
            <button className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all">Submit Lend Intent</button>
          </>
        )}
        {tab === "Swap" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Private Swap</h3>
              <p className="text-xs text-foreground/40 mt-1">Swap assets with encrypted amounts.</p>
            </div>
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-2">
              <label className="text-xs text-foreground/40">From</label>
              <div className="flex items-center gap-3">
                <input type="number" placeholder="0" className="flex-1 bg-transparent text-3xl font-light text-foreground/60 placeholder:text-foreground/20 focus:outline-none min-w-0" />
                <TokenDropdown options={BORROW_ASSETS} value="gUSD" onChange={() => {}} />
              </div>
            </div>
            <div className="flex justify-center">
              <div className="p-2 rounded-full bg-[#1a1d24] border border-border/30 hover:border-primary/40 transition-colors cursor-pointer">
                <ArrowLeftRight size={16} className="text-foreground/40" />
              </div>
            </div>
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-2">
              <label className="text-xs text-foreground/40">To</label>
              <div className="flex items-center gap-3">
                <input type="number" placeholder="0" className="flex-1 bg-transparent text-3xl font-light text-foreground/60 placeholder:text-foreground/20 focus:outline-none min-w-0" />
                <TokenDropdown options={COLLATERAL_ASSETS} value="gETH" onChange={() => {}} />
              </div>
            </div>
            <button className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all">Swap</button>
          </div>
        )}
        {tab === "Status" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">Protocol Status</h3>
              <p className="text-xs text-foreground/40 mt-1">Live FHE settlement engine metrics.</p>
            </div>
            {[
              { label: "CRE Settlement Engine", status: "Online", dot: "bg-green-400" },
              { label: "FHE Encryption Layer", status: "Active", dot: "bg-primary" },
              { label: "Sepolia Network", status: "Synced", dot: "bg-green-400" },
              { label: "Oracle Feed", status: "Live", dot: "bg-green-400" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between bg-[#05080f]/60 border border-border/20 rounded-xl px-4 py-3">
                <span className="text-xs text-foreground/60">{s.label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${s.dot}`} />
                  <span className="text-xs font-bold text-foreground/80">{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  const stats = { totalSupplied: "Private", totalBorrowed: "Private", healthFactor: "Safe", availableCredit: "Private" }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-mono">
      <div className="lg:col-span-7 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Confidential Asset Overview</h2>
            <p className="text-xs text-foreground/40 uppercase tracking-widest">Secured by Zama FHEVM // Sepolia Network</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-[10px] text-primary font-bold tracking-wider uppercase backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Shield_Active
          </div>
        </div>
        <div className="relative group overflow-hidden bg-[#05080f]/50 border border-primary/20 rounded-3xl p-8 backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldCheck size={120} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-6">
              <div>
                <div className="text-[10px] text-foreground/40 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <CreditCard size={12} className="text-primary" />Total_Supplied_(Encrypted)
                </div>
                <div className="text-5xl font-black tracking-tighter text-foreground font-mono">{stats.totalSupplied}</div>
                <p className="text-[10px] text-foreground/20 italic mt-2">*Only you can decrypt your position data.</p>
              </div>
              <div>
                <div className="text-[10px] text-foreground/40 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <History size={12} className="text-primary" />Total_Borrowed_(Encrypted)
                </div>
                <div className="text-4xl font-bold tracking-tight text-white/50">{stats.totalBorrowed}</div>
              </div>
            </div>
            <div className="flex flex-col justify-between space-y-8">
              <div className="bg-secondary/20 border border-border/40 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-foreground/50 uppercase tracking-widest">Health_Factor</span>
                  <span className="text-sm font-black text-primary px-2 py-0.5 rounded border border-primary/30">{stats.healthFactor}</span>
                </div>
                <div className="h-2 bg-secondary/50 rounded-full overflow-hidden border border-border/10">
                  <div className="h-full w-[85%] bg-primary" />
                </div>
                <div className="flex justify-between text-[10px] text-foreground/30 uppercase">
                  <span>Threshold: 150%</span><span>Current: 185%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background/40 border border-border/30 rounded-xl">
                  <div className="text-[9px] text-foreground/40 uppercase mb-1">Net APR</div>
                  <div className="text-sm font-bold text-green-400">+5.24%</div>
                </div>
                <div className="p-4 bg-background/40 border border-border/30 rounded-xl">
                  <div className="text-[9px] text-foreground/40 uppercase mb-1">Borrow Power</div>
                  <div className="text-sm font-bold text-primary">{stats.availableCredit}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { tag: "SUPPLY", asset: "USDC", sub: "4.5% Avg APY", icon: TrendingUp },
            { tag: "BORROW", asset: "WETH", sub: "2.1% Avg APY", icon: Zap },
            { tag: "ASSETS", asset: "TOTAL", sub: "12 Configured", icon: Target },
          ].map((item, i) => (
            <div key={i} className="bg-card/30 border border-border/50 rounded-2xl p-6 hover:bg-card/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary"><item.icon size={18} /></div>
                <div className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{item.tag}</div>
              </div>
              <div className="text-lg font-bold">{item.asset}</div>
              <div className="text-xs text-foreground/50 mt-1">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-5 space-y-6">
        <PrivateActionWidget />
        <div className="bg-[#05080f]/40 border border-border/40 rounded-3xl p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 italic">Recent_Chain_Logs</h3>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-foreground/30 uppercase">LIVE</span>
              <div className="w-1 h-1 rounded-full bg-primary" />
            </div>
          </div>
          <div className="space-y-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 border-l-2 border-primary/20 pl-4 py-1 hover:border-primary transition-colors cursor-default">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-primary/80 tracking-tighter">TX_REDACTED_HASH_{i}4FC9</div>
                  <div className="text-xs font-medium text-foreground/80 leading-snug">Decrypted call to <span className="text-primary/70">supply()</span></div>
                  <div className="text-[9px] text-foreground/30 uppercase mt-1">Confirmed // 2.4s ago</div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/transactions" className="mt-10 block text-center text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/40 hover:text-primary transition-colors">
            View All Confidential Logs
          </Link>
        </div>
      </div>
    </div>
  )
}