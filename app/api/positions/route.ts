import { NextRequest, NextResponse } from "next/server";
import { Db } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function getPositionsFromDb(db: Db, wallet: string) {
  return db
    .collection("positions")
    .find({ walletAddress: wallet.toLowerCase(), status: "active" })
    .toArray();
}

export async function upsertPosition(
  db: Db,
  payload: {
    walletAddress: string;
    type: "SUPPLY" | "BORROW";
    symbol: string;
    entryAmount: number;
    txHash: string;
  }
) {
  const now = new Date();
  const status = payload.entryAmount === 0 ? "closed" : "active";

  return db.collection("positions").updateOne(
    { txHash: payload.txHash },
    {
      $set: {
        walletAddress: payload.walletAddress.toLowerCase(),
        type: payload.type,
        symbol: payload.symbol,
        entryAmount: payload.entryAmount,
        status,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json(
      { error: "wallet address required" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const positions = await getPositionsFromDb(db, wallet);
    return NextResponse.json(positions);
  } catch (err) {
    console.error("[GET /api/positions] DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, type, symbol, entryAmount, txHash } = body;

    const db = await getDb();
    await upsertPosition(db, { walletAddress, type, symbol, entryAmount, txHash });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/positions] DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
