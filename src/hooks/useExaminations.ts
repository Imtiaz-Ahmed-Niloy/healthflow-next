import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * The examination list (0102): what the prescription's On Examination
 * section suggests as the doctor types, and the values each one suggests
 * after it is picked ("Temperature" then "102°F"). Active ones only, read
 * once per page load.
 */

export type Examination = { name: string; details: string[] };

let cached: Promise<Examination[]> | null = null;

const loadAll = async () => {
  const { data, error } = await supabase
    .from("examinations")
    .select("name, details")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return data ?? [];
};

export const useExaminations = () => {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cached ??= loadAll().catch(err => {
      cached = null;
      throw err;
    });
    cached
      .then(list => { if (active) setExaminations(list); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { examinations, loading };
};
