"use client"

import { useState } from "react"
import {
  ArrowDown, ShieldCheck, Lock, TrendingUp, Zap,
  History, Target, ArrowUpRight, X, Info, ChevronDown, Check, Database
} from "lucide-react"
import { TokenIcon } from "@/components/token-icon"
import { usePositions, type Position } from "@/hooks/use-positions"
import { useAccount } from "wagmi"

// ── Manage Modal ──────────────────────────────────────────────────────────────
function ManageModal({ pos, onClose }: { pos: Position; onClose: () => void }) {
  const isSupply = pos.type === "SUPPLY"
  const [tab, setTab] = useState<"add" | "withdraw">(isSupply ? "add" : "repay" as any)
  const [amount, setAmount] = useState("")

  const supplyTabs = [
    { key: "add",      label: isSupply ? "Supply More" : "Borrow More" },
    { key: "withdraw", label: isSupply ? "Withdraw"    : "Repay"       },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#0d0f14] border border-border/40 rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
          <div className="flex items-center gap-3">
            <TokenIcon symbol={pos.symbol} size={32} className="flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-white">{pos.symbol}</div>
              <div className={`text-[10px] uppercase tracking-widest ${isSupply ? "text-green-400" : "text-red-400"}`}>{pos.type}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors text-foreground/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 bg-[#05080f]/60 border-b border-border/20">
          {supplyTabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t.key ? "bg-[#1a1d24] text-white border border-border/30" : "text-foreground/40 hover:text-foreground/70"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* Position summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Balance", value: "••••••" },
              { label: "APY", value: `${isSupply ? "+" : "-"}${pos.apy}`, color: isSupply ? "text-green-400" : "text-red-400" },
              { label: "Health", value: "1.92", color: "text-primary" },
            ].map(s => (
              <div key={s.label} className="bg-[#05080f]/60 border border-border/20 rounded-xl p-3 text-center">
                <div className="text-[9px] text-foreground/40 uppercase tracking-widest mb-1">{s.label}</div>
                <div className={`text-sm font-bold ${s.color ?? "text-foreground/50 tracking-widest"}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Amount input */}
          <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-4 space-y-2">
            <label className="text-xs text-foreground/40">
              {tab === "add"
                ? isSupply ? "Amount to supply" : "Amount to borrow"
                : isSupply ? "Amount to withdraw" : "Amount to repay"}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-3xl font-light text-foreground/60 placeholder:text-foreground/20 focus:outline-none min-w-0"
              />
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isSupply ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                <TokenIcon symbol={pos.symbol} size={16} className="flex-shrink-0" />
                <span className="text-sm font-bold">{pos.symbol}</span>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-foreground/30 pt-1">
              <span>Available</span>
              <span className="flex items-center gap-1"><Lock size={9} /> Encrypted</span>
            </div>
          </div>

          {/* Impact preview */}
          <div className="bg-[#05080f]/40 border border-border/20 rounded-xl px-4 py-3 space-y-2">
            {[
              { label: "New Health Factor", value: amount ? "~2.14" : "—", color: "text-primary" },
              { label: "Liquidation Price", value: "Hidden", muted: true },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-[11px]">
                <span className="text-foreground/40">{r.label}</span>
                <span className={`font-bold ${r.color ?? (r.muted ? "text-foreground/30" : "")}`}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Privacy notice */}
          <div className="flex items-center gap-2 bg-[#05080f]/40 border border-border/20 rounded-xl px-4 py-3">
            <Info size={13} className="text-foreground/30 flex-shrink-0" />
            <span className="text-[11px] text-foreground/40">Transaction amount is encrypted via Zama FHEVM</span>
          </div>

          <button
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${
              isSupply
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-red-500/80 hover:bg-red-500 text-white"
            }`}
          >
            {tab === "add"
              ? isSupply ? "Confirm Supply" : "Confirm Borrow"
              : isSupply ? "Confirm Withdraw" : "Confirm Repay"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PositionsPage() {
  const { address, isConnected } = useAccount()
  const { positions, loading, error } = usePositions()
  const [managingPos, setManagingPos] = useState<Position | null>(null)

  // Calculate totals
  const totalSupply = positions.filter(p => p.type === "SUPPLY").length
  const totalBorrow = positions.filter(p => p.type === "BORROW").length

  return (
    <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white">
      {managingPos && <ManageModal pos={managingPos} onClose={() => setManagingPos(null)} />}

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">Confidential_Positions // audit_access</span>
        <h1 className="text-white text-3xl tracking-tighter font-black uppercase">Private Inventory</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#05080f]/40 border border-primary/20 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Lock size={80} /></div>
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Net_Supply</span>
          <div className="text-3xl font-bold tracking-tight">••••••••</div>
          <div className="text-[10px] text-primary/60 flex items-center gap-1 mt-2 uppercase tracking-widest">
            <ShieldCheck size={12} />Encrypted
          </div>
        </div>
        <div className="bg-[#05080f]/40 border border-border/40 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={80} /></div>
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Net_Debt</span>
          <div className="text-3xl font-bold tracking-tight">••••••••</div>
          <div className="text-[10px] text-red-400 flex items-center gap-1 mt-2 uppercase tracking-widest">
            <TrendingUp size={12} />Encrypted
          </div>
        </div>
        <div className="bg-[#05080f]/40 border border-border/40 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2">
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Utilization</span>
          <div className="text-3xl font-bold tracking-tight text-primary">~24%</div>
        </div>
        <div className="bg-[#05080f]/40 border border-border/40 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2">
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Health_Factor</span>
          <div className="text-3xl font-bold tracking-tight text-green-400">1.92</div>
        </div>
      </div>

      <div className="bg-card/20 border border-border/40 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="grid grid-cols-12 bg-white/5 border-b border-border/20 px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 items-center">
          <div className="col-span-4">Position Detail</div>
          <div className="col-span-2 text-right">Balance</div>
          <div className="col-span-2 text-right">Value ($)</div>
          <div className="col-span-2 text-right">Net APY</div>
          <div className="col-span-2 text-right">Control</div>
        </div>
        <div className="divide-y divide-border/10">
          {!isConnected && (
            <div className="px-8 py-12 text-center">
              <Lock size={48} className="mx-auto text-foreground/20 mb-4" />
              <p className="text-sm text-foreground/40">Connect your wallet to view positions</p>
            </div>
          )}
          
          {isConnected && loading && (
            <div className="px-8 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-foreground/40">Loading positions...</p>
            </div>
          )}
          
          {isConnected && error && (
            <div className="px-8 py-12 text-center">
              <p className="text-sm text-red-400">Error: {error}</p>
            </div>
          )}
          
          {isConnected && !loading && !error && positions.length === 0 && (
            <div className="px-8 py-12 text-center">
              <Database size={48} className="mx-auto text-foreground/20 mb-4" />
              <p className="text-sm text-foreground/40">No positions found</p>
              <p className="text-xs text-foreground/30 mt-2">Supply or borrow assets to get started</p>
            </div>
          )}
          
          {isConnected && !loading && !error && positions.map((pos) => (
            <div key={`${pos.type}-${pos.symbol}`} className="grid grid-cols-12 px-8 py-8 items-center hover:bg-primary/5 transition-colors group cursor-pointer"
              onClick={() => setManagingPos(pos)}>
              <div className="col-span-4 flex items-center gap-5">
                <div className={`p-1.5 rounded-lg ${pos.type === "SUPPLY" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  {pos.type === "SUPPLY" ? <ArrowDown size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {pos.symbol}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${pos.type === "SUPPLY" ? "border-green-500/20 text-green-400" : "border-red-500/20 text-red-400"}`}>
                      {pos.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-foreground/40 font-mono tracking-tighter uppercase mt-0.5">AUTH_REDACTED_DATA_{pos.symbol}</div>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <div className="text-sm font-bold font-mono text-white/50">{pos.amount}</div>
              </div>
              <div className="col-span-2 text-right">
                <div className="text-sm font-bold font-mono text-white/50">{pos.value}</div>
              </div>
              <div className="col-span-2 text-right">
                <div className={`text-sm font-bold ${pos.type === "SUPPLY" ? "text-green-400" : "text-red-400"}`}>
                  {pos.type === "SUPPLY" ? "+" : "-"}{pos.apy}
                </div>
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  onClick={e => { e.stopPropagation(); setManagingPos(pos) }}
                  className={`py-2 px-4 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all ${pos.type === "SUPPLY" ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20" : "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}>
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#05080f]/30 border border-border/30 rounded-3xl p-8 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/30 flex items-center gap-2">
            <Target size={16} /> Collateral_Composition
          </h3>
          <div className="space-y-6">
            {[
              { label: "USDC_COLLATERAL", pct: "65%", color: "bg-primary" },
              { label: "WETH_COLLATERAL", pct: "35%", color: "bg-blue-500" },
            ].map(c => (
              <div key={c.label} className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>{c.label}</span>
                  <span className="text-foreground/40 italic">Encrypted</span>
                </div>
                <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                  <div className={`h-full ${c.color}`} style={{ width: c.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#05080f]/30 border border-border/30 rounded-3xl p-8 space-y-6 relative group overflow-hidden">
          <div className="absolute inset-0 bg-primary/2 opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/30 flex items-center gap-2">
            <History size={16} /> Governance_Snapshot
          </h3>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-background/20 border border-border/20 rounded-xl p-4 flex items-center justify-between group-hover:border-primary/30 transition-colors">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold">Prop_412: Confidential Vault Integration</div>
                  <div className="text-[9px] text-foreground/30 uppercase tracking-tighter">Status: Executed // 12h ago</div>
                </div>
                <div className="text-primary"><ArrowUpRight size={16} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
