import { useEffect, useSyncExternalStore } from "react";
import { nearestDistrict } from "@/lib/districtCentres";

/**
 * Where the visitor is, to the district. Three sources, the surest first:
 *
 *   1. what they said — a district they picked, or "Use my location" (the
 *      browser's own prompt), kept in this browser's storage;
 *   2. otherwise a guess from their IP address by /api/v1/geo, no prompt.
 *
 * The guess is often wrong on mobile data — every phone in the country
 * reaches the internet through Dhaka — which is why 1 exists. Null until an
 * answer arrives, and null for good when there is none (abroad, an unknown
 * address). One answer for the whole page: every caller shares it.
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

const guess = () => {
  set({ area: null, loading: true, chosen: false });
  fetch("/api/v1/geo")
    .then(res => (res.ok ? res.json() : null))
    .then(body => (body?.data as NearbyArea | null) ?? null)
    .catch(() => null)
    // A district chosen while this was in the air stays.
    .then(area => { if (!state.chosen) set({ area, loading: false, chosen: false }); });
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
