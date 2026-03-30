import { useCallback, useEffect, useState } from "react";
import { PositionDocument } from "@/lib/db-types";

export function usePositions(walletAddress: string | undefined) {
  const [positions, setPositions] = useState<PositionDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(() => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    fetch(`/api/positions?wallet=${walletAddress}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch positions");
        return r.json();
      })
      .then((data) => setPositions(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message ?? "Unknown error"))
      .finally(() => setLoading(false));
  }, [walletAddress]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions };
}
