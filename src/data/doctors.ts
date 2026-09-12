/**
 * The specialty filters on /doctors and the site search.
 *
 * This file also held a list of fifty invented doctors — names, ratings,
 * "In-Person" and "Telehealth" labels, stock photos — that nothing read any
 * more: every page lists real doctors from doctors_public (see useDoctors).
 */
export const specialtyTabs = [
  "All",
  "Cardiology",
  "Dentistry",
  "ENT",
  "Endocrinology",
  "Gastroenterology",
  "General Medicine",
  "Gynecology",
  "Nephrology",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Surgery",
  "Urology",
] as const;

export type SpecialtyTab = (typeof specialtyTabs)[number];
