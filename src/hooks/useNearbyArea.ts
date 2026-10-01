import { useEffect, useState } from "react";

/**
 * The visitor's district, guessed from their IP address by /api/v1/geo — no
 * permission prompt. Null until it answers, and null for good when it has no
 * answer (abroad, an unknown address, a failed request). Asked once per page
 * load and kept in memory.
 */

export type NearbyArea = { division: string; district: string | null; bnName: string | null };

let cached: Promise<NearbyArea | null> | null = null;

const load = (): Promise<NearbyArea | null> =>
  fetch("/api/v1/geo")
    .then(res => (res.ok ? res.json() : null))
    .then(body => (body?.data as NearbyArea | null) ?? null)
    .catch(() => null);

export const useNearbyArea = () => {
  const [area, setArea] = useState<NearbyArea | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cached ??= load();
    cached.then(found => {
      if (!active) return;
      setArea(found);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return { area, loading };
};
