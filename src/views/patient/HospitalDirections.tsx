"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CircleDot, LocateFixed, MapPin, Phone } from "lucide-react";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/** "Monirampur" is looked for in Bangladesh, not wherever else has one. */
const inBangladesh = (place: string) => (/bangladesh|বাংলাদেশ/i.test(place) ? place : `${place}, Bangladesh`);

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

const HospitalDirections = ({ slug }: { slug: string }) => {
  const t = useTranslations("patient.directions");
  const locale = useLocale();
  const { hospital, loading } = useHospital(slug);
  // Where the route starts, the surest first: the device's position, a place
  // they typed, their district.
  const [from, setFrom] = useState<Point | null>(null);
  const [typed, setTyped] = useState("");
  // What is in the From box while it is being edited; null shows the start in use.
  const [editing, setEditing] = useState<string | null>(null);
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
  const shown = from ? myLocation : typed || districtName;

  const showRoute = (e: FormEvent) => {
    e.preventDefault();
    if (editing === null) return;
    const place = editing.trim();
    // Cleared, or left as it was: the start in use stays.
    if (!place || place === shown) { setEditing(null); return; }
    if (place === myLocation) { void find(); return; }
    setFrom(null);
    setTyped(place);
    setProblem(null);
    setEditing(null);
  };

  return (
    <PatientPortalLayout>
      <Link href="/patient/find-hospitals" className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <h1 className="mt-5 font-display text-3xl md:text-4xl text-primary">{t("title", { name: hospital.name })}</h1>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <form onSubmit={showRoute} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="directions-from">{t("from")}</Label>
              <div className="relative">
                <CircleDot className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  id="directions-from"
                  value={editing ?? shown}
                  onChange={e => setEditing(e.target.value)}
                  // The whole of "My location" goes at once, ready to type over.
                  onFocus={e => e.target.select()}
                  placeholder={finding ? t("locating") : t("fromPlaceholder")}
                  autoComplete="off"
                  className="pl-9 pr-11"
                />
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
              : typed ? t("fromTyped", { place: typed })
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
