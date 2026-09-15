import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Suggestion } from "@/components/portal/SuggestInput";

/**
 * The advice list (0095): what the prescription's General Advice section
 * suggests as the doctor types. Active lines only, in the library's order.
 * A few hundred rows, read once per page load and kept in memory.
 */

let cached: Promise<Suggestion[]> | null = null;

const loadAll = async () => {
  const { data, error } = await supabase
    .from("advice")
    .select("text, category")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map(a => ({ name: a.text, category: a.category }));
};

export const useAdvice = () => {
  const [advice, setAdvice] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cached ??= loadAll().catch(err => {
      cached = null;
      throw err;
    });
    cached
      .then(list => { if (active) setAdvice(list); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { advice, loading };
};
