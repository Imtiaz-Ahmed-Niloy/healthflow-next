import { useEffect, useSyncExternalStore } from "react";
import { nearestDistrict } from "@/lib/districtCentres";

/**
 * Where the visitor is, to the district. Two sources, the surest first:
 *
 *   1. what they said (`chosen`) — a district they picked, or "Use my
 *      location" (the browser's own prompt), kept in this browser's storage;
 *   2. otherwise a guess from their IP address by /api/v1/geo, with no prompt
 *      and never saved: it is asked again on the next visit.
 *
 * The guess comes from IPinfo (src/server/geo.ts). An earlier one, from
 * DB-IP, said Dhaka for most of the country and was taken out. Null until an
 * answer arrives, and null for good when there is none — abroad, an unknown
 * address, a phone operator's Dhaka. NearbyControls then asks the browser,
 * once. One answer for the whole page: every caller shares it.
 */

export type NearbyArea = { division: string; district: string | null; bnName: string | null };

type State = { area: NearbyArea | null; loading: boolean; chosen: boolean };

const KEY = "hf.nearbyArea";
const SERVER: State = { area: null, loading: true, chosen: false };

let state: State = SERVER;
let started = false;
const listeners = new Set<() => void>();

const set = (next: State) => {
  state = next;
  listeners.forEach(l => l());
};

const saved = (): NearbyArea | null => {
  try {
    const found = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return found && typeof found.division === "string" ? found : null;
  } catch {
    // Storage switched off, or something else's junk under the key.
    return null;
  }
};

// Asked once per page load; forgetting a district goes back to the same answer.
let guessed: Promise<NearbyArea | null> | null = null;

const guess = () => {
  if (!guessed) set({ area: null, loading: true, chosen: false });
  guessed ??= fetch("/api/v1/geo")
    .then(res => (res.ok ? res.json() : null))
    .then(body => (body?.data as NearbyArea | null) ?? null)
    .catch(() => null);
  // A district chosen while this was in the air stays.
  void guessed.then(area => { if (!state.chosen) set({ area, loading: false, chosen: false }); });
};

const start = () => {
  if (started) return;
  started = true;
  const mine = saved();
  if (mine) set({ area: mine, loading: false, chosen: true });
  else guess();
};

/** The visitor's own answer, remembered here; null forgets it and goes back to the guess. */
export const chooseNearbyArea = (area: NearbyArea | null) => {
  try {
    if (area) localStorage.setItem(KEY, JSON.stringify(area));
    else localStorage.removeItem(KEY);
  } catch {
    // Not remembered, then; it still holds for this page.
  }
  if (area) set({ area, loading: false, chosen: true });
  else guess();
};

/**
 * Whether this browser already lets the site read its location — so asking
 * shows no prompt. False where the browser can't say (older Safari).
 */
export const locationAlreadyAllowed = async () => {
  try {
    return (await navigator.permissions.query({ name: "geolocation" })).state === "granted";
  } catch {
    return false;
  }
};

const ASKED_KEY = "hf.nearbyAsked";

/**
 * True once per browser: the one time the site may raise the location prompt
 * without being asked to. Remembered whatever the answer, so a "no" is the
 * end of it. False where storage is off — never knowing means never asking.
 */
export const firstAsk = () => {
  try {
    if (localStorage.getItem(ASKED_KEY)) return false;
    localStorage.setItem(ASKED_KEY, "1");
    return true;
  } catch {
    return false;
  }
};

export type LocateFailure = "denied" | "outside" | "failed";

/**
 * The district the device says it is in — this is the browser's permission
 * prompt. The coordinates stay in the browser: they are matched to a district
 * here (districtCentres) and only its name is used.
 */
export const locateDistrict = () =>
  new Promise<string>((resolve, reject: (why: LocateFailure) => void) => {
    if (!("geolocation" in navigator)) { reject("failed"); return; }
    navigator.geolocation.getCurrentPosition(
      at => {
        const district = nearestDistrict(at.coords.latitude, at.coords.longitude);
        if (district) resolve(district);
        else reject("outside");
      },
      err => reject(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      // A district needs no GPS fix: the quick, coarse answer will do.
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });

export const useNearbyArea = () => {
  const current = useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => state,
    () => SERVER,
  );
  useEffect(start, []);
  return current;
};
