import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;

  if (!hash) {
    return NextResponse.json({ error: "Missing hash" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const bill = await db.collection("bills").findOne({ hash });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const app = bill.appId ? await db.collection("apps").findOne({ _id: bill.appId }) : null;

    return NextResponse.json({
      ...bill,
      merchant: app ? {
        name: app.name,
        category: app.category || "General",
        escrow_contract: "0xEb90EAb5C95368a6237c95e1c3eA6c92D879D960",
        user: { wallet_address: "merchant-wallet" },
      } : null,
    });
  } catch (e: any) {
    console.error("Bill Lookup Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
