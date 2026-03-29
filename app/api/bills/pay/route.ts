import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { billHash, txHash, userAddress } = body;

  if (!billHash || !txHash) {
    return NextResponse.json({ error: "Required fields: billHash, txHash" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const bill = await db.collection("bills").findOne({ hash: billHash });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    await db.collection("bills").updateOne({ hash: billHash }, { $set: { status: "paid" } });

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

    return NextResponse.json({ success: true, message: "Settlement confirmed", bill: { ...bill, appName: app?.name } });
  } catch (e: any) {
    console.error("Payment settlement error:", e);
    return NextResponse.json({ error: "Failed to finalize payment" }, { status: 500 });
  }
}
