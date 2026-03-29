"use client"

import { useState } from "react"
import { 
  Zap, 
  ShieldAlert, 
  ArrowUpRight, 
  Lock, 
  CreditCard,
  ChevronRight
} from "lucide-react"

export default function BorrowPage() {
  const [borrowAmount, setBorrowAmount] = useState("0")

  return (
    <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">
          Confidential_Debt // terminal_access
        </span>
        <h1 className="text-white text-3xl tracking-tighter font-black uppercase">
          Execute Borrow
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-card/20 border border-border/40 rounded-3xl p-10 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute bottom-0 right-0 p-10 opacity-5 pointer-events-none">
            <Zap size={240} className="text-primary fill-current" />
          </div>
          
          <div className="space-y-12 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-12 border-b border-border/10">
              <div className="space-y-1">
                <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Available_Credit</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <Lock size={16} className="text-primary/70" />
                  Private
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Global_APR</p>
                <p className="text-2xl font-bold text-red-400">6.24%</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Health_Factor</p>
                <p className="text-2xl font-bold text-primary">Safe</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/50">1. SELECT ASSET TO BORROW</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {["USDC", "WETH", "WBTC", "USDT"].map((asset) => (
                    <button key={asset} className="bg-secondary/20 border border-border/30 rounded-2xl p-6 flex flex-col items-center gap-3 hover:bg-primary/5 hover:border-primary/40 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-background/50 border border-border/20 flex items-center justify-center font-bold text-xs group-hover:bg-primary group-hover:text-black transition-all">
                        {asset[0]}
                      </div>
                      <span className="text-xs font-bold">{asset}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/50">2. SPECIFY PRIVATE AMOUNT</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    className="w-full bg-[#05080f]/60 border border-primary/20 rounded-2xl p-8 text-4xl font-black text-white focus:outline-none focus:border-primary/50 placeholder-white/10"
                    placeholder="0.00"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-primary font-bold tracking-widest bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl text-sm">
                    MAX_ALLOWED
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/50">3. EXECUTION CONFIRMATION</label>
                <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-8 rounded-2xl flex items-center justify-center gap-4 group text-lg transition-all shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                  <Zap size={24} className="group-hover:scale-125 transition-transform" />
                  INITIATE_CONFIDENTIAL_BORROW
                  <ArrowUpRight size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#05080f]/40 border border-border/40 rounded-3xl p-8 backdrop-blur-md space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/50 flex items-center gap-2">
              <ShieldAlert size={16} className="text-yellow-400" />
              Position_Risk_Audit
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[11px] border-b border-border/10 pb-4">
                <span className="text-foreground/40">Collateral (Encrypted)</span>
                <span className="font-bold flex items-center gap-2"><Lock size={12} /> Private</span>
              </div>
              <div className="flex justify-between items-center text-[11px] border-b border-border/10 pb-4">
                <span className="text-foreground/40">Projected Loan Value</span>
                <span className="font-bold">${Number(borrowAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] border-b border-border/10 pb-4">
                <span className="text-foreground/40">Expected Health Factor</span>
                <span className="font-bold text-primary">~1.92</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-foreground/40">Liquidation Price</span>
                <span className="font-bold">Private</span>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-6 group cursor-pointer hover:bg-primary/10 transition-colors">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                Learn_How_It_Works
              </h3>
              <ChevronRight size={16} className="text-primary group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[11px] text-foreground/60 leading-relaxed italic">
              Zama FHEVM allows you to borrow tokens against your collateral without ever revealing your debt amount to the blockchain. All verification including health factor checks happens inside the encrypted VM.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
