import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * The chief complaints list (0101): what the prescription's Chief Complaints
 * section suggests as the doctor types, and the details each one suggests
 * after it is picked. Active ones only, read once per page load.
 */

export type Complaint = { name: string; details: string[] };

/** Suggested after every complaint, besides the complaint's own details. */
export const COMPLAINT_DURATIONS = [
  "1 day", "2 days", "3 days", "5 days", "7 days", "10 days", "12 days",
  "1 week", "2 weeks", "1 month", "2 months", "3 months", "6 months", "1 year",
];

let cached: Promise<Complaint[]> | null = null;

const loadAll = async () => {
  const { data, error } = await supabase
    .from("complaints")
    .select("name, details")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return data ?? [];
};

export const useComplaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cached ??= loadAll().catch(err => {
      cached = null;
      throw err;
    });
    cached
      .then(list => { if (active) setComplaints(list); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { complaints, loading };
};
