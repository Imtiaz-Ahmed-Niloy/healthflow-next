import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { DBDoctor } from "@/hooks/useDoctors";
import type { ApprovedRows, PublicHospital, PublicLabTest, PublicRoom } from "@/hooks/useHospitals";

/**
 * The reads behind a doctor's page and a hospital's page.
 *
 * They take the client rather than importing one, so the same query runs in
 * the browser (the hooks) and on the server (src/lib/directoryPages.ts), where
 * it puts the profile into the page's HTML instead of a spinner. No hooks and
 * no browser client here, so a server component can import it.
 */
type Client = SupabaseClient<Database>;

/** A hospital's page: the hospital, its doctors, lab tests and rooms, and a few nearby. */
export type HospitalPageRows = Omit<ApprovedRows, "doctors"> & { doctors: DBDoctor[] };

export const NO_HOSPITAL: HospitalPageRows = { hospitals: [], doctors: [], labTests: [], rooms: [] };

const doctorRows = async (client: Client, slug: string) => {
  const { data, error } = await client.from("doctors_public").select("*").or(`slug.eq.${slug},person_slug.eq.${slug}`);
  if (error) throw new Error(error.message);
  return (data ?? []) as DBDoctor[];
};

/**
 * Every row of one doctor, found by their page's slug or any listing's slug
 * (0090). Empty when there is no such doctor; throws when the read failed.
 */
export const fetchDoctorRows = async (client: Client, slug: string): Promise<DBDoctor[]> => {
  const first = await doctorRows(client, slug);
  const person = first[0]?.person_slug || first[0]?.slug;
  if (!person || person === slug) return first;
  return doctorRows(client, person);
};

/**
 * One hospital with its doctors, lab tests and rooms, and a few others in the
 * same district for "related" (partners first). NO_HOSPITAL when there is no
 * such hospital; throws when the hospital itself could not be read.
 */
export const fetchHospitalPage = async (client: Client, slug: string): Promise<HospitalPageRows> => {
  const hospitalRes = await client.from("hospitals_public").select("*").eq("slug", slug).maybeSingle();
  if (hospitalRes.error) throw new Error(hospitalRes.error.message);
  if (!hospitalRes.data) return NO_HOSPITAL;
  const hospital = hospitalRes.data as PublicHospital;

  // A failed doctor/lab/room read must not blank the hospital — the page is
  // still worth rendering without that section.
  const [doctorRes, labTestRes, roomRes, relatedRes] = await Promise.all([
    client.from("doctors_public").select("*").eq("hospital_slug", slug).limit(1000),
    client.from("lab_tests_public").select("*").eq("hospital_slug", slug),
    client.from("hospital_rooms_public").select("*").eq("hospital_slug", slug),
    hospital.district
      ? client.from("hospitals_public").select("*").eq("district", hospital.district).neq("slug", slug)
          .order("is_partner", { ascending: false }).limit(3)
      : client.from("hospitals_public").select("*").neq("slug", slug).eq("is_partner", true).limit(3),
  ]);

  return {
    hospitals: [hospital, ...((relatedRes.data ?? []) as PublicHospital[])].filter((r) => r.name),
    doctors: (doctorRes.data ?? []) as DBDoctor[],
    labTests: (labTestRes.data ?? []) as PublicLabTest[],
    rooms: (roomRes.data ?? []) as PublicRoom[],
  };
};
