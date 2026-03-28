"use client"

import { ConnectGate } from "@/components/connect-gate"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useObolusWallet } from "@/lib/hooks/useObolusWallet"
import {
  ShoppingBag,
  Tv,
  Globe,
  Smartphone,
  FlashlightIcon as Bolt,
  Lightbulb,
  Info,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  Database,
  Repeat,
  ExternalLink,
  ShieldCheck,
  Clock
} from "lucide-react"
import Link from "next/link"
import { NETWORKS } from "@/lib/contracts"

export default function TransactionsPage() {
  const { address } = useObolusWallet()

  const rawTransactions = useQuery(api.merchants.listTransactions, { userAddress: address }) ?? []
  const bills = useQuery(api.merchants.listBills, { userAddress: address }) ?? []
  const deposits = useQuery(api.merchants.listDeposits, { userAddress: address }) ?? []
  const bridges = useQuery(api.merchants.listBridges, { userAddress: address }) ?? []

  // Combine all activity into one list for the main feed
  const combinedActivity = [
    ...rawTransactions.map((t: any) => ({ ...t, type: 'transaction', icon: <ShoppingBag className="w-5 h-5" />, color: 'text-blue-400' })),
    ...deposits.map((d: any) => ({ ...d, type: 'deposit', title: 'Pool Deposit', icon: <Database className="w-5 h-5" />, color: 'text-green-400' })),
    ...bridges.map((b: any) => ({ ...b, type: 'bridge', title: 'Cross-chain Bridge', icon: <Repeat className="w-5 h-5" />, color: 'text-purple-400' }))
  ].sort((a, b) => (b._creationTime || 0) - (a._creationTime || 0));

  const monthlySpend = rawTransactions
    .filter((t: any) => t.category === "spend" || t.category === "repayment")
    .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0)

  const upcomingBillsTotal = bills
    .reduce((acc: number, b: any) => acc + Number(b.amount || 0), 0)

  const getExplorerLink = (item: any) => {
    if (item.type === 'deposit') {
      if (item.hubTxHash) {
        return `${NETWORKS.USC.explorer}/tx/${item.hubTxHash}`;
      }
      return `${NETWORKS.SEPOLIA.explorer}/tx/${item.txHash}`;
    }
    if (item.type === 'bridge') {
      return `${NETWORKS.SEPOLIA.explorer}/tx/${item.txHash}`;
    }
    return `${NETWORKS.USC.explorer}/tx/${item.txHash || '0x'}`;
  }

  return (
    <ConnectGate>
      <div className="flex flex-col gap-8 py-8 font-mono">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
          <div className="glass-card rounded-2xl p-8 border-l-4 border-l-primary/40 relative overflow-hidden group">
            <p className="text-foreground/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Monthly Spend</p>
            <div className="flex items-baseline gap-2">
              <h1 className="text-white text-5xl font-black tracking-tighter tabular-nums">
                {monthlySpend.toFixed(2)}
              </h1>
              <span className="text-primary font-bold text-xs tracking-widest uppercase">USDC</span>
            </div>
            <TrendingDown className="absolute -bottom-2 -right-2 w-16 h-16 text-primary/5 group-hover:text-primary/10 transition-colors" />
          </div>

          <div className="glass-card rounded-2xl p-8 border-l-4 border-l-white/10 relative overflow-hidden group">
            <p className="text-foreground/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Total Upcoming Bills</p>
            <div className="flex items-baseline gap-2">
              <h1 className="text-white text-5xl font-black tracking-tighter tabular-nums">
                {upcomingBillsTotal.toFixed(2)}
              </h1>
              <span className="text-white/30 font-bold text-xs tracking-widest uppercase">USDC</span>
            </div>
            <ArrowUpRight className="absolute -bottom-2 -right-2 w-16 h-16 text-white/5 group-hover:text-white/10 transition-colors" />
          </div>

          <div className="lg:col-span-1 md:col-span-2">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-xs flex items-center gap-2 tracking-wider">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  NETWORK STATUS
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[10px]">USC_HUB:</span>
                  <span className="text-green-400 text-[10px] font-black uppercase flex items-center gap-1">Online <div className="size-1 rounded-full bg-green-400 animate-pulse" /></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 text-[10px]">ETH_SPOKE:</span>
                  <span className="text-green-400 text-[10px] font-black uppercase flex items-center gap-1">Online <div className="size-1 rounded-full bg-green-400 animate-pulse" /></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <section className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-white text-lg font-bold tracking-tight uppercase tracking-wider">Recent Activity</h2>
              <div className="flex gap-2">
                <span className="text-[9px] text-white/20 uppercase tracking-widest">Aggregated from USC Substrate & EVM Spokes</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {combinedActivity.length === 0 && (
                <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center border-dashed border-white/5">
                  <Clock className="w-12 h-12 text-white/10 mb-4" />
                  <p className="text-white/20 text-xs uppercase tracking-widest font-black">No transaction history found</p>
                </div>
              )}
              {combinedActivity.map((t: any, i: number) => (
                <div
                  key={i}
                  className="glass-card rounded-xl p-5 flex items-center justify-between hover:bg-white/[0.04] transition-all group border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-5">
                    <div className={`size-12 rounded-xl bg-white/5 flex items-center justify-center ${t.color} group-hover:scale-110 transition-transform shadow-lg shadow-black/20`}>
                      {t.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm tracking-tight">{t.title}</span>
                        {t.hubTxHash && (
                          <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-black tracking-widest uppercase">
                            Cross-Chain
                          </span>
                        )}
                        {t.status === 'COMPLETED' || t.status === 'Synced' || t.status === 'VERIFIED' ? (
                          <ShieldCheck className="w-3 h-3 text-green-400" />
                        ) : t.status === 'PENDING' || t.status === 'DETECTED' || t.status === 'ProofGenerated' ? (
                          <Clock className="w-3 h-3 text-primary animate-pulse" />
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-[10px] text-white/30 uppercase font-black tabular-nums">{new Date(t._creationTime).toLocaleDateString()}</span>
                        <Link
                          href={getExplorerLink(t)}
                          target="_blank"
                          className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 font-bold underline decoration-primary/20 underline-offset-2"
                        >
                          {t.type === 'transaction' ? 'EXPLORER' : 'SOURCE'} <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                        {t.hubTxHash && (
                          <Link
                            href={`${NETWORKS.USC.explorer}/tx/${t.hubTxHash}`}
                            target="_blank"
                            className="text-[10px] text-green-400/80 hover:text-green-400 flex items-center gap-1 font-bold underline decoration-green-400/20 underline-offset-2"
                          >
                            HUB_SYNC <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-white font-black text-xl tabular-nums tracking-tighter">
                        {t.type === 'deposit' || t.type === 'bridge' ? '+' : '-'}
                        {Number(t.amount || 0).toFixed(2)}
                      </span>
                      <span className="text-white/30 text-[10px] font-black uppercase mt-1">USDC</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${t.type === 'deposit' ? 'text-green-500/50' : t.type === 'bridge' ? 'text-purple-500/40' : 'text-blue-500/40'}`}>
                      {t.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="lg:col-span-5 flex flex-col gap-8">
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-white text-lg font-bold tracking-tight uppercase tracking-wider">Scheduled Bills</h2>
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase border border-primary/20 tracking-tighter">
                  Auto-Pay
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {bills.map((b: any, i: number) => (
                  <div
                    key={i}
                    className={`glass-card rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.04] transition-all group cursor-pointer border-l-2 ${i === 0 ? 'border-l-primary shadow-[0_0_20px_rgba(var(--primary),0.05)]' : 'border-l-white/20'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
                        {b.title.toLowerCase().includes("streaming") && <Bolt className="w-5 h-5" />}
                        {b.title.toLowerCase().includes("phone") && <Smartphone className="w-5 h-5" />}
                        {!["streaming", "phone"].some(w => b.title.toLowerCase().includes(w)) && <Info className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-white font-black block leading-tight tracking-tight">{b.title.split(" — ")[0]}</span>
                        <span className={`${i === 0 ? 'text-primary' : 'text-foreground/40'} text-[10px] font-bold uppercase tracking-widest`}>
                          {b.title.split(" — ")[1] || "Subscription"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-black text-lg tabular-nums">{b.amount}</span>
                      <span className="text-white/30 text-[10px] font-bold ml-1 uppercase">{b.asset}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card rounded-2xl p-6 border border-white/5">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Block Explorers
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <Link
                  href={NETWORKS.USC.explorer}
                  target="_blank"
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-primary/20 flex items-center justify-center text-primary font-black text-[10px]">USC</div>
                    <span className="text-white text-[11px] font-bold tracking-tight">Creditcoin USC Testnet 2</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-primary transition-colors" />
                </Link>
                <Link
                  href={NETWORKS.SEPOLIA.explorer}
                  target="_blank"
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-[10px]">ETH</div>
                    <span className="text-white text-[11px] font-bold tracking-tight">Ethereum Sepolia</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-blue-400 transition-colors" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ConnectGate>
  )
}
