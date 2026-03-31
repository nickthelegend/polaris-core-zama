"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { AlertTriangle } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { usePolaris } from "@/hooks/use-polaris"
import { shouldShowWarning } from "@/lib/credit-utils"
import { ScoreGauge } from "@/components/credit/score-gauge"
import { RepayDialog } from "@/components/credit/repay-dialog"
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

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
  const { authenticated, getUserTotalCollateral, getCreditLine, getScore, getLoans } = usePolaris()

  const [collateral, setCollateral] = useState("0")
  const [creditLine, setCreditLine] = useState(0)
  const [score, setScore] = useState(300)
  const [loans, setLoans] = useState<Loan[]>([])
  const [repayOpen, setRepayOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Wire Convex queries for split plans and repayment history
  const splitPlans = useQuery(api.credit.getSplitPlans, address ? { userAddress: address } : "skip")
  const repaymentHistory = useQuery(api.credit.getRepaymentHistory, address ? { userAddress: address } : "skip")

  useEffect(() => {
    if (!authenticated) {
      setLoading(false)
      return
    }

    async function fetchData() {
      try {
        const [col, cl, sc, ln] = await Promise.all([
          getUserTotalCollateral(),
          getCreditLine(),
          getScore(),
          getLoans(),
        ])
        setCollateral(col)
        setCreditLine(cl)
        setScore(parseInt(sc, 10) || 300)
        setLoans(ln)
      } catch {
        // fallback values already set
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authenticated, getUserTotalCollateral, getCreditLine, getScore, getLoans])

  // Wallet not connected — show connection prompt
  if (!authenticated || !isConnected) {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center text-center font-mono">
        <div className="glass-card rounded-lg border border-primary/20 p-8 w-full max-w-sm flex flex-col items-center shadow-[0_0_30px_rgba(166,242,74,0.1)]">
          <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30 mb-6">
            <ConnectWalletButton />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-white mb-2 underline decoration-primary/20">
            AUTH_REQUIRED
          </h1>
          <p className="text-[10px] text-white/50 uppercase tracking-[0.1em] leading-relaxed max-w-[200px]">
            Connect your wallet to access the Polaris Credit Terminal.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[70dvh] flex flex-col items-center justify-center font-mono">
        <div className="size-12 rounded-full border-t-2 border-primary animate-spin" />
        <span className="mt-4 text-[10px] text-primary uppercase font-bold tracking-[0.3em] animate-pulse">
          Loading_Credit_Data...
        </span>
      </div>
    )
  }

  const showWarning = shouldShowWarning(score)
  const activeSplitPlans = splitPlans ?? []
  const repaymentRecords = repaymentHistory ?? []

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white font-mono p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tight">Credit Dashboard</h1>
        <Button
          onClick={() => setRepayOpen(true)}
          className="bg-purple-500/70 hover:bg-purple-500/90 text-white font-mono text-xs uppercase tracking-widest"
        >
          Repay
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Collateral Card */}
        <Card className="bg-[#0d0f14] border-border/30">
          <CardHeader>
            <CardTitle className="text-xs text-foreground/40 uppercase tracking-widest">
              Total Collateral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{parseFloat(collateral).toFixed(4)}</p>
          </CardContent>
        </Card>

        {/* Credit Line Card */}
        <Card className="bg-[#0d0f14] border-border/30">
          <CardHeader>
            <CardTitle className="text-xs text-foreground/40 uppercase tracking-widest">
              Available Credit Line
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{creditLine.toFixed(4)}</p>
            <p className="text-[10px] text-foreground/30 mt-1">90% LTV minus active debt</p>
          </CardContent>
        </Card>

        {/* Credit Score Card */}
        <Card className="bg-[#0d0f14] border-border/30">
          <CardHeader>
            <CardTitle className="text-xs text-foreground/40 uppercase tracking-widest">
              Credit Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ScoreGauge score={score} />
          </CardContent>
        </Card>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">
            Your credit score is below 400. You have limited credit access. Improve your score by making timely repayments.
          </p>
        </div>
      )}

      {/* Score Factors Breakdown */}
      <Card className="bg-[#0d0f14] border-border/30">
        <CardHeader>
          <CardTitle className="text-xs text-foreground/40 uppercase tracking-widest">
            Score Factors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Deposits", description: "Collateral deposited into protocol" },
              { label: "Repayments", description: "On-time loan repayments" },
              { label: "Credit Usage", description: "Percentage of credit line used" },
              { label: "Late Payments", description: "Missed or late payment events" },
            ].map((factor) => (
              <div key={factor.label} className="bg-white/5 rounded-lg p-3 border border-border/10">
                <p className="text-xs font-bold text-white">{factor.label}</p>
                <p className="text-[10px] text-foreground/30 mt-1">{factor.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active BNPL Loans Table */}
      <Card className="bg-[#0d0f14] border-border/30">
        <CardHeader>
          <CardTitle className="text-xs text-foreground/40 uppercase tracking-widest">
            Active BNPL Loans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <p className="text-xs text-foreground/30 text-center py-4">No active loans</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead className="text-foreground/40 text-xs">Loan ID</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Principal</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Interest</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Repaid</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id} className="border-border/10">
                    <TableCell className="text-white text-xs">#{loan.id}</TableCell>
                    <TableCell className="text-white text-xs">{parseFloat(loan.principal).toFixed(4)}</TableCell>
                    <TableCell className="text-white text-xs">{parseFloat(loan.interest).toFixed(4)}</TableCell>
                    <TableCell className="text-white text-xs">{parseFloat(loan.repaid).toFixed(4)}</TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={
                          loan.status === 0
                            ? "text-yellow-400"
                            : loan.status === 1
                              ? "text-green-400"
                              : "text-red-400"
                        }
                      >
                        {STATUS_LABELS[loan.status] ?? "Unknown"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active Split-in-3 Plans Table */}
      <Card className="bg-[#0d0f14] border-border/30">
        <CardHeader>
          <CardTitle className="text-xs text-foreground/40 uppercase tracking-widest">
            Active Split-in-3 Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSplitPlans.length === 0 ? (
            <p className="text-xs text-foreground/30 text-center py-4">No active split plans</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead className="text-foreground/40 text-xs">Loan ID</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Total</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Installments</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSplitPlans.map((plan) => {
                  const paidCount = plan.installments.filter((i) => i.status === "paid").length
                  const totalCount = plan.installments.length
                  return (
                    <TableRow key={plan._id} className="border-border/10">
                      <TableCell className="text-white text-xs">#{plan.loanId}</TableCell>
                      <TableCell className="text-white text-xs">{plan.totalAmount.toFixed(4)}</TableCell>
                      <TableCell className="text-white text-xs">
                        {plan.installments.map((inst) => (
                          <span
                            key={inst.index}
                            className={`inline-block mr-2 ${inst.status === "paid" ? "text-green-400" : inst.status === "overdue" ? "text-red-400" : "text-yellow-400"}`}
                          >
                            #{inst.index + 1}: {inst.amount.toFixed(2)} ({inst.status})
                          </span>
                        ))}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className={paidCount === totalCount ? "text-green-400" : "text-yellow-400"}>
                          {paidCount}/{totalCount} paid
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Repayment History Table */}
      <Card className="bg-[#0d0f14] border-border/30">
        <CardHeader>
          <CardTitle className="text-xs text-foreground/40 uppercase tracking-widest">
            Repayment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {repaymentRecords.length === 0 ? (
            <p className="text-xs text-foreground/30 text-center py-4">No repayment history</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/20">
                  <TableHead className="text-foreground/40 text-xs">Date</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Amount</TableHead>
                  <TableHead className="text-foreground/40 text-xs">Loan Type</TableHead>
                  <TableHead className="text-foreground/40 text-xs">TX Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repaymentRecords.map((record) => (
                  <TableRow key={record._id} className="border-border/10">
                    <TableCell className="text-white text-xs">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-white text-xs">{record.amount.toFixed(4)}</TableCell>
                    <TableCell className="text-white text-xs uppercase">{record.loanType}</TableCell>
                    <TableCell className="text-white text-xs font-mono truncate max-w-[120px]">
                      {record.txHash}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Repay Dialog */}
      <RepayDialog
        open={repayOpen}
        onOpenChange={setRepayOpen}
        loans={loans}
        splitPlans={activeSplitPlans}
        onRepaymentComplete={() => {
          // Refresh on-chain data after repayment
          // Convex queries (splitPlans, repaymentHistory) auto-refresh
          getUserTotalCollateral().then(setCollateral)
          getCreditLine().then(setCreditLine)
          getScore().then((s) => setScore(parseInt(s, 10) || 300))
          getLoans().then(setLoans)
        }}
      />
    </div>
  )
}
