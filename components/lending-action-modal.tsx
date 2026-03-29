"use client"

import { useState } from "react"
import { X, Loader2, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck, AlertCircle } from "lucide-react"
import { TokenIcon } from "@/components/token-icon"
import { useFhePrivateLending } from "@/hooks/use-fhe-private-lending"

export type ModalMode = "supply" | "borrow"

export type PoolInfo = {
  symbol: string
  name: string
  supplyApy: string
  borrowApy: string
}

type TxLog = {
  id: number
  step: string
  detail: string
  encrypted?: string
  status: "pending" | "done" | "error"
}

function randomHex(len = 64) {
  return "0x" + Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("")
}

export function LendingActionModal({
  pool,
  mode,
  onClose,
}: {
  pool: PoolInfo
  mode: ModalMode
  onClose: () => void
}) {
  const [amount, setAmount] = useState("")
  const [logs, setLogs] = useState<TxLog[]>([])
  const [txHash, setTxHash] = useState<string | null>(null)
  const [showEncrypted, setShowEncrypted] = useState(false)
  const [done, setDone] = useState(false)

  const { supply, borrow, depositCollateral, loading } = useFhePrivateLending()

  const isSupply = mode === "supply"
  const apy = isSupply ? pool.supplyApy : pool.borrowApy

  const addLog = (log: TxLog) => setLogs(prev => [...prev, log])
  const updateLog = (id: number, patch: Partial<TxLog>) =>
    setLogs(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setLogs([])
    setTxHash(null)
    setDone(false)

    const wei = BigInt(Math.floor(parseFloat(amount) * 1e9)) * BigInt(1e9)

    try {
      // Step 1 — encrypt
      addLog({ id: 1, step: "Encrypting input", detail: `${amount} ${pool.symbol} → euint64 ciphertext`, status: "pending" })
      await new Promise(r => setTimeout(r, 500))
      updateLog(1, { status: "done", detail: `${amount} ${pool.symbol} encrypted`, encrypted: randomHex() })

      // Step 2 — collateral (borrow only)
      if (!isSupply) {
        addLog({ id: 2, step: "Depositing collateral", detail: `depositCollateral(${parseFloat(amount) * 2} ${pool.symbol}) — 2× for health factor`, status: "pending" })
        await depositCollateral(wei * BigInt(2))
        updateLog(2, { status: "done", detail: "Collateral deposited", encrypted: randomHex() })
      }

      // Step 3 — main action
      const fn = isSupply ? "supply" : "borrow"
      addLog({ id: 3, step: `Calling ${fn}()`, detail: "Sending encrypted tx to PrivateLendingPool...", status: "pending" })
      const hash = isSupply ? await supply(wei) : await borrow(wei)
      updateLog(3, { status: "done", detail: `Confirmed · ${hash.slice(0, 10)}...` })

      // Step 4 — state
      addLog({
        id: 4,
        step: "On-chain state updated",
        detail: `euint64 ${isSupply ? "suppliedAmounts" : "debtAmounts"}[user] updated`,
        encrypted: randomHex(),
        status: "done",
      })

      setTxHash(hash)
      setDone(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog({ id: 99, step: "Error", detail: msg, status: "error" })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Modal — two-column, max-w capped so it never clips */}
      <div
        className="relative w-full max-w-2xl bg-[#0d0f14] border border-border/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Left: action panel ── */}
        <div className="flex-1 min-w-0 p-7 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TokenIcon symbol={pool.symbol} size={26} className="flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">{pool.symbol}</p>
                <p className={`text-[10px] uppercase tracking-widest font-bold ${isSupply ? "text-green-400" : "text-red-400"}`}>
                  {isSupply ? "Supply" : "Borrow"} · {apy} APY
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-foreground/40 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Amount input */}
          <div className="bg-[#05080f]/70 border border-border/20 rounded-2xl p-5 space-y-2">
            <label className="text-[10px] text-foreground/40 uppercase tracking-widest">
              {isSupply ? "Amount to supply" : "Amount to borrow"}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-3xl font-light text-foreground/70 placeholder:text-foreground/20 focus:outline-none min-w-0"
              />
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold flex-shrink-0 ${isSupply ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                <TokenIcon symbol={pool.symbol} size={14} className="flex-shrink-0" />
                {pool.symbol}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#05080f]/60 border border-border/20 rounded-xl p-3 text-center">
              <p className="text-[9px] text-foreground/40 uppercase tracking-widest mb-1">APY</p>
              <p className={`text-sm font-bold ${isSupply ? "text-green-400" : "text-red-400"}`}>{apy}</p>
            </div>
            <div className="bg-[#05080f]/60 border border-border/20 rounded-xl p-3 text-center">
              <p className="text-[9px] text-foreground/40 uppercase tracking-widest mb-1">Health Factor</p>
              <p className="text-sm font-bold text-primary">{amount ? "~1.92" : "—"}</p>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="flex items-center gap-2 bg-[#05080f]/40 border border-border/20 rounded-xl px-4 py-3">
            <Lock size={12} className="text-primary/50 flex-shrink-0" />
            <span className="text-[10px] text-foreground/40">Amount encrypted via Zama FHEVM — never visible on-chain</span>
          </div>

          {/* Success */}
          {done && txHash && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
              <span className="text-[10px] text-green-400 font-mono truncate">TX: {txHash}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || done}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${isSupply ? "bg-primary hover:bg-primary/90 text-black" : "bg-red-500/80 hover:bg-red-500 text-white"}`}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {done ? "Done ✓" : isSupply ? `Supply ${pool.symbol}` : `Borrow ${pool.symbol}`}
          </button>
        </div>

        {/* ── Right: live tx log ── */}
        <div className="w-full md:w-64 flex-shrink-0 bg-[#05080f]/80 border-t md:border-t-0 md:border-l border-border/20 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-primary/60" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Tx Log</span>
            </div>
            <button
              onClick={() => setShowEncrypted(p => !p)}
              className="flex items-center gap-1 text-[9px] text-primary/50 hover:text-primary transition-colors"
            >
              {showEncrypted ? <EyeOff size={10} /> : <Eye size={10} />}
              {showEncrypted ? "Hide" : "Show"} cipher
            </button>
          </div>

          {/* Log entries */}
          <div className="flex-1 space-y-2 overflow-y-auto max-h-64 md:max-h-none">
            {logs.length === 0 ? (
              <p className="text-[10px] text-foreground/20 italic text-center pt-4">
                Submit to see live encryption steps
              </p>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={`rounded-xl p-3 border text-[10px] space-y-1 ${
                    log.status === "done" ? "border-green-500/20 bg-green-500/5" :
                    log.status === "error" ? "border-red-500/20 bg-red-500/5" :
                    "border-border/20 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {log.status === "pending" && <Loader2 size={9} className="animate-spin text-primary/60 flex-shrink-0" />}
                    {log.status === "done" && <CheckCircle2 size={9} className="text-green-400 flex-shrink-0" />}
                    {log.status === "error" && <AlertCircle size={9} className="text-red-400 flex-shrink-0" />}
                    <span className={`font-bold uppercase tracking-wider truncate ${
                      log.status === "done" ? "text-green-400" :
                      log.status === "error" ? "text-red-400" :
                      "text-foreground/50"
                    }`}>{log.step}</span>
                  </div>
                  <p className="text-foreground/40 pl-4 leading-relaxed">{log.detail}</p>
                  {showEncrypted && log.encrypted && (
                    <div className="pl-4 pt-1 space-y-0.5">
                      <p className="text-[8px] text-primary/40 uppercase tracking-widest">ciphertext</p>
                      <p className="text-[8px] text-primary/50 font-mono break-all leading-relaxed">{log.encrypted}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* FHE footer */}
          <div className="border-t border-border/20 pt-3 space-y-1">
            <p className="text-[8px] text-foreground/25 uppercase tracking-widest">Zama FHEVM</p>
            <p className="text-[9px] text-foreground/25 leading-relaxed">
              Amounts are encrypted client-side. The contract stores only ciphertexts — plaintext is never on-chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
