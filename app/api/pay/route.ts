import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const amount = Number(body?.amount ?? 0)
  const note = String(body?.note ?? "Execute Payment")
  const userAddress = String(body?.userAddress ?? "0x...")

  const txId = `0x${Math.random().toString(16).slice(2, 42)}`
  const explorerUrl = `https://explorer.usc-testnet2.creditcoin.network/tx/${txId}`

  try {
    await convex.mutation(api.merchants.insertTransaction, {
      userAddress,
      title: note,
      amount,
      asset: 'USDC',
      category: 'spend',
      status: 'verified',
      txHash: txId
    })
  } catch (e) {
    console.error("Failed to log transaction", e)
  }

  return NextResponse.json({ txId, explorerUrl })
}
