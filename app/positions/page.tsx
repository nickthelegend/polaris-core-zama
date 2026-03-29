"use client"

import { useState } from "react"
import { 
  Plus, 
  ArrowDown, 
  ShieldCheck, 
  Lock, 
  TrendingUp, 
  Zap,
  History,
  Target,
  ArrowUpRight
} from "lucide-react"

export default function PositionsPage() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)

  const positions = [
    { type: "SUPPLY", symbol: "USDC", name: "USD Coin", amount: "••••••", apy: "4.5%", value: "Encrypted" },
    { type: "BORROW", symbol: "WETH", name: "Wrapped Ether", amount: "••••••", apy: "6.2%", value: "Encrypted" },
  ]

  return (
    <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">
          Confidential_Positions // audit_access
        </span>
        <h1 className="text-white text-3xl tracking-tighter font-black uppercase">
          Private Inventory
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#05080f]/40 border border-primary/20 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Lock size={80} />
          </div>
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Net_Supply</span>
          <div className="text-3xl font-bold tracking-tight">••••••••</div>
          <div className="text-[10px] text-primary/60 flex items-center gap-1 mt-2 uppercase tracking-widest">
            <ShieldCheck size={12} />
            Encrypted
          </div>
        </div>
        <div className="bg-[#05080f]/40 border border-border/40 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
            <Zap size={80} />
          </div>
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Net_Debt</span>
          <div className="text-3xl font-bold tracking-tight">••••••••</div>
          <div className="text-[10px] text-red-400 flex items-center gap-1 mt-2 uppercase tracking-widest">
            <TrendingUp size={12} />
            Encrypted
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
          {positions.map((pos) => (
            <div key={`${pos.type}-${pos.symbol}`} className="grid grid-cols-12 px-8 py-8 items-center hover:bg-primary/5 transition-colors group">
              <div className="col-span-4 flex items-center gap-5">
                <div className={`p-1.5 rounded-lg ${pos.type === 'SUPPLY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {pos.type === 'SUPPLY' ? <ArrowDown size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {pos.symbol} 
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${pos.type === 'SUPPLY' ? 'border-green-500/20 text-green-400' : 'border-red-500/20 text-red-400'}`}>
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
                <div className={`text-sm font-bold ${pos.type === 'SUPPLY' ? 'text-green-400' : 'text-red-400'}`}>
                  {pos.type === 'SUPPLY' ? '+' : '-'}{pos.apy}
                </div>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button className={`py-2 px-4 rounded-xl border font-bold text-[10px] uppercase tracking-widest ${pos.type === 'SUPPLY' ? 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20' : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'} transition-all`}>
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
             <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>USDC_COLLATERAL</span>
                  <span className="text-foreground/40 italic">Encrypted</span>
                </div>
             </div>
             <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>WETH_COLLATERAL</span>
                  <span className="text-foreground/40 italic">Encrypted</span>
                </div>
                <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                   <div className="h-full w-[35%] bg-blue-500 shadow-[0_0_8px_rgba(0,100,255,0.4)]" />
                </div>
             </div>
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
