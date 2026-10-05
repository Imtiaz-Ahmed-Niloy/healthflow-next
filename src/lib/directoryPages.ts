import "server-only";

import { cache } from "react";
import type { Metadata } from "next";
import { BRAND_INFO } from "@/constants/brand";
import { mediaUrl } from "@/lib/media";
import { createPublicSupabase } from "@/lib/supabase/server";
import { fetchDoctorRows, fetchHospitalPage } from "@/lib/publicDirectory";
import { pageTitle, readSlug, type SlugProps } from "@/lib/pageTitle";

/**
 * A doctor's page and a hospital's page, read on the server.
 *
 * Both used to be fetched by the browser after the page opened, so what a
 * search engine received was a spinner. The page now reads the same rows
 * first (src/lib/publicDirectory.ts) and hands them to the view, which renders
 * the profile into the HTML; the title and description below come from the
 * same read (`cache` makes it one query per request, not two).
 *
 * `undefined` means the read failed — the view then fetches for itself, as it
 * always did, rather than a database hiccup turning into a 404.
 */
export const getDoctorRows = cache(async (slug: string) => {
  try {
    return await fetchDoctorRows(createPublicSupabase(), slug);
  } catch (error) {
    console.error(`Failed to load doctor "${slug}":`, error);
    return undefined;
  }
});

export const getHospitalPage = cache(async (slug: string) => {
  try {
    return await fetchHospitalPage(createPublicSupabase(), slug);
  } catch (error) {
    console.error(`Failed to load hospital "${slug}":`, error);
    return undefined;
  }
});

/** "Dhaka" — the district, or the first part of a typed location. */
const areaOf = (row: { district: string | null; location: string | null }) =>
  row.district?.trim() || row.location?.split(",")[0]?.trim() || "";

/** `text`, with `, area` unless the name already says where it is. */
const withArea = (text: string, area: string) =>
  area && !text.toLowerCase().includes(area.toLowerCase()) ? `${text}, ${area}` : text;

const social = (title: string, description: string, image: string | null): Pick<Metadata, "openGraph" | "twitter"> => ({
  openGraph: { title, description, siteName: BRAND_INFO.name, ...(image ? { images: [image] } : {}) },
  twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
});

/**
 * /doctors/[slug]: "Dr. Name – Cardiology, Dhaka | HealthFlow", and a
 * description of who they are and where they sit. The canonical URL is the
 * doctor's one page (0090), whichever listing's slug was opened.
 */
export const doctorMetadata = async (props: SlugProps): Promise<Metadata> => {
  const rows = await getDoctorRows(await readSlug(props));
  // Their first hospital or chamber, like the page itself (useDoctors).
  const d = rows?.find((r) => r.tenant_id) ?? rows?.[0];
  if (!d) return pageTitle("doctors")();

  const area = areaOf(d);
  const what = [d.specialty?.trim(), area].filter(Boolean).join(", ");
  const title = what ? `${d.name} – ${what}` : d.name;
  const who = d.specialty?.trim() ? `${d.name}, ${d.specialty.trim()} specialist` : d.name;
  // A hospital's name usually says where it is; the title carries the area.
  const where = d.hospital_name ? ` at ${d.hospital_name}` : area ? ` in ${area}` : "";
  const description = [
    `${who}${where}`,
    d.education?.trim() ?? "",
    `Chamber address, visiting hours, fees and how to get an appointment on ${BRAND_INFO.name}`,
  ].filter(Boolean).join(". ") + ".";

  return {
    title,
    description,
    alternates: { canonical: `/doctors/${encodeURIComponent(d.person_slug || d.slug)}` },
    ...social(title, description, mediaUrl(d.photo_url)),
  };
};

/**
 * /hospitals/[slug]: "Hospital Name, Dhaka – Doctor List & Appointment |
 * HealthFlow". The description is the hospital's own summary when it wrote
 * one, and otherwise says what the page holds.
 */
export const hospitalMetadata = async (props: SlugProps): Promise<Metadata> => {
  const slug = await readSlug(props);
  const page = await getHospitalPage(slug);
  const h = page?.hospitals.find((row) => row.slug === slug);
  if (!h?.name) return pageTitle("hospitals")();

  const name = withArea(h.name, areaOf(h));
  const title = `${name} – Doctor List & Appointment`;
  const count = h.doctors_listed ?? page?.doctors.length ?? 0;
  const specialties = (h.doctor_specialties ?? []).slice(0, 4).join(", ");
  const description = h.summary?.trim() || h.tagline?.trim() || [
    count > 0
      ? `${name}: ${count} ${count === 1 ? "doctor" : "doctors"}${specialties ? ` in ${specialties}` : ""}`
      : name,
    `Address, phone numbers, visiting hours and appointment details on ${BRAND_INFO.name}`,
  ].join(". ") + ".";

  return {
    title,
    description,
    alternates: { canonical: `/hospitals/${encodeURIComponent(slug)}` },
    ...social(title, description, mediaUrl(h.cover_image_url) || mediaUrl(h.logo_url)),
  };
};
