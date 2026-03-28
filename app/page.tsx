"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  Zap,
  History,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react"

import { LandingPage } from "@/components/landing-page"
import { useObolusWallet } from "@/lib/hooks/useObolusWallet"
import { useObolus } from "@/hooks/use-obolus"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"

export default function Page() {
  const { connected: authenticated, address } = useObolusWallet()

  const { getCreditLimit, getLoans, loading: obolusLoading } = useObolus()
  const transactions = useQuery(api.merchants.listTransactions, { userAddress: address || "" }) ?? []

  const [realStats, setRealStats] = useState({
    limit: 200,
    used: 0,
    available: 200,
    pct: 0,
    nextDue: "N/A",
    minDue: "0.00"
  })

  useEffect(() => {
    if (authenticated && address) {
      const updateStats = async () => {
        try {
          const limit = await getCreditLimit()
          const loans = await getLoans()

          let totalUsed = 0
          let earliestNextDue = "N/A"
          let minDue = 0

          loans.forEach((l: any) => {
            if (l.status === 0) { // Active
              const outstanding = parseFloat(l.principal) - parseFloat(l.repaid)
              totalUsed += outstanding
              minDue += outstanding * 0.25

              const dueDate = new Date(l.startTime * 1000 + 14 * 24 * 60 * 60 * 1000)
              earliestNextDue = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
          })

          const totalLimit = parseFloat(limit) + totalUsed
          const available = parseFloat(limit)
          const usagePct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0

          setRealStats({
            limit: totalLimit,
            used: totalUsed,
            available: available,
            pct: usagePct,
            nextDue: earliestNextDue,
            minDue: minDue.toFixed(2)
          })
        } catch (e) {
          console.error("Failed to update terminal stats:", e)
        }
      }
      updateStats()
    }
  }, [authenticated, address, getCreditLimit, getLoans, transactions])

  if (!authenticated) {
    return <LandingPage />
  }

  const { limit: total, used, available, pct } = realStats

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono">
      <div className="lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-[0.2em] text-foreground/50 uppercase">
            Credit Analytics // Terminal
          </h2>
          <div className="flex items-center gap-2 px-2 py-0.5 rounded border border-primary/30 bg-primary/5 text-[10px] text-primary font-bold tracking-wider uppercase">
            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            Active_Session
          </div>
        </div>

        <div className="bg-card/20 border border-border/40 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-foreground/50 uppercase tracking-widest mb-1">Available Liquidity</div>
                <div className="text-5xl font-bold tracking-tight text-foreground">
                  ${available.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-foreground/30 uppercase mt-2">
                  Sys_Total_Limit: ${total.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="text-[10px] text-foreground/50 uppercase tracking-widest">Utilization_Rate</div>
                <div className="text-sm font-bold text-primary">{pct}%</div>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden border border-border/20">
                <div
                  className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-foreground/40 uppercase">
                <span>Debt: ${(used).toFixed(2)}</span>
                <span>Buffer: ${available.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border/20">
            <div className="text-[10px] text-foreground/50 uppercase tracking-widest mb-4">Upcoming Obligations</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-background/40 border border-border/30 rounded-xl p-4">
                <div className="text-[9px] text-foreground/40 uppercase mb-2">Next Settlement</div>
                <div className="text-sm font-bold">{realStats.nextDue}</div>
              </div>
              <div className="bg-background/40 border border-border/30 rounded-xl p-4">
                <div className="text-[9px] text-foreground/40 uppercase mb-2">Minimum Due</div>
                <div className="text-sm font-bold text-primary">${realStats.minDue}</div>
              </div>
              <div className="bg-background/40 border border-border/30 rounded-xl p-4">
                <div className="text-[9px] text-foreground/40 uppercase mb-2">Accrued Interest</div>
                <div className="text-sm font-bold">0.00% APR</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card/20 border border-border/40 rounded-2xl p-6 backdrop-blur-sm">
          <div className="text-[10px] text-foreground/50 uppercase tracking-widest mb-6">Network Nodes & Partners</div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-6 pb-2">
              {[
                { name: "Zomato", logo: "/logos/zomato.svg" },
                { name: "Swiggy", logo: "/logos/swiggy.png" },
                { name: "Uber", logo: "/logos/uber.svg" },
                { name: "Netflix", logo: "/logos/netflix.svg" },
                { name: "Spotify", logo: "/logos/spotify.svg" },
                { name: "Google", logo: "/logos/google.svg" },
                { name: "Microsoft", logo: "/logos/microsoft.svg" },
                { name: "Amazon", logo: "/logos/amazon.svg" },
                { name: "Apple", logo: "/logos/apple.png" },
              ].map((partner, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary/50 border border-border/30 flex items-center justify-center grayscale hover:grayscale-0 transition-all cursor-pointer overflow-hidden p-2"
                >
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={32}
                    height={32}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className="bg-card/20 border border-border/40 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <div className="text-[10px] text-foreground/50 uppercase tracking-widest mb-2">Quick Actions</div>
          <Link href="/merchants" className="block">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-xl flex items-center justify-center gap-3 group">
              <Zap className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
              <span>EXECUTE_PAYMENT</span>
            </Button>
          </Link>
          <Link href="/transactions" className="block">
            <Button variant="secondary" className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-bold py-6 rounded-xl flex items-center justify-center gap-3">
              <History className="w-5 h-5" />
              <span>QUERY_HISTORY</span>
            </Button>
          </Link>
          <Link href="/limits" className="block">
            <Button variant="secondary" className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-bold py-6 rounded-xl flex items-center justify-center gap-3">
              <ArrowUpRight className="w-5 h-5" />
              <span>LIMIT_EXPANSION</span>
            </Button>
          </Link>
        </div>

        <div className="bg-card/20 border border-border/40 rounded-2xl p-6 backdrop-blur-sm flex flex-col h-full min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[10px] text-foreground/50 uppercase tracking-widest">Activity Stream</div>
            <div className="flex items-center gap-1.5 text-[10px] text-foreground/30 uppercase">
              Live
              <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            </div>
          </div>

          <div className="space-y-6 flex-grow">
            {transactions.length > 0 ? (
              transactions.slice(0, 5).map((tx: any, i: number) => (
                <div key={i} className="flex gap-4 group cursor-pointer">
                  <div className="w-0.5 bg-primary/20 group-hover:bg-primary transition-colors" />
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-foreground/90 flex items-center gap-2">
                      TX_{(tx.txHash || tx._id).substring(2, 8).toUpperCase()}_AUTH
                      {tx.category === 'repayment' && <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded">REPAY</span>}
                    </div>
                    <div className="text-[11px] text-foreground/50">
                      {tx.title} // -${parseFloat(tx.amount || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="ml-auto text-[10px] text-foreground/20 whitespace-nowrap">
                    {formatDistanceToNow(new Date(tx._creationTime), { addSuffix: true }).toUpperCase()}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                <History className="w-8 h-8 mb-2" />
                <span className="text-[10px] uppercase tracking-widest">No Recent Activity</span>
              </div>
            )}
          </div>

          <Link href="/transactions" className="mt-8 text-[10px] text-foreground/40 uppercase hover:text-primary transition-colors flex items-center gap-2 group">
            View Full Manifest
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}
