import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Bangladesh's divisions, districts and upazilas (0096): division >> district
 * >> upazila, each pointing at its parent. Dhaka's city thanas sit with the
 * upazilas as kind "thana". Every name carries its other spellings
 * ("Comilla" for Cumilla) in `aliases`, which the pickers search too.
 *
 * About 600 rows, readable signed out, read once per page load and kept in
 * memory.
 */

export type BdDivision = { id: number; name: string; bn_name: string | null; aliases: string[] };
export type BdDistrict = BdDivision & { division_id: number };
export type BdUpazila = BdDivision & { district_id: number; kind: string };

export type BdLocations = { divisions: BdDivision[]; districts: BdDistrict[]; upazilas: BdUpazila[] };

const EMPTY: BdLocations = { divisions: [], districts: [], upazilas: [] };
let cached: Promise<BdLocations> | null = null;

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

const loadAll = async (): Promise<BdLocations> => {
  const [dv, ds, up] = await Promise.all([
    supabase.from("bd_divisions").select("id, name, bn_name, aliases"),
    supabase.from("bd_districts").select("id, division_id, name, bn_name, aliases"),
    supabase.from("bd_upazilas").select("id, district_id, name, bn_name, aliases, kind").limit(2000),
  ]);
  const error = dv.error ?? ds.error ?? up.error;
  if (error) throw error;
  return {
    divisions: (dv.data ?? []).sort(byName),
    districts: (ds.data ?? []).sort(byName),
    upazilas: (up.data ?? []).sort(byName),
  };
};

export const useBdLocations = () => {
  const [locations, setLocations] = useState<BdLocations>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    cached ??= loadAll().catch(err => {
      cached = null;
      throw err;
    });
    cached
      .then(list => { if (active) setLocations(list); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { ...locations, loading };
};
