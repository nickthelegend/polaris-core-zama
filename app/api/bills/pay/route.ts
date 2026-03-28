import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const { billHash, txHash, userAddress } = body;

    if (!billHash || !txHash) {
        return NextResponse.json({ error: "Required fields: billHash, txHash" }, { status: 400 });
    }

    try {
        // 1. Update bill status and log transaction on Convex
        const bill = await convex.mutation(api.merchants.payBill, {
            billHash,
            txHash,
            userAddress: userAddress || "0x..."
        });

        console.log(`[OBOLUS] Settlement logged for ${bill.appName}`);

        return NextResponse.json({
            success: true,
            message: "Settlement confirmed",
            bill
        });
    } catch (e: any) {
        console.error("Payment settlement error:", e);
        return NextResponse.json({ error: "Failed to finalize payment" }, { status: 500 });
    }
}
