"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Zap,
  History,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Target,
} from "lucide-react"

export default function Page() {
  // Placeholder stats - will be hydrated from FHEVM
  const stats = {
    totalSupplied: "Private",
    totalBorrowed: "Private",
    healthFactor: "Safe",
    availableCredit: "Private",
    limit: "$100,000"
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-mono">
      <div className="lg:col-span-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Confidential Asset Overview
            </h2>
            <p className="text-xs text-foreground/40 uppercase tracking-widest">
              Secured by Zama FHEVM // Sepolia Network
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-[10px] text-primary font-bold tracking-wider uppercase backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Shield_Active
          </div>
        </div>

        {/* Confidential Snapshot Card */}
        <div className="relative group overflow-hidden bg-[#05080f]/50 border border-primary/20 rounded-3xl p-8 backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldCheck size={120} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-6">
              <div>
                <div className="text-[10px] text-foreground/40 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <CreditCard size={12} className="text-primary" />
                  Total_Supplied_(Encrypted)
                </div>
                <div className="text-5xl font-black tracking-tighter text-foreground font-mono">
                  {stats.totalSupplied}
                </div>
                <p className="text-[10px] text-foreground/20 italic mt-2">
                  *Only you can decrypt your position data.
                </p>
              </div>

              <div>
                <div className="text-[10px] text-foreground/40 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <History size={12} className="text-primary" />
                  Total_Borrowed_(Encrypted)
                </div>
                <div className="text-4xl font-bold tracking-tight text-white/50">
                  {stats.totalBorrowed}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between space-y-8">
              <div className="bg-secondary/20 border border-border/40 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-foreground/50 uppercase tracking-widest">Health_Factor</span>
                  <span className="text-sm font-black text-primary px-2 py-0.5 rounded border border-primary/30">{stats.healthFactor}</span>
                </div>
                <div className="h-2 bg-secondary/50 rounded-full overflow-hidden border border-border/10">
                  <div className="h-full w-[85%] bg-primary shadow-[0_0_15px_rgba(var(--primary),0.6)]" />
                </div>
                <div className="flex justify-between text-[10px] text-foreground/30 uppercase">
                  <span>Threshold: 150%</span>
                  <span>Current: 185%</span>
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

        {/* Market Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { tag: "SUPPLY", asset: "USDC", apy: "4.5%", icon: TrendingUp },
            { tag: "BORROW", asset: "WETH", apy: "2.1%", icon: Zap },
            { tag: "ASSETS", asset: "TOTAL", count: "12", icon: Target },
          ].map((item, i) => (
            <div key={i} className="bg-card/30 border border-border/50 rounded-2xl p-6 hover:bg-card/50 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <item.icon size={18} />
                </div>
                <div className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{item.tag}</div>
              </div>
              <div className="text-lg font-bold">{item.asset}</div>
              <div className="text-xs text-foreground/50 mt-1">{item.apy || item.count} {item.apy ? 'Avg APY' : 'Configured'}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <div className="bg-card/20 border border-border/40 rounded-3xl p-8 backdrop-blur-sm space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/60 border-b border-border/20 pb-4">
            Terminal Actions
          </h3>
          <div className="space-y-4">
            <Link href="/pools" className="block">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-7 rounded-2xl flex items-center justify-center gap-3 group">
                <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>SUPPLY_LIQUIDITY</span>
              </Button>
            </Link>
            <Link href="/borrow" className="block">
              <Button variant="outline" className="w-full border-border/40 hover:bg-primary/10 text-foreground font-bold py-7 rounded-2xl flex items-center justify-center gap-3">
                <Zap className="w-5 h-5 text-primary" />
                <span>BORROW_PRIVATE</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-[#05080f]/40 border border-border/40 rounded-3xl p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 italic">
              Recent_Chain_Logs
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-foreground/30 uppercase">LIVE</span>
              <div className="w-1 h-1 rounded-full bg-primary" />
            </div>
          </div>
          
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 border-l-2 border-primary/20 pl-4 py-1 hover:border-primary transition-colors cursor-default">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-primary/80 tracking-tighter">
                    TX_REDACTED_HASH_{i}4FC9
                  </div>
                  <div className="text-xs font-medium text-foreground/80 leading-snug">
                    Decrypted call to <span className="text-primary/70">supply()</span>
                  </div>
                  <div className="text-[9px] text-foreground/30 uppercase mt-1">
                    Confirmed // 2.4s ago
                  </div>
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
