import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const MERCHANT_APP_URL =
  process.env.MERCHANT_APP_URL || "http://localhost:3002";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { billHash, txHash, userAddress, paymentMode, loanId } = body;

  if (!billHash || !txHash) {
    return NextResponse.json({ error: "Required fields: billHash, txHash" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const bill = await db.collection("bills").findOne({ hash: billHash });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    await db.collection("bills").updateOne(
      { hash: billHash },
      {
        $set: {
          status: "paid",
          payment_mode: paymentMode || null,
          loan_id: loanId ?? null,
          tx_hash: txHash,
          paid_at: new Date(),
        },
      }
    );

    const app = bill.appId ? await db.collection("apps").findOne({ _id: bill.appId }) : null;

    await db.collection("transactions").insertOne({
      userAddress: userAddress || "0x...",
      title: `Checkout: ${app?.name || "Merchant"}`,
      amount: bill.amount,
      asset: bill.asset,
      category: "spend",
      status: "completed",
      txHash,
      createdAt: new Date(),
    });

    // Notify the merchant app so its bill record transitions to "paid" as well
    if (app?.clientId && app?.clientSecret) {
      try {
        await fetch(`${MERCHANT_APP_URL}/api/bills/pay`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-client-id": app.clientId,
            "x-client-secret": app.clientSecret,
          },
          body: JSON.stringify({
            billHash,
            payment_mode: paymentMode || null,
            loan_id: loanId ?? null,
            tx_hash: txHash,
          }),
        });
      } catch (merchantErr) {
        // Log but don't fail the primary payment flow
        console.error("[POLARIS] Merchant app bill sync failed:", merchantErr);
      }
    }

    return NextResponse.json({ success: true, message: "Settlement confirmed", bill: { ...bill, appName: app?.name } });
  } catch (e: any) {
    console.error("Payment settlement error:", e);
    return NextResponse.json({ error: "Failed to finalize payment" }, { status: 500 });
  }
}
