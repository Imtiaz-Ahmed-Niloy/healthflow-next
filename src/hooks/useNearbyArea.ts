import { useEffect, useSyncExternalStore } from "react";
import { nearestDistrict } from "@/lib/districtCentres";

/**
 * Where the visitor is, to the district — only ever what they said: a
 * district they picked, or "Use my location" (the browser's own prompt), kept
 * in this browser's storage. NearbyControls asks the browser by itself once,
 * on a first visit, and again whenever it was already allowed to answer.
 *
 * Until then there is no answer, and nothing is guessed. It used to be
 * guessed from the IP address, which in Bangladesh says Dhaka for most of the
 * country — an ISP's addresses are registered there wherever its customers
 * are — so someone in Jashore was shown "doctors near you" in Dhaka. One
 * answer for the whole page: every caller shares it.
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

const UNSET: State = { area: null, loading: false, chosen: false };

const start = () => {
  if (started) return;
  started = true;
  const mine = saved();
  set(mine ? { area: mine, loading: false, chosen: true } : UNSET);
};

/** The visitor's own answer, remembered here; null forgets it. */
export const chooseNearbyArea = (area: NearbyArea | null) => {
  try {
    if (area) localStorage.setItem(KEY, JSON.stringify(area));
    else localStorage.removeItem(KEY);
  } catch {
    // Not remembered, then; it still holds for this page.
  }
  set(area ? { area, loading: false, chosen: true } : UNSET);
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
