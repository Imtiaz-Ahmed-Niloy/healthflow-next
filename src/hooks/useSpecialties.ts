import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * The specialties list (0093), in its own order: what a doctor's
 * Specialization is picked from and what the site filters by. Active ones
 * only — a hidden specialty stays on the doctors who have it but is no longer
 * offered. Read straight from the table, which anyone may read, so the public
 * filters work signed out.
 */
export const useSpecialties = () => {
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("specialties")
      .select("name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setSpecialties((data ?? []).map(s => s.name));
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { specialties, loading };
};
