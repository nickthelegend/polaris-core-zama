"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Info, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"
import { TokenIcon } from "@/components/token-icon"
import { CONTRACTS, NETWORKS } from "@/lib/contracts"
import { ethers } from "ethers"

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

// Hardhat account #0 — always has 10,000 ETH, is owner of mock tokens
const DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const MINT_ABI = ["function mint(address to, uint256 amount) external"]

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
  const [recipient, setRecipient] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [txHash, setTxHash] = useState("")
  const [errMsg, setErrMsg] = useState("")

  const selected = FAUCET_TOKENS.find(t => t.symbol === token) ?? FAUCET_TOKENS[0]
  const parsedAmount = parseFloat(amount)
  const isOverMax = !isNaN(parsedAmount) && parsedAmount > selected.max
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0 && !isOverMax
  const isValidRecipient = ethers.isAddress(recipient)
  const canSubmit = isValidAmount && isValidRecipient

  const handleDispense = async () => {
    if (!canSubmit) return
    setStatus("loading"); setErrMsg("")

    const tokenAddress = TOKEN_ADDRESSES[token]
    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
      setErrMsg("Token not deployed. Run: npm run deploy:tokens in polaris-protocol")
      setStatus("error")
      return
    }

    try {
      // Use deployer key directly via RPC — no MetaMask, no gas from user wallet
      const provider = new ethers.JsonRpcProvider(NETWORKS.LOCAL_HARDHAT.rpc)
      const deployer = new ethers.Wallet(DEPLOYER_KEY, provider)
      const contract = new ethers.Contract(tokenAddress, MINT_ABI, deployer)
      const rawAmount = ethers.parseUnits(parsedAmount.toString(), selected.decimals)
      const tx = await contract.mint(recipient, rawAmount)
      const receipt = await tx.wait()
      setTxHash(receipt.hash)
      setStatus("success")
      setAmount("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrMsg(msg)
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
                Tokens are minted by the deployer directly — your wallet needs no ETH for gas.
              </p>
            </div>

            {/* Recipient */}
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-5 space-y-2">
              <label className="text-xs text-foreground/40">Recipient address</label>
              <input type="text" value={recipient} onChange={e => setRecipient(e.target.value.trim())}
                placeholder="0xcced528..."
                className={`w-full bg-transparent text-sm font-mono placeholder:text-foreground/20 focus:outline-none ${recipient && !isValidRecipient ? "text-red-400" : "text-foreground/70"}`} />
              {recipient && !isValidRecipient && <p className="text-[10px] text-red-400">Invalid address</p>}
            </div>

            {/* Amount + token */}
            <div className="bg-[#05080f]/60 border border-border/20 rounded-2xl p-5 space-y-3">
              <label className="text-xs text-foreground/40">Amount to mint</label>
              <div className="flex items-center gap-3">
                <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setStatus("idle") }}
                  placeholder="0"
                  className={`flex-1 bg-transparent text-4xl font-light placeholder:text-foreground/20 focus:outline-none min-w-0 ${isOverMax ? "text-red-400" : "text-foreground/60"}`} />
                <TokenDropdown options={FAUCET_TOKENS} value={token} onChange={v => { setToken(v); setAmount(""); setStatus("idle") }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-foreground/30">Max per request</span>
                <button type="button" onClick={() => setAmount(selected.max.toString())}
                  className="text-primary/70 hover:text-primary font-bold transition-colors">
                  {selected.max.toLocaleString()} {token}
                </button>
              </div>
              {isOverMax && (
                <div className="flex items-center gap-2 text-red-400 text-[11px]">
                  <AlertTriangle size={12} />
                  Max is {selected.max.toLocaleString()} {token} (10% of 1B)
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[#05080f]/40 border border-border/20 rounded-xl px-4 py-3">
              <Info size={14} className="text-foreground/30 flex-shrink-0" />
              <span className="text-xs text-foreground/40">Deployer mints directly to your address — no wallet signature needed</span>
            </div>

            <button onClick={handleDispense} disabled={status === "loading" || !canSubmit}
              className="w-full py-4 rounded-2xl bg-purple-500/70 hover:bg-purple-500/90 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
              {status === "loading"
                ? <><Loader2 size={16} className="animate-spin" /> Minting...</>
                : `Mint ${amount ? Number(amount).toLocaleString() : "—"} ${token}`}
            </button>

            {status === "success" && (
              <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 size={14} /> Minted Successfully
                </div>
                <div className="text-[10px] text-green-400/40 font-mono truncate">TX: {txHash}</div>
              </div>
            )}

            {status === "error" && errMsg && (
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
              <span className="text-xs font-bold uppercase tracking-widest text-foreground/50">How It Works</span>
            </div>
            <div className="space-y-2 text-[11px] text-foreground/40 leading-relaxed font-mono">
              <p className="text-foreground/60">No MetaMask needed. No gas required.</p>
              <p>The Hardhat deployer wallet signs the mint transaction directly via RPC and sends tokens to your address.</p>
              <p className="mt-3">Deployer: <span className="text-primary/60">0xf39Fd6...92266</span></p>
              <p>RPC: <span className="text-primary/60">http://127.0.0.1:8545</span></p>
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
