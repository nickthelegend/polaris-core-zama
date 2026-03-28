import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
    req: Request,
    { params }: { params: Promise<{ hash: string }> }
) {
    const { hash } = await params;

    if (!hash) {
        return NextResponse.json({ error: "Missing hash" }, { status: 400 });
    }

    try {
        const bill = await convex.query(api.merchants.getBillByHash, { hash });

        if (!bill) {
            return NextResponse.json({ error: "Bill not found" }, { status: 404 });
        }

        // Map Convex schema to expected frontend format
        const formattedBill = {
            ...bill,
            merchant: bill.app ? {
                name: bill.app.name,
                category: bill.app.category || "General",
                escrow_contract: bill.app.network === "creditcoin_testnet"
                    ? "0xEb90EAb5C95368a6237c95e1c3eA6c92D879D960" // Default for demo if not stored
                    : "0x...",
                user: { wallet_address: "merchant-wallet" } // App doesn't store this, but we can enrich if needed
            } : null
        };

        return NextResponse.json(formattedBill);
    } catch (e: any) {
        console.error("Convex Bill Lookup Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
