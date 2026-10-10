"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CircleDot, Clock, LocateFixed, MapPin, Phone, Ruler } from "lucide-react";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBdLocations } from "@/hooks/useBdLocations";
import { useHospital } from "@/hooks/useHospitals";
import { useNearbyArea } from "@/hooks/useNearbyArea";

/**
 * /patient/find-hospitals/<slug>/directions — the way to one hospital, on a
 * Google map. Reached from the Directions button on a Find Hospitals card.
 *
 * Laid out like Google Maps' own directions: on the left a From and a To,
 * on the right the map. To is the hospital and is fixed. From starts as the
 * patient's own position — the browser's, asked for on arrival — and can be
 * typed over with any area or address to see the way from there instead.
 * Typing suggests places. With NEXT_PUBLIC_GOOGLE_MAPS_KEY they are Google
 * Places' own (useGooglePlaces below), as in Google Maps. Without the key, or
 * when Google refuses it, they are the country's districts, upazilas and Dhaka
 * thanas from our own list (useBdLocations). Anything else typed is still
 * taken as it is.
 *
 * A hospital has no coordinates of its own, only its name and address, so
 * Google finds the place from those; a typed From is found the same way. The
 * patient's position goes straight into the map's address — it is never sent
 * to us. Without it the route starts from their district (useNearbyArea), and
 * with no district either the map shows only where the hospital is. The
 * patient stays on this page: there is no button out to Google Maps, on
 * purpose.
 *
 * The map is Google's keyless embed. With NEXT_PUBLIC_GOOGLE_MAPS_KEY set it
 * is their Maps Embed API instead, the one they document and support.
 */

type Point = { lat: number; lng: number };
type Problem = "denied" | "failed" | null;

/** A place the From box can suggest. */
type Suggestion = {
  key: string;
  /** As shown and as left in the box: "মনিরামপুর, যশোর". */
  label: string;
  /** As given to Google: "Monirampur, Jashore", or "place_id:…" for one of its own. */
  place: string;
  /** Every spelling the typing is matched against, lower-cased. Our own list only. */
  names: string[];
  /** One of Google's: the place's name, and the area under it. */
  main?: string;
  sub?: string;
};

const MAX_SUGGESTIONS = 8;

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

/** The map's address: a route when there is somewhere to start from, else the place alone. */
const mapSrc = (destination: string, origin: string, locale: string) => {
  const to = encodeURIComponent(destination);
  const from = encodeURIComponent(origin);
  if (KEY) {
    return origin
      ? `https://www.google.com/maps/embed/v1/directions?key=${KEY}&origin=${from}&destination=${to}&language=${locale}`
      : `https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${to}&language=${locale}`;
  }
  return origin
    ? `https://www.google.com/maps?saddr=${from}&daddr=${to}&hl=${locale}&output=embed`
    : `https://www.google.com/maps?q=${to}&hl=${locale}&output=embed`;
};

/** "Monirampur" is looked for in Bangladesh, not wherever else has one. A Google place id is already exact. */
const inBangladesh = (place: string) =>
  place.startsWith("place_id:") || /bangladesh|বাংলাদেশ/i.test(place) ? place : `${place}, Bangladesh`;

type Prediction = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
  };
};

/**
 * Google Places' own suggestions for what is being typed — streets, markets,
 * landmarks, as in Google Maps — kept to Bangladesh. Only with
 * NEXT_PUBLIC_GOOGLE_MAPS_KEY, and the key must have "Places API (New)"
 * enabled. `broken` is a key that has not, or a request that failed: the
 * caller goes back to our own list of districts and upazilas.
 *
 * One session token runs from the first letter to the pick (`endSession`),
 * which is how Google groups the requests of one search.
 */
const useGooglePlaces = (input: string, locale: string) => {
  const [found, setFound] = useState<Suggestion[]>([]);
  const [broken, setBroken] = useState(false);
  const session = useRef("");

  useEffect(() => {
    const q = input.trim();
    if (!KEY || broken || q.length < 2) { setFound([]); return; }
    let active = true;
    // After a pause in the typing, not on every letter.
    const timer = setTimeout(() => {
      session.current ||= crypto.randomUUID();
      fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY },
        body: JSON.stringify({ input: q, includedRegionCodes: ["bd"], languageCode: locale, sessionToken: session.current }),
      })
        .then(res => (res.ok ? res.json() : Promise.reject(new Error(`Places autocomplete: ${res.status}`))))
        .then((body: { suggestions?: Prediction[] }) => {
          if (!active) return;
          setFound((body.suggestions ?? []).flatMap(s => {
            const p = s.placePrediction;
            const label = p?.text?.text ?? p?.structuredFormat?.mainText?.text;
            if (!p?.placeId || !label) return [];
            return [{
              key: p.placeId,
              label,
              place: `place_id:${p.placeId}`,
              names: [],
              main: p.structuredFormat?.mainText?.text ?? label,
              sub: p.structuredFormat?.secondaryText?.text,
            }];
          }));
        })
        .catch(err => {
          console.warn("Google Places suggestions are off, using our own list:", err);
          if (active) setBroken(true);
        });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [input, locale, broken]);

  return { found, usable: !!KEY && !broken, endSession: () => { session.current = ""; } };
};

const position = (precise: boolean) =>
  new Promise<Point>((resolve, reject: (why: Exclude<Problem, null>) => void) => {
    if (!("geolocation" in navigator)) { reject("failed"); return; }
    navigator.geolocation.getCurrentPosition(
      at => resolve({ lat: at.coords.latitude, lng: at.coords.longitude }),
      err => reject(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      precise
        ? { enableHighAccuracy: true, timeout: 8000, maximumAge: 60 * 1000 }
        : { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });

/**
 * Where the patient is. The precise fix first — a route starts from a street —
 * and, when that gives nothing in time (a desktop has no GPS to ask), the
 * coarse one. A "no" to the prompt is final: it is not asked twice.
 */
const locate = () => position(true).catch(why => (why === "denied" ? Promise.reject(why) : position(false)));

type Route = { metres: number; seconds: number };

/** `origin` as mapSrc takes it — "lat,lng", "place_id:…" or an address — as the Routes API wants it. */
const waypoint = (place: string) => {
  if (place.startsWith("place_id:")) return { placeId: place.slice("place_id:".length) };
  const [lat, lng] = place.split(",").map(Number);
  return /^-?[\d.]+,-?[\d.]+$/.test(place)
    ? { location: { latLng: { latitude: lat, longitude: lng } } }
    : { address: place };
};

/**
 * How far and how long, by car, under the From and To: Google's Routes API,
 * so the numbers are the ones its map draws. Only with
 * NEXT_PUBLIC_GOOGLE_MAPS_KEY, and the key must have "Routes API" enabled;
 * without either the card is not there at all — there is nothing true to put
 * in it.
 */
const RouteSummary = ({ origin, destination }: { origin: string; destination: string }) => {
  const t = useTranslations("patient.directions");
  const locale = useLocale();
  // undefined while it is being worked out; null when Google gave no route.
  const [route, setRoute] = useState<Route | null | undefined>(undefined);

  useEffect(() => {
    if (!KEY) return;
    let active = true;
    setRoute(undefined);
    fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        // Only these two are asked for, which is also what Google bills by.
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: waypoint(origin),
        destination: waypoint(destination),
        travelMode: "DRIVE",
        regionCode: "bd",
        languageCode: locale,
      }),
    })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`Routes: ${res.status}`))))
      .then((body: { routes?: { distanceMeters?: number; duration?: string }[] }) => {
        if (!active) return;
        const first = body.routes?.[0];
        // The duration comes as "13860s".
        const seconds = parseInt(first?.duration ?? "", 10);
        setRoute(first?.distanceMeters && Number.isFinite(seconds) ? { metres: first.distanceMeters, seconds } : null);
      })
      .catch(err => {
        console.warn("Google Routes gave no distance:", err);
        if (active) setRoute(null);
      });
    return () => { active = false; };
  }, [origin, destination, locale]);

  if (!KEY || route === null) return null;

  const km = route ? route.metres / 1000 : 0;
  const minutes = route ? Math.max(1, Math.round(route.seconds / 60)) : 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Ruler className="h-3.5 w-3.5" /> {t("distance")}</p>
          <p className="mt-1 font-display text-2xl text-primary">
            {route ? t("km", { km: km < 10 ? Math.round(km * 10) / 10 : Math.round(km) }) : "…"}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {t("travelTime")}</p>
          <p className="mt-1 font-display text-2xl text-primary">
            {!route ? "…"
              : minutes < 60 ? t("minutes", { minutes })
              : t("hoursMinutes", { hours: Math.floor(minutes / 60), minutes: minutes % 60 })}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("byCar")}</p>
    </div>
  );
};

const HospitalDirections = ({ slug }: { slug: string }) => {
  const t = useTranslations("patient.directions");
  const locale = useLocale();
  const { hospital, loading } = useHospital(slug);
  // Where the route starts, the surest first: the device's position, a place
  // they typed, their district.
  const [from, setFrom] = useState<Point | null>(null);
  const [typed, setTyped] = useState("");
  // The typed start as the box shows it: a suggestion's name in the page's
  // language, while `typed` holds its English for Google.
  const [typedLabel, setTypedLabel] = useState("");
  // What is in the From box while it is being edited; null shows the start in use.
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { districts, upazilas } = useBdLocations();
  const [finding, setFinding] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  // The district they said they are in, or their IP address suggests: from
  // the wrong street, but along the right roads.
  const { area } = useNearbyArea();
  const bangla = locale === "bn";

  const find = async () => {
    setFinding(true);
    setProblem(null);
    try {
      setFrom(await locate());
      setTyped("");
      setTypedLabel("");
      setEditing(null);
    } catch (why) {
      setProblem(why === "denied" ? "denied" : "failed");
    } finally {
      setFinding(false);
    }
  };

  // Asked on arrival — the browser's prompt, the first time: they pressed
  // Directions, and a route needs somewhere to start.
  useEffect(() => { void find(); }, []);

  // Every district, and every upazila or thana with its district — a name
  // alone is not enough: there is a Kaliganj in four districts.
  const places = useMemo<Suggestion[]>(() => {
    const name = (p: { name: string; bn_name: string | null }) => (bangla && p.bn_name) || p.name;
    const spellings = (p: { name: string; bn_name: string | null; aliases: string[] }) =>
      [p.name, p.bn_name ?? "", ...p.aliases].filter(Boolean).map(s => s.toLowerCase());
    const districtById = new Map(districts.map(d => [d.id, d]));
    return [
      ...districts.map(d => ({ key: `d${d.id}`, label: name(d), place: d.name, names: spellings(d) })),
      ...upazilas.flatMap(u => {
        const d = districtById.get(u.district_id);
        return d ? [{ key: `u${u.id}`, label: `${name(u)}, ${name(d)}`, place: `${u.name}, ${d.name}`, names: spellings(u) }] : [];
      }),
    ];
  }, [districts, upazilas, bangla]);

  // Our own list: names that start with what was typed, then names that only
  // contain it.
  const ours = useMemo(() => {
    const q = (editing ?? "").trim().toLowerCase();
    if (!q) return [];
    const starts = places.filter(p => p.names.some(n => n.startsWith(q)));
    const contains = places.filter(p => !starts.includes(p) && p.names.some(n => n.includes(q)));
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [places, editing]);

  // Google's, where there is a key for them; ours otherwise.
  const google = useGooglePlaces(open ? editing ?? "" : "", locale);
  const suggestions = google.usable ? google.found : ours;

  if (loading || !hospital) {
    return (
      <PatientPortalLayout>
        <Link href="/patient/find-hospitals" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Link>
        <p className="py-20 text-center text-muted-foreground">{loading ? t("loading") : t("notFound")}</p>
      </PatientPortalLayout>
    );
  }

  // Name, street address and area, each part once, for Google to look up.
  const parts = [hospital.name, hospital.address, hospital.location, "Bangladesh"].map(p => p.trim()).filter(Boolean);
  const destination = parts.filter((p, i) => parts.findIndex(q => q.toLowerCase() === p.toLowerCase()) === i).join(", ");
  const where = hospital.address || hospital.location;

  const district = !from && !typed && !finding && area?.district ? area.district : "";
  const districtName = district ? (bangla && area?.bnName) || district : "";
  const origin = from ? `${from.lat},${from.lng}` : typed ? inBangladesh(typed) : district ? inBangladesh(district) : "";
  const myLocation = t("myLocation");
  const shown = from ? myLocation : typedLabel || typed || districtName;

  /** The route from this place: `place` for Google, `label` for the box. */
  const startFrom = (place: string, label = place) => {
    setFrom(null);
    setTyped(place);
    setTypedLabel(label);
    setProblem(null);
    setEditing(null);
    setOpen(false);
    google.endSession();
  };

  const showRoute = (e: FormEvent) => {
    e.preventDefault();
    setOpen(false);
    if (editing === null) return;
    const place = editing.trim();
    // Cleared, or left as it was: the start in use stays.
    if (!place || place === shown) { setEditing(null); return; }
    if (place === myLocation) { void find(); return; }
    startFrom(place);
  };

  // The arrows walk the suggestions; Enter takes the one under them, and with
  // the list closed sends the form with whatever was typed.
  const onFromKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % suggestions.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i - 1 + suggestions.length) % suggestions.length); }
    if (e.key === "Enter") {
      e.preventDefault();
      const picked = suggestions[active] ?? suggestions[0];
      startFrom(picked.place, picked.label);
    }
  };

  return (
    <PatientPortalLayout>
      <Link href="/patient/find-hospitals" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <h1 className="mt-5 font-display text-3xl md:text-4xl text-primary">{t("title", { name: hospital.name })}</h1>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <form onSubmit={showRoute} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="directions-from">{t("from")}</Label>
              <div className="relative">
                <CircleDot className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  id="directions-from"
                  value={editing ?? shown}
                  onChange={e => { setEditing(e.target.value); setOpen(true); setActive(0); }}
                  // The whole of "My location" goes at once, ready to type over.
                  onFocus={e => e.target.select()}
                  onBlur={() => setOpen(false)}
                  onKeyDown={onFromKey}
                  placeholder={finding ? t("locating") : t("fromPlaceholder")}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={open && suggestions.length > 0}
                  aria-controls="directions-from-list"
                  aria-autocomplete="list"
                  className="pl-9 pr-11"
                />
                {open && suggestions.length > 0 && (
                  <ul id="directions-from-list" role="listbox"
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-card">
                    {suggestions.map((s, i) => (
                      <li key={s.key} role="option" aria-selected={i === active}
                        // mousedown, not click: the box's blur would close the list first.
                        onMouseDown={e => { e.preventDefault(); startFrom(s.place, s.label); }}
                        onMouseEnter={() => setActive(i)}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${i === active ? "bg-primary/10 text-primary" : ""}`}>
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">
                          {s.main ?? s.label}
                          {s.sub && <span className="ml-1.5 text-xs text-muted-foreground">{s.sub}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={find} disabled={finding} aria-label={t("useLocation")} title={t("useLocation")}
                  className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-primary hover:bg-primary/10 disabled:opacity-60">
                  <LocateFixed className={`h-4 w-4 ${finding ? "animate-pulse" : ""}`} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="directions-to">{t("to")}</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                {/* This page is the way to this hospital, so it is not changed here. */}
                <Input id="directions-to" value={hospital.name} readOnly className="pl-9 bg-muted/50" />
              </div>
              {where && <p className="text-xs text-muted-foreground">{where}</p>}
            </div>

            <button type="submit"
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow">
              {t("showRoute")}
            </button>
          </form>

          <p className={`mt-4 text-sm ${problem && !origin ? "text-destructive" : "text-muted-foreground"}`}>
            {from ? t("fromYou")
              : finding ? t("locating")
              : typed ? t("fromTyped", { place: typedLabel || typed })
              : district ? t(problem === "denied" ? "fromDistrictDenied" : "fromDistrict", { place: districtName })
              : problem ? t(problem)
              : t("hint")}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-5">
            {hospital.phone && (
              <a href={`tel:${hospital.phone}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
                <Phone className="h-4 w-4" /> {t("call", { phone: hospital.phone })}
              </a>
            )}
            <Link href={`/hospitals/${hospital.slug}`} className="px-2 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              {t("viewHospital")}
            </Link>
          </div>
        </div>

          {origin && <RouteSummary origin={origin} destination={destination} />}
        </div>

        <div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <iframe
              // A new start is a new map; without the key the old route can linger.
              key={origin || "place"}
              src={mapSrc(destination, origin, locale)}
              title={t("mapTitle", { name: hospital.name })}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-[70vh] min-h-[24rem] w-full border-0"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("approximate")}</p>
        </div>
      </div>
    </PatientPortalLayout>
  );
};

export default HospitalDirections;
