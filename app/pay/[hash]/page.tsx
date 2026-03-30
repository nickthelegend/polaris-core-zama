"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ethers } from "ethers"
import { usePolarisPay } from "@/hooks/use-polaris-pay"
import { useAccount } from "wagmi"
import { ShieldCheck, Zap, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import { toast } from "react-toastify"
import Link from "next/link"
import { ABIS, NETWORKS } from "@/lib/contracts"
import { syncTransaction } from "@/lib/sync-utils"

export default function CheckoutPage() {
    const params = useParams()
    const hash = params.hash
    const router = useRouter()
    const {
        authenticated,
        address,
        getMasterConfig,
        getCreditLimit,
        payWithCredit,
        loading: polarisLoading
    } = usePolarisPay()
    const { isConnected } = useAccount()

    const [bill, setBill] = useState<any>(null)
    const [fetching, setFetching] = useState(true)
    const [paying, setPaying] = useState(false)
    const [success, setSuccess] = useState(false)
    const [txHash, setTxHash] = useState("")
    const [creditLimit, setCreditLimit] = useState("0")

    useEffect(() => {
        if (authenticated && address) {
            getCreditLimit().then(setCreditLimit);
        }
    }, [authenticated, address])

    useEffect(() => {
        if (hash) {
            fetchBill()
        }
    }, [hash])

    const fetchBill = async () => {
        try {
            const res = await fetch(`/api/bills/${hash}`)
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setBill(data)
        } catch (e: any) {
            toast.error(e.message || "Failed to load bill")
        } finally {
            setFetching(false)
        }
    }

    const handlePayment = async () => {
        if (!authenticated) {
            toast.warn("Please connect your wallet first")
            return
        }

        if (Number(creditLimit) < Number(bill.amount)) {
            toast.error("Insufficient credit limit. Top up your equity!")
            return
        }

        const targetAddress = bill.merchant?.escrow_contract || bill.merchant?.user?.wallet_address;
        if (!targetAddress) {
            toast.error("Merchant settlement address not configured.");
            return;
        }

        setPaying(true)
        try {
            const { config } = getMasterConfig() as any;
            const usdcAddress = config.USDC;

            // 1. CREDIT_AUTHORIZATION (BNPL)
            // This records the debt on the Hub (Sepolia)
            console.log("[POLARIS] Authorizing Credit via MerchantRouter...");
            const receipt = await payWithCredit(targetAddress, bill.amount.toString(), usdcAddress);
            const finalTxHash = receipt.hash;
            console.log("[POLARIS] Credit Authorized:", finalTxHash);

            // 2. BACKEND_SYNC
            const res = await fetch("/api/bills/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    billHash: hash,
                    txHash: finalTxHash,
                    userAddress: address
                })
            })
            
            // Log to Transaction Ledger
            await syncTransaction({
                userAddress: address || "",
                type: "repay",
                title: `Checkout: Paid ${bill.merchant?.name}`,
                amount: bill.amount.toString(),
                asset: "USDC",
                txHash: finalTxHash,
                status: "SETTLED"
            });

            const result = await res.json()

            if (result.success) {
                setTxHash(finalTxHash)
                setSuccess(true)
                toast.success("Payment Finalized on Polaris Hub!")
            } else {
                throw new Error(result.error || "Platform sync failed")
            }
        } catch (e: any) {
            console.error(e)
            toast.error(e.message || "Payment sequence failed")
        } finally {
            setPaying(false)
        }
    }

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Initializing Secure Session...</p>
            </div>
        )
    }

    if (!bill) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center text-white">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-black uppercase tracking-tighter">Bill Not Found</h1>
                    <p className="text-[10px] text-white/40 uppercase">This payment link may be expired or invalid.</p>
                </div>
                <Link href="/" className="bg-white/5 px-6 py-2 rounded border border-white/10 text-[10px] font-bold uppercase hover:bg-white/10 transition-all">
                    Return to Polaris
                </Link>
            </div>
        )
    }

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-12 glass-card rounded-lg border border-primary/30 p-8 flex flex-col items-center text-center gap-6 shadow-[0_0_50px_-12px_rgba(34,197,94,0.3)] text-white">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Payment_Settled</h1>
                    <p className="text-[10px] text-white/40 uppercase">Your transaction has been verified on Polaris Hub.</p>
                </div>

                <div className="w-full bg-white/5 border border-white/10 p-4 rounded flex flex-col gap-3">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                        <span className="text-white/40">Merchant</span>
                        <span className="text-white font-black">{bill.merchant?.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                        <span className="text-white/40">Amount</span>
                        <span className="text-primary font-black">${bill.amount} {bill.asset}</span>
                    </div>
                </div>

                <div className="flex flex-col w-full gap-2">
                    <a
                        href={`${NETWORKS.SEPOLIA.explorer}/tx/${txHash}`}
                        target="_blank"
                        className="w-full bg-primary py-3 rounded text-[10px] font-black uppercase text-black hover:opacity-90 transition-all"
                    >
                        View Sepolia Explorer
                    </a>
                    {bill.metadata?.redirect_url ? (
                        <a
                            href={bill.metadata.redirect_url}
                            className="w-full bg-white/5 border border-white/10 py-3 rounded text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all"
                        >
                            Return to Merchant
                        </a>
                    ) : (
                        <button
                            onClick={() => window.close()}
                            className="w-full bg-white/5 border border-white/10 py-3 rounded text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all"
                        >
                            Close Checkout
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto mt-12 flex flex-col gap-8 text-white">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 bg-white/5 hover:bg-white/10 rounded transition-all">
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <h1 className="text-lg font-black uppercase tracking-tighter">Confirm_Payment</h1>
            </div>

            <div className="glass-card rounded-lg border border-white/10 overflow-hidden shadow-2xl">
                <div className="bg-white/5 p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center font-bold text-primary italic uppercase">
                            {bill.merchant?.name?.[0] || 'M'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-tight">{bill.merchant?.name}</span>
                            <span className="text-[9px] text-white/40 uppercase font-bold">{bill.merchant?.category}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-white">${bill.amount}</span>
                        <span className="text-[10px] text-white/40 font-bold uppercase">{bill.asset}</span>
                    </div>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest italic">Description</span>
                        <p className="text-xs text-white/80 leading-relaxed font-medium">
                            {bill.description || "Payment for digital assets via Polaris Protocol."}
                        </p>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wide">Pay_Later_With_Polaris</span>
                                <span className="text-[9px] text-primary font-bold uppercase tracking-widest">Available Credit: ${creditLimit}</span>
                            </div>
                        </div>
                        <Zap className="w-4 h-4 text-primary animate-pulse" />
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handlePayment}
                                disabled={paying || bill.status === 'paid' || !authenticated}
                                className={`w-full py-4 rounded font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${paying || bill.status === 'paid' || !authenticated ? 'bg-zinc-800 text-white/20 cursor-not-allowed' : 'bg-primary text-black hover:scale-[1.02] shadow-[0_0_20px_-5px_rgba(var(--primary),0.5)]'
                                    }`}
                            >
                                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : authenticated ? <ShieldCheck className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                {paying ? 'Authorizing...' : !authenticated ? 'Wallet_Needs_Link' : bill.status === 'paid' ? 'Already_Settled' : 'Give_Consent_&_Pay'}
                            </button>
                            <p className="text-[8px] text-center text-white/20 uppercase font-bold tracking-[0.1em] leading-relaxed">
                                By clicking above, you authorize Polaris Protocol to reserve ${bill.amount} from your credit limit for immediate settlement.
                            </p>
                        </div>
                        <p className="text-[9px] text-center text-white/20 uppercase font-bold tracking-widest flex items-center justify-center gap-2">
                            Secured by Polaris ZK-Verification
                        </p>
                    </div>
                </div>
            </div>

            {bill.status === 'paid' && !success && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest leading-loose">This bill was already settled. Reference: {bill.tx_hash?.slice(0, 12)}...</span>
                </div>
            )}
        </div>
    )
}
