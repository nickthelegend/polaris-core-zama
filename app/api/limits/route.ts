import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getUserVerifications } from "@/lib/verification-store";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: Request) {
  const walletAddress = req.headers.get("x-wallet-address") || "mock-wallet-address";
  const userData = getUserVerifications(walletAddress);

  try {
    const limitData = await convex.query(api.merchants.getUserLimit, {
      userAddress: walletAddress,
      asset: "USDC" // Default asset for limit check
    });

    const baseLimit = limitData?.currentLimit ?? 250.0;
    const used = limitData?.used ?? 48.5;

    const additionalLimit = userData.limitIncrease;

    return NextResponse.json({
      currentLimit: Number(baseLimit) + additionalLimit,
      used: Number(used),
      available: (Number(baseLimit) + additionalLimit) - Number(used),
      creditScore: 612 + userData.verifiedProviders.size * 10,
      lastUpdated: new Date().toISOString(),
      verifications: {
        totalAlgoEarned: userData.totalAlgoEarned,
        verifiedProviders: Array.from(userData.verifiedProviders),
        limitIncrease: userData.limitIncrease,
      },
    });
  } catch (e: any) {
    console.error("Convex Limit Error:", e);
    return NextResponse.json({ error: "Failed to fetch limits" }, { status: 500 });
  }
}
