"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LocateFixed, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { SearchSelect } from "@/components/common/SearchSelect";
import { useBdLocations } from "@/hooks/useBdLocations";
import { chooseNearbyArea, locateDistrict, useNearbyArea } from "@/hooks/useNearbyArea";

/**
 * How a visitor corrects where the site thinks they are (useNearbyArea): the
 * district as a picker, and "Use my location" — the browser's own prompt —
 * beside it. Either answer is remembered in their browser. Picking nothing
 * goes back to the guess.
 */
export const NearbyControls = () => {
  const t = useTranslations("specialists");
  const bangla = useLocale() === "bn";
  const { area } = useNearbyArea();
  const { divisions, districts } = useBdLocations();
  const [finding, setFinding] = useState(false);

  const choose = (name: string) => {
    const district = districts.find(d => d.name === name);
    const division = district && divisions.find(v => v.id === district.division_id);
    if (!district || !division) { chooseNearbyArea(null); return false; }
    chooseNearbyArea({ division: division.name, district: district.name, bnName: district.bn_name });
    return true;
  };

  const locate = async () => {
    setFinding(true);
    try {
      if (!choose(await locateDistrict())) toast.error(t("locationFailed"));
    } catch (why) {
      toast.error(t(why === "denied" ? "locationDenied" : why === "outside" ? "locationOutside" : "locationFailed"));
    } finally {
      setFinding(false);
    }
  };

  return (
    <>
      <SearchSelect
        value={area?.district ?? ""}
        onChange={choose}
        options={districts.map(d => ({
          value: d.name,
          label: bangla && d.bn_name ? d.bn_name : d.name,
          keywords: [d.name, ...d.aliases, ...(d.bn_name ? [d.bn_name] : [])],
        }))}
        allLabel={t("chooseDistrict")}
        className="h-8 gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground"
        aria-label={t("chooseDistrict")}
      />
      <button
        type="button"
        onClick={locate}
        disabled={finding}
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-60"
      >
        <LocateFixed className={`h-4 w-4 ${finding ? "animate-pulse" : ""}`} />
        {finding ? t("locating") : t("useMyLocation")}
      </button>
    </>
  );
};

/**
 * The whole line: "Doctors near you in [Sherpur] · Use my location". The
 * district sits in the picker; only a division — all that could be told — is
 * written out, and as one. The same on the home page and on Find Doctors.
 */
export const NearbyLine = ({ className }: { className?: string }) => {
  const t = useTranslations("specialists");
  const bangla = useLocale() === "bn";
  const { area } = useNearbyArea();
  const line = !area ? t("nearUnset")
    : area.district ? t("nearIn")
    : t("nearInPlace", { place: t("divisionName", { name: (bangla && area.bnName) || area.division }) });
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-foreground", className)}>
      <MapPin className="h-4 w-4" />
      <span>{line}</span>
      <NearbyControls />
    </div>
  );
};
