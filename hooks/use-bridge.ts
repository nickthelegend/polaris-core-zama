import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

export interface BridgeTransaction {
    id: string;
    user_address: string;
    token_address: string;
    amount: string;
    source_tx_hash: string;
    hub_tx_hash?: string;
    usc_query_id: string;
    status: 'DETECTED' | 'BUILDING_PROOF' | 'WAITING_ATTESTATION' | 'SUBMITTED' | 'VERIFIED' | 'COMPLETED' | 'FAILED';
    created_at: string; // Updated to string for compatibility with frontend expectations
}

export function useBridge(userAddress: string | undefined) {
    const rawDeposits = useQuery(api.merchants.listDeposits, { userAddress });
    const isLoading = rawDeposits === undefined;

    const mapStatus = (status: string) => {
        if (status === 'Synced' || status === 'COMPLETED') return 'COMPLETED';
        if (status === 'ProofGenerated' || status === 'VERIFIED') return 'VERIFIED';
        if (status === 'WaitingAttestation') return 'WAITING_ATTESTATION';
        return 'BUILDING_PROOF';
    };

    const transactions: BridgeTransaction[] = (rawDeposits ?? []).map((d: any) => ({
        id: d._id,
        user_address: d.userAddress,
        token_address: d.tokenAddress || "0x...",
        amount: d.amount ? d.amount.toString() : "0",
        source_tx_hash: d.txHash,
        hub_tx_hash: d.hubTxHash,
        usc_query_id: "",
        status: mapStatus(d.status) as BridgeTransaction['status'],
        created_at: new Date(d._creationTime).toISOString()
    }));

    return { transactions, loading: isLoading };
}
