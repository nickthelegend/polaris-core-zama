"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Info, Loader2, CheckCircle2, ExternalLink, ShieldCheck, AlertTriangle } from "lucide-react"
import { TokenIcon } from "@/components/token-icon"
import { usePolaris } from "@/hooks/use-polaris"
import { CONTRACTS, ABIS, NETWORKS } from "@/lib/contracts"
import { ethers } from "ethers"

// Token metadata: decimals and max per request (10% of 1B)
const FAUCET_TOKENS = [
  { symbol: "WETH", decimals: 18, max: 100_000_000 },
  { symbol: "USDC", decimals: 6,  max: 100_000_000 },
  { symbol: "WBTC", decimals: 8,  max: 100_000_000 },
  { symbol: "BNB",  decimals: 18, max: 100_000_000 },
]

const TOKEN_ADDRESSES: Record<string, string> = {
  WETH: CONTRACTS.MOCK_TOKENS.LOCALHOST.WETH,
  USDC: CONTRACTS.MOCK_TOKENS.LOCALHOST.USDC,
  WBTC: CONTRACTS.MOCK_TOKENS.LOCALHOST.WBTC,
  BNB:  CONTRACTS.MOCK_TOKENS.LOCALHOST.BNB,
}

function TokenDropdown({ options, value, onChange }: {
  options: typeof FAUCET_TOKENS
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.symbol === value) ?? options[0]
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 bg-[#1a1d24] border border-border/40 hover:border-primary/40 rounded-xl px-3 py-2.5 transition-colors min-w-[110px]">
        <TokenIcon symbol={selected.symbol} size={20} className="flex-shrink-0" />
        <span className="text-sm font-semibold text-white">{selected.symbol}</span>
        <ChevronDown size={13} className={`text-foreground/40 transition-transform ml-auto ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#0d0f14] border border-border/40 rounded-xl overflow-hidden shadow-2xl min-w-[140px]">
          {options.map(opt => (
            <button key={opt.symbol} type="button" onClick={() => { onChange(opt.symbol); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-primary/10 transition-colors text-left">
              <TokenIcon symbol={opt.symbol} size={20} className="flex-shrink-0" />
              <span className="text-sm text-white">{opt.symbol}</span>
              {opt.symbol === value && <Check size={12} className="text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FaucetPage() {
  const [token, setToken] = useState("USDC")
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [txHash, setTxHash] = useState("")
  const [errMsg, setErrMsg] = useState("")

  const selected = FAUCET_TOKENS.find(t => t.symbol === token) ?? FAUCET_TOKENS[0]
  const { getContract, address } = usePolaris()

  // Validate amount against max cap
  const parsedAmount = parseFloat(amount)
  const isOverMax = !isNaN(parsedAmount) && parsedAmount > selected.max
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && !isOverMax

  const handleDispense = async () => {
    if (!address) { setErrMsg("Connect your wallet first"); setStatus("error"); return }
    if (!isValid) { setErrMsg(`Enter an amount between 1 and ${selected.max.toLocaleString()}`); setStatus("error"); return }

    const tokenAddress = TOKEN_ADDRESSES[token]
    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
      setErrMsg("Token not deployed. Run: npm run deploy:tokens in polaris-protocol")
      setStatus("error")
      return
    }

    setStatus("loading"); setErrMsg("")
    try {
      const contract = await getContract(tokenAddress, ABIS.MockERC20, NETWORKS.LOCAL_HARDHAT.id)
      // Convert human amount to raw units based on token decimals
      const rawAmount = ethers.parseUnits(parsedAmount.toString(), selected.decimals)
      const tx = await contract.faucet(rawAmount)
      const receipt = await tx.wait()
      setTxHash(receipt.hash)
      setStatus("success")
      setAmount("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes("unsupported") || msg.toLowerCase().includes("chain")) {
        setErrMsg("Switch MetaMask to Hardhat Local (chainId 31337, RPC http://127.0.0.1:8545)")
      } else if (msg.includes("Exceeds 10%")) {
        setErrMsg(`Max is ${selected.max.toLocaleString()} ${token} per request (10% of 1B)`)
      } else {
        setErrMsg(msg)
      }
      setStatus("error")
    }
  }

  return (
    <div className="flex-1 flex flex-col py-8 gap-8 w-full font-mono text-white">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">Confidential_Faucet // localhost_only</span>
        <h1 className="text-white text-3xl tracking-tighter font-black uppercase">Testnet Resources</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-[#0d0f14] border border-border/30 rounded-3xl overflow-hidden">
          <div className="p-8 space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white">Request Test Tokens</h3>
              <p className="text-xs text-foreground/40 mt-1 leading-relaxed">
                Enter a custom amount up to 10% of total supply (100M) per request.
              </p>
            </div>

            {/* Token + amount input */}
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-5 space-y-3">
              <label className="text-xs text-foreground/40">Amount to request</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setStatus("idle"); setErrMsg("") }}
                  placeholder="0"
                  min="1"
                  max={selected.max}
                  className={`flex-1 bg-transparent text-4xl font-light placeholder:text-foreground/20 focus:outline-none min-w-0 ${isOverMax ? "text-red-400" : "text-foreground/60"}`}
                />
                <TokenDropdown options={FAUCET_TOKENS} value={token} onChange={v => { setToken(v); setAmount(""); setStatus("idle") }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-foreground/30">Max per request</span>
                <button
                  type="button"
                  onClick={() => setAmount(selected.max.toString())}
                  className="text-primary/70 hover:text-primary font-bold transition-colors"
                >
                  {selected.max.toLocaleString()} {token}
                </button>
              </div>
              {isOverMax && (
                <div className="flex items-center gap-2 text-red-400 text-[11px]">
                  <AlertTriangle size={12} />
                  Exceeds 10% cap — max is {selected.max.toLocaleString()} {token}
                </div>
              )}
            </div>

            {/* Network */}
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-bold">H</div>
                  <div>
                    <div className="text-sm font-semibold text-white">Hardhat Local</div>
                    <div className="text-[10px] text-foreground/30">Chain ID: 31337 · http://127.0.0.1:8545</div>
                  </div>
                </div>
                <span className="text-[10px] text-yellow-400 font-bold px-3 py-1 bg-yellow-400/10 rounded-full border border-yellow-400/20">LOCAL</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#05080f]/40 border border-border/20 rounded-xl px-4 py-3">
              <Info size={14} className="text-foreground/30 flex-shrink-0" />
              <span className="text-xs text-foreground/40">Maximum 100,000,000 tokens per request (10% of 1B total supply)</span>
            </div>

            <button
              onClick={handleDispense}
              disabled={status === "loading" || !isValid}
              className="w-full py-4 rounded-2xl bg-purple-500/70 hover:bg-purple-500/90 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {status === "loading"
                ? <><Loader2 size={16} className="animate-spin" /> Requesting...</>
                : `Request ${amount ? Number(amount).toLocaleString() : "—"} ${token}`}
            </button>

            {status === "success" && (
              <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 size={14} /> Dispensed Successfully
                  </div>
                  <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer"
                    className="text-[10px] text-green-400 underline uppercase font-bold flex items-center gap-1">
                    View <ExternalLink size={10} />
                  </a>
                </div>
                <div className="text-[10px] text-green-400/40 font-mono truncate">HASH: {txHash}</div>
              </div>
            )}

            {(status === "error" || errMsg) && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-xs text-red-400">
                {errMsg}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#05080f]/40 border border-border/40 rounded-3xl p-8 backdrop-blur-md space-y-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/50">Setup Required</span>
            </div>
            <div className="space-y-2 text-[11px] text-foreground/40 leading-relaxed font-mono">
              <p>1. Start Hardhat node:</p>
              <p className="text-primary/70 pl-2">npx hardhat node</p>
              <p>2. Deploy mock tokens:</p>
              <p className="text-primary/70 pl-2">npm run deploy:tokens</p>
              <p>3. Add Hardhat network to MetaMask</p>
              <p className="text-primary/70 pl-2">RPC: http://127.0.0.1:8545</p>
              <p className="text-primary/70 pl-2">Chain ID: 31337</p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Dispense Policy</h3>
            <div className="space-y-3 font-mono text-[10px]">
              <div className="flex justify-between border-b border-primary/10 pb-2">
                <span className="text-foreground/40">Total Supply</span>
                <span className="text-white font-bold">1,000,000,000 / token</span>
              </div>
              <div className="flex justify-between border-b border-primary/10 pb-2">
                <span className="text-foreground/40">Max per request</span>
                <span className="text-primary font-bold">100,000,000 (10%)</span>
              </div>
              {FAUCET_TOKENS.map(t => (
                <div key={t.symbol} className="flex justify-between border-b border-primary/10 pb-2 last:border-0">
                  <span className="text-foreground/40">{t.symbol}</span>
                  <span className="text-foreground/60">{t.decimals} decimals</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
