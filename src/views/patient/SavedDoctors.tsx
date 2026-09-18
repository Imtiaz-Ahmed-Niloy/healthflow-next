"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { DoctorCard, DoctorCardNotBookable } from "@/components/site/DoctorCard";
import { BookAppointmentDialog } from "@/components/booking/BookAppointmentDialog";
import { useDoctors, type UIDoctor } from "@/hooks/useDoctors";
import { useSavedDoctors } from "@/hooks/useSavedDoctors";

/**
 * The doctors a patient saved from a profile (0092), newest first, each
 * bookable right here with the shared booking form and removable with the
 * heart.
 */
const SavedDoctors = () => {
  const t = useTranslations("patient.savedDoctors");
  const { doctors, loading: loadingDoctors } = useDoctors();
  const { saved, loading: loadingSaved, busy, toggle } = useSavedDoctors();
  const [booking, setBooking] = useState<UIDoctor | null>(null);

  // In the order they were saved. A saved row can belong to any of a
  // doctor's places, so each is matched to the doctor it is part of.
  const list = useMemo(() => {
    const out: UIDoctor[] = [];
    for (const s of saved) {
      const d = doctors.find(x => x.id === s.doctor_id || x.places.some(p => p.id === s.doctor_id));
      if (d && !out.includes(d)) out.push(d);
    }
    return out;
  }, [saved, doctors]);

  const loading = loadingDoctors || loadingSaved;

  return (
    <PatientPortalLayout>
      <div className="max-w-xl">
        <h1 className="font-display text-5xl text-primary">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-3">{t("subtitle")}</p>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
            <Heart className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="font-display text-2xl text-primary mt-3">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("emptyBody")}</p>
            <Link href="/patient/find-doctors" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow">
              {t("find")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {list.map((d, i) => (
              <DoctorCard
                key={d.id}
                d={d}
                i={i}
                action={
                  <div className="mt-5 flex items-center gap-2">
                    {d.independent ? (
                      <div className="flex-1"><DoctorCardNotBookable /></div>
                    ) : (
                      <button type="button" onClick={() => setBooking(d)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-glow">
                        {t("book")}
                      </button>
                    )}
                    <button type="button" onClick={() => void toggle(d)} disabled={busy}
                      title={t("remove", { name: d.name })} aria-label={t("remove", { name: d.name })}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-60">
                      <Heart className="h-4 w-4 fill-primary" />
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>

      <BookAppointmentDialog doctor={booking} onClose={() => setBooking(null)} />
    </PatientPortalLayout>
  );
};

export default SavedDoctors;
