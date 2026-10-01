import { existsSync } from "node:fs";
import { join } from "node:path";
import maxmind, { type CityResponse, type Reader } from "maxmind";
import { createPublicSupabase } from "@/lib/supabase/server";

/**
 * Roughly where a visitor is, from their IP address — no permission prompt,
 * and nothing leaves the server: the lookup is a file on disk (DB-IP's City
 * Lite, fetched by scripts/geoip/download.mjs; CC BY 4.0, credited in the
 * footer).
 *
 * It is a guess, and in Bangladesh a loose one: mobile data mostly resolves
 * to Dhaka wherever the phone is. Good enough to order a list by, never to
 * decide anything. With no file, or an address it doesn't know, the answer is
 * null and the caller carries on as if it had never asked.
 */

export type NearbyArea = {
  /** As spelled in bd_divisions / bd_districts (0096) — what the doctor search matches. */
  division: string;
  /** Null when only the division could be told. */
  district: string | null;
  /** The district's Bangla name, or the division's without one. */
  bnName: string | null;
};

const DB_PATH = process.env.GEOIP_DB || join(process.cwd(), "data", "geoip", "dbip-city-lite.mmdb");

let reader: Promise<Reader<CityResponse> | null> | null = null;

const openReader = () => {
  // A missing file is looked for again on the next request, not remembered:
  // the download may simply not have run yet.
  if (!reader && !existsSync(DB_PATH)) return Promise.resolve(null);
  reader ??= maxmind.open<CityResponse>(DB_PATH).catch(err => {
    console.error("GeoIP database could not be opened:", err);
    reader = null;
    return null;
  });
  return reader;
};

type Named = { id: number; name: string; bn_name: string | null; aliases: string[] };
type Places = {
  divisions: Named[];
  districts: (Named & { division_id: number })[];
  upazilas: (Named & { district_id: number })[];
};

const PLACES_TTL = 60 * 60 * 1000;
let places: { at: number; list: Promise<Places> } | null = null;

const loadPlaces = () => {
  if (places && Date.now() - places.at < PLACES_TTL) return places.list;
  const supabase = createPublicSupabase();
  const list = Promise.all([
    supabase.from("bd_divisions").select("id, name, bn_name, aliases"),
    supabase.from("bd_districts").select("id, division_id, name, bn_name, aliases"),
    supabase.from("bd_upazilas").select("id, district_id, name, bn_name, aliases"),
  ]).then(([dv, ds, up]) => {
    const error = dv.error ?? ds.error ?? up.error;
    if (error) throw new Error(error.message);
    return { divisions: dv.data ?? [], districts: ds.data ?? [], upazilas: up.data ?? [] };
  });
  places = { at: Date.now(), list };
  // A failed read is not kept for the hour.
  list.catch(() => { places = null; });
  return list;
};

const norm = (s: string) => s.trim().toLowerCase();

const called = (place: Named, name: string) =>
  norm(place.name) === name || place.aliases.some(a => norm(a) === name);

/**
 * The database's city, matched to a district. It writes "Dhaka (Cantonment)",
 * "Chittagong (Double Moorings)", or just a thana — "Kafrul" — so each part is
 * tried as a district, then as an upazila of the division it names.
 */
const matchArea = (city: string, region: string, p: Places): NearbyArea | null => {
  const division = p.divisions.find(d => called(d, norm(region.replace(/\s+division$/i, "")))) ?? null;
  const parts = city.split(/[()]/).map(norm).filter(Boolean);

  let district = parts.map(n => p.districts.find(d => called(d, n))).find(Boolean) ?? null;
  if (!district) {
    for (const n of parts) {
      // An upazila's name is not unique across the country ("Kaliganj" is in
      // four districts); one that isn't settled by the division is no answer.
      const hits = p.upazilas
        .filter(u => called(u, n))
        .map(u => p.districts.find(d => d.id === u.district_id))
        .filter((d): d is Places["districts"][number] => !!d && (!division || d.division_id === division.id));
      const ids = new Set(hits.map(d => d.id));
      if (ids.size === 1) { district = hits[0]; break; }
    }
  }

  const within = district ? p.divisions.find(d => d.id === district.division_id) ?? null : division;
  if (!within) return null;
  return {
    division: within.name,
    district: district?.name ?? null,
    bnName: district ? district.bn_name : within.bn_name,
  };
};

/** The district (or only the division) this address is in; null outside Bangladesh or when unknown. */
export const nearbyArea = async (ip: string): Promise<NearbyArea | null> => {
  const db = await openReader();
  if (!db || !maxmind.validate(ip)) return null;
  const found = db.get(ip);
  if (found?.country?.iso_code !== "BD") return null;
  const city = found.city?.names?.en ?? "";
  const region = found.subdivisions?.[0]?.names?.en ?? "";
  if (!city && !region) return null;
  return matchArea(city, region, await loadPlaces());
};
