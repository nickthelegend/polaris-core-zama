import { NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
    const clientId = req.headers.get("x-client-id");
    const clientSecret = req.headers.get("x-client-secret");

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: "Missing Client Auth Headers (x-client-id, x-client-secret)" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { amount, description, metadata, asset = 'USDC' } = body;

    if (!amount) {
        return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    // 1. Verify Merchant App
    const app = await convex.query(api.merchants.getAppByClient, {
        clientId,
        clientSecret
    });

    if (!app) {
        console.error("Auth failed for client:", clientId);
        return NextResponse.json({ error: "Invalid API Credentials" }, { status: 403 });
    }

    // 2. Generate unique secure bill hash
    const billHash = crypto.randomBytes(20).toString('hex');

    // 3. Create the Bill record
    const billId = await convex.mutation(api.merchants.createBill, {
        appId: app._id,
        amount: amount.toString(),
        asset,
        description,
        metadata: metadata || {},
        hash: billHash
    });

    // 4. Return integration data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
        billId,
        billHash,
        checkoutUrl: `${baseUrl}/pay/${billHash}`,
        merchantName: app.name,
        status: 'pending'
    });
}
