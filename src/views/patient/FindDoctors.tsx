"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DoctorCardNotBookable, DOCTOR_CARD_BUTTON } from "@/components/site/DoctorCard";
import { DoctorFinder } from "@/components/site/DoctorFinder";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { BookAppointmentDialog } from "@/components/booking/BookAppointmentDialog";
import { useDoctors, type UIDoctor } from "@/hooks/useDoctors";

/**
 * The patient's doctor search: the shared DoctorFinder (the same one as the
 * public /doctors page), with each card's button opening the booking form.
 */
const FindDoctors = () => {
  const t = useTranslations("patient.findDoctors");
  const tb = useTranslations("doctorCard");
  const { doctors, loading } = useDoctors();
  const searchParams = useSearchParams();
  // The doctor whose booking form is open — the shared one (BookAppointmentDialog).
  const [booking, setBooking] = useState<UIDoctor | null>(null);

  return (
    <PatientPortalLayout>
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl text-primary">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-3">{t("subtitle")}</p>
      </div>

      <div className="mt-7">
        <DoctorFinder
          doctors={doctors}
          loading={loading}
          // The home page's search bar sends its query, specialty and place along.
          initial={{
            query: searchParams?.get("q"),
            specialty: searchParams?.get("specialty"),
            division: searchParams?.get("division"),
            district: searchParams?.get("zilla"),
            upazila: searchParams?.get("upazila"),
          }}
          action={d => d.independent ? (
            // An appointment belongs to a hospital; this doctor has none yet.
            <DoctorCardNotBookable />
          ) : (
            <button type="button" onClick={() => setBooking(d)} className={DOCTOR_CARD_BUTTON}>
              {tb("bookAppointment")}
              <ArrowRight className="h-4 w-0 opacity-0 transition-all duration-300 group-hover:w-4 group-hover:opacity-100" />
            </button>
          )}
        />
      </div>

      <BookAppointmentDialog doctor={booking} onClose={() => setBooking(null)} />
    </PatientPortalLayout>
  );
};
export default FindDoctors;
