import { NextResponse } from "next/server";
import { Db } from "mongodb";
import { getDb } from "@/lib/mongodb";

export async function getGlobalStatsFromDb(db: Db) {
  return db.collection("globalStats").findOne({});
}

export async function GET() {
  try {
    const db = await getDb();
    const stats = await getGlobalStatsFromDb(db);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[GET /api/global-stats] DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
