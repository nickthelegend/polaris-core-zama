"use client"

import { useState } from "react"
import { 
  Plus, 
  ArrowDown, 
  ShieldCheck, 
  Lock, 
  TrendingUp, 
  Zap,
  Info
} from "lucide-react"

export default function PoolsPage() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)

  const pools = [
    { symbol: "USDC", name: "USD Coin", supplyApy: "4.5%", borrowApy: "6.2%", liquidity: "Private", tvl: "$12.4M" },
    { symbol: "WETH", name: "Wrapped Ether", supplyApy: "3.2%", borrowApy: "4.8%", liquidity: "Private", tvl: "$8.1M" },
    { symbol: "WBTC", name: "Wrapped Bitcoin", supplyApy: "2.8%", borrowApy: "4.1%", liquidity: "Private", tvl: "$15.2M" },
    { symbol: "LINK", name: "Chainlink", supplyApy: "5.1%", borrowApy: "7.5%", liquidity: "Private", tvl: "$3.4M" }
  ]

  return (
    <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">
          Confidential_Markets // active_pools
        </span>
        <h1 className="text-white text-3xl tracking-tighter font-black uppercase">
          Lending Terminals
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#05080f]/40 border border-primary/20 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck size={80} />
          </div>
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Global_Liquidity</span>
          <div className="text-3xl font-bold tracking-tight">$39,102,482</div>
          <div className="text-[10px] text-primary/60 flex items-center gap-1 mt-2">
            <TrendingUp size={12} />
            +12.4% THIS MONTH
          </div>
        </div>
        <div className="bg-[#05080f]/40 border border-border/40 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2">
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Avg_Supply_APY</span>
          <div className="text-3xl font-bold tracking-tight text-primary">3.91%</div>
        </div>
        <div className="bg-[#05080f]/40 border border-border/40 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-2">
          <span className="text-[10px] text-foreground/40 uppercase tracking-widest">Active_Borrows</span>
          <div className="text-3xl font-bold tracking-tight">Private</div>
        </div>
      </div>

      <div className="bg-card/20 border border-border/40 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="grid grid-cols-12 bg-white/5 border-b border-border/20 px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40">
          <div className="col-span-4">Asset</div>
          <div className="col-span-2 text-right">Supply APY</div>
          <div className="col-span-2 text-right">Borrow APY</div>
          <div className="col-span-2 text-right">Liquidity</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-border/10">
          {pools.map((pool) => (
            <div key={pool.symbol} className="grid grid-cols-12 px-8 py-6 items-center hover:bg-primary/5 transition-colors group">
              <div className="col-span-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/50 border border-border/30 flex items-center justify-center font-bold text-xs">
                  {pool.symbol[0]}
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{pool.symbol}</div>
                  <div className="text-[10px] text-foreground/40 italic">{pool.name}</div>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <div className="text-sm font-bold text-green-400">{pool.supplyApy}</div>
              </div>
              <div className="col-span-2 text-right">
                <div className="text-sm font-bold text-red-400">{pool.borrowApy}</div>
              </div>
              <div className="col-span-2 text-right">
                <div className="text-sm font-mono text-white/40 flex items-center justify-end gap-1.5 uppercase">
                  <Lock size={12} className="text-primary/40" />
                  {pool.liquidity}
                </div>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/20 transition-all">
                  <Plus size={18} />
                </button>
                <button className="p-2.5 rounded-xl border border-border/30 bg-secondary/20 text-white hover:bg-secondary/40 transition-all">
                  <Zap size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4 p-6 rounded-2xl bg-primary/5 border border-primary/10">
        <Info className="text-primary flex-shrink-0" size={20} />
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Confidential Protocol Notice</p>
          <p className="text-[11px] text-foreground/50 leading-relaxed">
            All liquidity data is processed on-chain using Fully Homomorphic Encryption. While the protocol ensures total transparency in its smart contract logic, individual pool sizes are obfuscated to protect market depth and prevent front-running.
          </p>
        </div>
      </div>
    </div>
  )
}
