import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { generateProofFor } from "@/lib/gluwa-prover";
import { NETWORKS } from "@/lib/contracts";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const PROVER_API_URL = "https://proof-gen-api.usc-testnet2.creditcoin.network";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { txHash, chainKey, userAddress, amount, tokenAddress, hubTxHash, status, asset } = body;

        if (!txHash) return NextResponse.json({ error: "Missing txHash" }, { status: 400 });

        if (hubTxHash) {
            await convex.mutation(api.merchants.updateDepositStatus, {
                txHash,
                hubTxHash,
                status: status || 'Synced'
            });
            return NextResponse.json({ success: true, message: "Hub hash updated" });
        }

        // Otherwise, insert/upsert new deposit
        await convex.mutation(api.merchants.upsertDeposit, {
            txHash,
            chainKey: Number(chainKey) || 1,
            userAddress,
            amount,
            tokenAddress,
            status: 'PENDING',
            asset
        });

        console.log(`[Convex] Saved deposit pending proof: ${txHash}`);
        return NextResponse.json({ success: true, message: "Deposit queued" });
    } catch (e: any) {
        console.error("DB Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const txHash = searchParams.get("txHash");
    const chainKeyParam = searchParams.get("chainKey");

    if (!txHash) {
        return NextResponse.json({ error: "Missing txHash" }, { status: 400 });
    }

    let chainKey = chainKeyParam ? parseInt(chainKeyParam, 10) : 1;
    if (chainKey === 11155111) chainKey = 1; // Sepolia

    if (chainKey === 1337) {
        return NextResponse.json({
            chainKey,
            headerNumber: 1,
            merkleProof: { root: "0x" + "0".repeat(64), siblings: [] },
            continuityProof: { lowerEndpointDigest: "0x" + "0".repeat(64), roots: ["0x" + "0".repeat(64)] },
            txBytes: "0x"
        });
    }

    try {
        // Check Convex first
        const existing = await convex.query(api.merchants.getDepositByHash, { txHash });

        if (existing?.proof) {
            console.log(`[Convex] Returning cached proof for ${txHash}`);
            return NextResponse.json(existing.proof);
        }

        console.log(`[PROOF-API] Requesting proof from ${PROVER_API_URL}`);

        const ccProvider = new ethers.JsonRpcProvider(NETWORKS.USC.rpc);
        const sourceProvider = new ethers.JsonRpcProvider(NETWORKS.SEPOLIA.rpc);

        const proof = await generateProofFor(
            txHash,
            chainKey,
            PROVER_API_URL,
            ccProvider,
            sourceProvider
        );

        // Save to Convex
        await convex.mutation(api.merchants.updateDepositStatus, {
            txHash,
            status: 'ProofGenerated',
            proof: proof
        });

        return NextResponse.json(proof);
    } catch (error: any) {
        console.error("[PROOF-API] Error:", error.message);

        if (error.message.includes("BLOCK_NOT_ATTESTED")) {
            await convex.mutation(api.merchants.updateDepositStatus, {
                txHash,
                status: 'WaitingAttestation'
            });

            return NextResponse.json({
                status: "WAITING_ATTESTATION",
                message: "This Sepolia block is currently being verified by Creditcoin Hub."
            });
        }

        return NextResponse.json({ error: error.message, status: "FAILED" }, { status: 500 });
    }
}
