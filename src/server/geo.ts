import { isIP } from "node:net";
import type { NearbyArea } from "@/hooks/useNearbyArea";
import { nearestDistrict } from "@/lib/districtCentres";
import { createPublicSupabase } from "@/lib/supabase/server";

/**
 * Roughly where a visitor is, from their IP address — no permission prompt.
 * The address is looked up at IPinfo (ipinfo.io), which is the one database
 * that placed a Jashore broadband line in Jashore; DB-IP, ip-api and ipwho.is
 * all said Dhaka for it (tried 9 Oct 2026).
 *
 * It is a guess, good enough to order a list by and never to decide anything.
 * With no answer — abroad, an address IPinfo doesn't know, IPinfo down or over
 * its limit — the result is null and the caller carries on as if it had never
 * asked.
 *
 * IPINFO_TOKEN is optional. Without it IPinfo still answers, but only about a
 * thousand times a day for the whole server.
 */

type Found = { city?: string; region?: string; country?: string; loc?: string; org?: string; bogon?: boolean };

/**
 * The phone operators. Their addresses are handed out from one pool for the
 * whole country, so "Dhaka" for one of them means "don't know" far more often
 * than it means Dhaka — that answer is dropped. Any other district is kept:
 * nobody is placed in Jashore by default.
 */
const MOBILE = /grameen|robi axiata|banglalink|teletalk|airtel/i;

const DAY = 24 * 60 * 60 * 1000;
const answers = new Map<string, { at: number; area: NearbyArea | null }>();

const ask = async (ip: string): Promise<Found | null> => {
  const token = process.env.IPINFO_TOKEN;
  // No address asks about the caller itself: this machine, in development.
  const res = await fetch(`https://ipinfo.io/${ip ? `${ip}/` : ""}json`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: AbortSignal.timeout(3000),
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as Found) : null;
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
 * IPinfo's city, matched to a district: by name ("Jessore" is an alias of
 * Jashore), then as an upazila town of the division it names ("Bhairab"),
 * and last by its coordinates, to the nearest district town.
 */
const matchArea = (found: Found, p: Places): NearbyArea | null => {
  const city = norm(found.city ?? "");
  const division = p.divisions.find(d => called(d, norm((found.region ?? "").replace(/\s+division$/i, "")))) ?? null;

  let district = (city && p.districts.find(d => called(d, city))) || null;
  if (!district && city) {
    // An upazila's name is not unique across the country ("Kaliganj" is in
    // four districts); one that isn't settled by the division is no answer.
    const hits = p.upazilas
      .filter(u => called(u, city))
      .map(u => p.districts.find(d => d.id === u.district_id))
      .filter((d): d is Places["districts"][number] => !!d && (!division || d.division_id === division.id));
    if (new Set(hits.map(d => d.id)).size === 1) district = hits[0];
  }
  if (!district) {
    const [lat, lng] = (found.loc ?? "").split(",").map(Number);
    const near = Number.isFinite(lat) && Number.isFinite(lng) ? nearestDistrict(lat, lng) : null;
    district = (near && p.districts.find(d => d.name === near)) || null;
  }

  if (district && district.name === "Dhaka" && MOBILE.test(found.org ?? "")) return null;

  const within = district ? p.divisions.find(d => d.id === district.division_id) ?? null : division;
  if (!within) return null;
  return {
    division: within.name,
    district: district?.name ?? null,
    bnName: district ? district.bn_name : within.bn_name,
  };
};

/**
 * The district (or only the division) this address is in; null outside
 * Bangladesh or when unknown. An empty address means this machine's own.
 */
export const nearbyArea = async (ip: string): Promise<NearbyArea | null> => {
  if (ip && !isIP(ip)) return null;
  const kept = answers.get(ip);
  if (kept && Date.now() - kept.at < DAY) return kept.area;

  const found = await ask(ip);
  // No reply is not an answer, and is not kept: the next visit asks again.
  if (!found) return null;
  const area = found.bogon || found.country !== "BD" ? null : matchArea(found, await loadPlaces());

  // One answer per address per day, so a busy day stays inside IPinfo's limit.
  if (answers.size >= 5000) answers.clear();
  answers.set(ip, { at: Date.now(), area });
  return area;
};
