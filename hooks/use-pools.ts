import { useEffect, useState } from "react";
import { PoolDocument } from "@/lib/db-types";

export function usePools() {
  const [pools, setPools] = useState<PoolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/pools")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch pools");
        return r.json();
      })
      .then((data) => setPools(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message ?? "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  return { pools, loading, error };
}
