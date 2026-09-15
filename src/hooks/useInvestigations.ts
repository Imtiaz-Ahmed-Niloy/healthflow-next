import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * The investigations list (0094): what the prescription's Investigation
 * section suggests as the doctor types. Active ones only. About a thousand
 * rows, read once per page load and kept in memory — the API caps a read at
 * 1000 rows, so it comes in pages.
 */

export type Investigation = { name: string; category: string | null };

const PAGE = 1000;
let cached: Promise<Investigation[]> | null = null;

const loadAll = async () => {
  const all: Investigation[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("investigations")
      .select("name, category")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return all;
  }
};

export const useInvestigations = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cached ??= loadAll().catch(err => {
      cached = null;
      throw err;
    });
    cached
      .then(list => { if (active) setInvestigations(list); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { investigations, loading };
};
