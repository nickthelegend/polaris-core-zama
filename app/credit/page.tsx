"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import {
  AlertTriangle,
  ShieldCheck,
  Wallet,
  TrendingUp,
  CreditCard,
  Receipt,
  Zap,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { usePolaris } from "@/hooks/use-polaris"
import { shouldShowWarning } from "@/lib/credit-utils"
import { ScoreGauge } from "@/components/credit/score-gauge"
import { RepayDialog } from "@/components/credit/repay-dialog"
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button"

const STATUS_LABELS: Record<number, string> = {
  0: "Active",
  1: "Repaid",
  2: "Defaulted",
}

interface Loan {
  id: number
  principal: string
  interest: string
  totalDebt: string
  repaid: string
  startTime: number
  status: number
  poolToken: string
}

export default function CreditPage() {
  const { isConnected, address } = useAccount()
  const {
    authenticated,
    getUserTotalCollateral,
    getCreditLine,
    getScore,
    getLoans,
    getCreditLimit,
    getExternalNetValue,
  } = usePolaris()

  const [collateral, setCollateral] = useState("0")
  const [externalValue, setExternalValue] = useState("0")
  const [creditLine, setCreditLine] = useState(0)
  const [onChainLimit, setOnChainLimit] = useState("0")
  const [score, setScore] = useState(300)
  const [loans, setLoans] = useState<Loan[]>([])
  const [repayOpen, setRepayOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [splitPlansData, setSplitPlansData] = useState<any[]>([])
  const [repaymentData, setRepaymentData] = useState<any[]>([])

  const fetchAll = async () => {
    try {
      const [col, cl, sc, ln, limit] = await Promise.all([
        getUserTotalCollateral(),
        getCreditLine(),
        getScore(),
        getLoans(),
        getCreditLimit(),
      ])
      setCollateral(col)

      // Fetch external oracle value
      let extVal = "0"
      try { extVal = await getExternalNetValue() } catch {}
      setExternalValue(extVal)

      // Total effective collateral = native + external
      const totalEffective = parseFloat(col) + parseFloat(extVal)

      // Use the higher of: 90% LTV credit line OR on-chain ScoreManager limit
      const ltvCredit = cl
      const onChain = parseFloat(limit)
      setCreditLine(Math.max(ltvCredit, onChain))
      setScore(parseInt(sc, 10) || 300)
      setLoans(ln)
      setOnChainLimit(limit)

      if (address) {
        const [splitsRes, repaysRes] = await Promise.all([
          fetch(`/api/credit/split-plans?userAddress=${address}`).then(r => r.json()).catch(() => ({ plans: [] })),
          fetch(`/api/credit/repayments?userAddress=${address}`).then(r => r.json()).catch(() => ({ records: [] })),
        ])
        setSplitPlansData(splitsRes.plans || [])
        setRepaymentData(repaysRes.records || [])
      }
    } catch {
      // fallback values already set
    }
  }

  useEffect(() => {
    if (!authenticated) { setLoading(false); return }
    fetchAll().finally(() => setLoading(false))
  }, [authenticated, address])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }

  // Wallet not connected
  if (!authenticated || !isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 font-mono">
        <div className="glass-card rounded-lg border border-primary/20 p-10 flex flex-col items-center gap-6 shadow-[0_0_30px_rgba(166,242,74,0.08)]">
          <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
            <Wallet className="size-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter text-white mb-2">AUTH_REQUIRED</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] max-w-[220px] leading-relaxed">
              Connect your wallet to access the Polaris Credit Terminal.
            </p>
          </div>
          <ConnectWalletButton />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 font-mono">
        <Loader2 className="size-10 text-primary animate-spin" />
        <span className="mt-4 text-[10px] text-primary uppercase font-bold tracking-[0.3em] animate-pulse">
          Loading_Credit_Data...
        </span>
      </div>
    )
  }

  const showWarning = shouldShowWarning(score)
  const activeLoans = loans.filter(l => l.status === 0)
  const activeSplitPlans = splitPlansData
  const repaymentRecords = repaymentData

  return (
    <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] tracking-[0.4em] text-primary/60 uppercase">Credit_Engine // Terminal_Access</span>
          <h1 className="text-3xl tracking-tighter font-black uppercase">Credit Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-all disabled:opacity-40"
          >
            <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={() => setRepayOpen(true)}
            className="flex items-center gap-2 bg-purple-500/70 hover:bg-purple-500/90 rounded-xl px-5 py-2.5 text-[10px] uppercase tracking-widest font-black transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            <CreditCard className="size-3.5" />
            Repay
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 animate-in fade-in">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold">
            Score below 400 — Limited credit access. Improve by making timely repayments.
          </p>
        </div>
      )}

      {/* Stats Bar */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden shadow-2xl">
        <div className="bg-white/5 px-5 py-2.5 border-b border-white/10 flex justify-between items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Credit_Metrics</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(166,242,74,0.5)] animate-pulse" />
            <span className="text-[9px] text-primary/60 uppercase tracking-widest">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
          {/* Collateral */}
          <div className="p-5 flex flex-col gap-1 relative group">
            <span className="text-[10px] text-white/40 tracking-wider uppercase">Total_Collateral</span>
            <div className="flex items-baseline gap-2">
              <span className="text-white text-2xl font-bold tracking-tighter">
                {(parseFloat(collateral) + parseFloat(externalValue)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[9px] text-white/20 uppercase tracking-tighter">
              {parseFloat(collateral) > 0 ? `Native: ${parseFloat(collateral).toFixed(2)} + ` : ""}
              Oracle: {parseFloat(externalValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <ShieldCheck className="absolute bottom-2 right-2 w-8 h-8 text-primary/5 group-hover:text-primary/10 transition-colors" />
          </div>

          {/* Credit Line (90% LTV) */}
          <div className="p-5 flex flex-col gap-1 relative group">
            <span className="text-[10px] text-white/40 tracking-wider uppercase">Available_Credit</span>
            <div className="flex items-baseline gap-2">
              <span className="text-primary text-2xl font-bold tracking-tighter">
                {creditLine.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[9px] text-white/20 uppercase tracking-tighter">Borrowing power</span>
            <TrendingUp className="absolute bottom-2 right-2 w-8 h-8 text-primary/5 group-hover:text-primary/10 transition-colors" />
          </div>

          {/* On-Chain Limit */}
          <div className="p-5 flex flex-col gap-1 relative group">
            <span className="text-[10px] text-white/40 tracking-wider uppercase">On-Chain_Limit</span>
            <div className="flex items-baseline gap-2">
              <span className="text-blue-400 text-2xl font-bold tracking-tighter">
                {parseFloat(onChainLimit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[9px] text-white/20 uppercase tracking-tighter">ScoreManager limit</span>
            <Zap className="absolute bottom-2 right-2 w-8 h-8 text-blue-500/5 group-hover:text-blue-500/10 transition-colors" />
          </div>

          {/* Credit Score */}
          <div className="p-5 flex flex-col gap-1 items-center justify-center">
            <ScoreGauge score={score} />
          </div>
        </div>
      </div>

      {/* Score Factors */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden">
        <div className="bg-white/5 px-5 py-2.5 border-b border-white/10">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Score_Factors</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
          {[
            { label: "Deposits", desc: "Collateral deposited", icon: "🏦" },
            { label: "Repayments", desc: "On-time repayments", icon: "✅" },
            { label: "Credit Usage", desc: "% of credit used", icon: "📊" },
            { label: "Late Payments", desc: "Missed payments", icon: "⚠️" },
          ].map((f) => (
            <div key={f.label} className="bg-[#0d0f14] p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{f.icon}</span>
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">{f.label}</span>
              </div>
              <span className="text-[9px] text-white/30 tracking-wider">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active BNPL Loans */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden">
        <div className="bg-white/5 px-5 py-2.5 border-b border-white/10 flex justify-between items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Active_BNPL_Loans</span>
          <span className="text-[9px] text-primary/50 font-bold">{activeLoans.length} active</span>
        </div>
        {loans.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[10px] text-white/20 uppercase tracking-widest">No loans found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">ID</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Principal</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Interest</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Repaid</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-xs text-white font-bold">#{loan.id}</td>
                    <td className="px-5 py-3 text-xs text-white font-bold tracking-tighter">{parseFloat(loan.principal).toFixed(4)}</td>
                    <td className="px-5 py-3 text-xs text-white/60">{parseFloat(loan.interest).toFixed(4)}</td>
                    <td className="px-5 py-3 text-xs text-primary font-bold">{parseFloat(loan.repaid).toFixed(4)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                        loan.status === 0
                          ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                          : loan.status === 1
                            ? "border-green-500/30 text-green-400 bg-green-500/10"
                            : "border-red-500/30 text-red-400 bg-red-500/10"
                      }`}>
                        {STATUS_LABELS[loan.status] ?? "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Split-in-3 Plans */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden">
        <div className="bg-white/5 px-5 py-2.5 border-b border-white/10 flex justify-between items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Split-in-3_Plans</span>
          <span className="text-[9px] text-primary/50 font-bold">{activeSplitPlans.length} plans</span>
        </div>
        {activeSplitPlans.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[10px] text-white/20 uppercase tracking-widest">No split plans</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Loan</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Total</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Installments</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Progress</th>
                </tr>
              </thead>
              <tbody>
                {activeSplitPlans.map((plan: any) => {
                  const paidCount = plan.installments?.filter((i: any) => i.status === "paid").length || 0
                  const totalCount = plan.installments?.length || 3
                  return (
                    <tr key={plan._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-xs text-white font-bold">#{plan.loanId}</td>
                      <td className="px-5 py-3 text-xs text-white font-bold tracking-tighter">{plan.totalAmount?.toFixed(4)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          {plan.installments?.map((inst: any) => (
                            <span key={inst.index} className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${
                              inst.status === "paid"
                                ? "border-green-500/30 text-green-400 bg-green-500/10"
                                : inst.status === "overdue"
                                  ? "border-red-500/30 text-red-400 bg-red-500/10"
                                  : "border-white/10 text-white/40 bg-white/5"
                            }`}>
                              #{inst.index + 1}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold ${paidCount === totalCount ? "text-green-400" : "text-yellow-400"}`}>
                          {paidCount}/{totalCount}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Repayment History */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden">
        <div className="bg-white/5 px-5 py-2.5 border-b border-white/10 flex justify-between items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Repayment_History</span>
          <Receipt className="size-4 text-white/20" />
        </div>
        {repaymentRecords.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[10px] text-white/20 uppercase tracking-widest">No repayment history</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Date</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Amount</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">Type</th>
                  <th className="text-left px-5 py-3 text-[9px] text-white/30 uppercase tracking-widest font-bold">TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {repaymentRecords.map((record: any) => (
                  <tr key={record._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-xs text-white/60">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-xs text-white font-bold tracking-tighter">{record.amount?.toFixed(4)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                        record.loanType === "split3"
                          ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                          : "border-purple-500/30 text-purple-400 bg-purple-500/10"
                      }`}>
                        {record.loanType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[10px] text-white/40 font-mono truncate max-w-[140px]">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {record.txHash?.slice(0, 10)}...{record.txHash?.slice(-6)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Repay Dialog */}
      <RepayDialog
        open={repayOpen}
        onOpenChange={setRepayOpen}
        loans={loans}
        splitPlans={activeSplitPlans}
        onRepaymentComplete={handleRefresh}
      />
    </div>
  )
}
