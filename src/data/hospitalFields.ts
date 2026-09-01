import type { FieldDef, FormStep } from "@/components/admin/ResourcePage";
import { BD_DIVISIONS } from "@/data/bdLocations";
import { Constants } from "@/lib/supabase/types";

/**
 * Field names are Postgres column names, snake_case, exactly as in
 * supabase/migrations/0008_hospitals.sql. Form values post straight through to
 * /api/v1/hospitals with no mapping layer — see docs/module-guide.md.
 *
 * Only `name`, `trade_license` and `address` are required. The table holds every
 * hospital in Bangladesh, most of them captured from partial public
 * information, so everything else has to be optional.
 */

export const HOSPITAL_STEPS: FormStep[] = [
  { id: 1, label: "Hospital details" },
  { id: 2, label: "Owner & Management" },
];

export const HOSPITAL_FIELDS: FieldDef[] = [
  // ===== Step 1: Hospital details =====
  // Uploads to R2 and stores the object key, not a URL — see src/lib/media.ts.
  { name: "logo_url", label: "Hospital logo", type: "image", folder: "hospitals", step: 1 },
  { name: "name", label: "Hospital name", type: "text", required: true, step: 1 },
  { name: "trade_license", label: "Trade licence number", type: "text", required: true, step: 1 },
  { name: "tagline", label: "Tagline / Short description", type: "text", step: 1 },
  { name: "location", label: "Location (City, Country)", type: "text", step: 1 },
  { name: "address", label: "Full address", type: "text", required: true, step: 1 },
  { name: "division", label: "Division", type: "select", options: ["", ...BD_DIVISIONS], step: 1 },
  { name: "district", label: "District (Zilla)", type: "text", step: 1 },
  { name: "subdistrict", label: "Subdistrict (Upazila)", type: "text", step: 1 },
  { name: "created_at", label: "Date added", type: "date", step: 1 },
  { name: "region", label: "Region", type: "text", step: 1 },
  { name: "founded_year", label: "Founded (year)", type: "number", step: 1 },
  { name: "beds", label: "Total beds", type: "number", step: 1 },
  { name: "doctor_count", label: "Doctors count", type: "number", step: 1 },
  // numberStep, not just the label, because tenants.rating is numeric(2,1).
  // A number input defaults to step=1, so without this "4.5" makes the whole
  // form unsubmittable — and silently, since the browser reports it on a field
  // that has scrolled out of the dialog. (`step` here is the wizard page.)
  { name: "rating", label: "Rating (0–5)", type: "number", step: 1, min: 0, max: 5, numberStep: 0.1 },
  { name: "reviews_count", label: "Reviews count", type: "number", step: 1 },
  { name: "contact_phone", label: "Main phone", type: "tel", step: 1 },
  // The label carries the warning because `hint` only renders on file widgets.
  { name: "contact_email", label: "Main email (the admin login is created for this address)", type: "email", step: 1 },
  { name: "additional_phones", label: "Other phone numbers", type: "list", itemType: "tel", placeholder: "+880 1700 000000", step: 1 },
  { name: "additional_emails", label: "Other email addresses", type: "list", itemType: "email", placeholder: "info@example.com", step: 1 },
  { name: "websites", label: "Website URLs", type: "list", itemType: "url", placeholder: "https://example.com", step: 1 },
  { name: "social", label: "Social media links", type: "social", step: 1 },
  { name: "certifications", label: "Certifications / Accreditation", type: "text", step: 1 },
  {
    name: "status",
    label: "Status",
    type: "select",
    // Read from the generated enum so the form cannot drift from the database.
    options: [...Constants.public.Enums.tenant_status],
    step: 1,
  },
  // Seven days, each with its own open/close, posted as one JSON value.
  // Old free-text values still render on the public page — see src/lib/hours.ts.
  { name: "opening_hours", label: "Operating hours", type: "hours", step: 1 },
  { name: "specialties", label: "Specialties (comma separated)", type: "textarea", step: 1 },
  { name: "facilities", label: "Facilities (comma separated)", type: "textarea", step: 1 },
  { name: "awards", label: "Awards (comma separated)", type: "textarea", step: 1 },
  { name: "summary", label: "Summary", type: "textarea", step: 1 },
  { name: "about", label: "About / Full description", type: "textarea", step: 1 },
  { name: "tin", label: "TIN", type: "text", step: 1 },
  { name: "bin", label: "BIN", type: "text", step: 1 },
  { name: "operating_license", label: "Operating licence number", type: "text", step: 1 },
  { name: "other_licenses", label: "Other licences & accreditations", type: "textarea", step: 1 },

  // The scanned documents are still absent, and for the original reason: the
  // `file` / `files` widgets embed their contents as base64 data URIs, which
  // would write megabytes into a text column. The columns above hold the
  // reference *numbers*; the scans are a separate task under HF-8, and they
  // need a private bucket with expiring links rather than the public one the
  // logo uses (docs/image-uploads-r2.md).
  //
  // `image` no longer has that problem — it uploads to R2 and stores a key —
  // which is what let the logo above be added. `cover_image_url` can follow
  // the same way whenever HF-8 wants it.
  //
  // Also absent: `package_id`. The old free-text `plan` select
  // (Starter/Pro/Enterprise) cannot populate a uuid foreign key; package
  // assignment needs its own UI sourced from the packages table.

  // ===== Step 2: Owner & Management body =====
  { name: "owner_name", label: "Owner full name", type: "text", step: 2 },
  { name: "ownership_type", label: "Ownership type", type: "select", options: ["", "Individual / Proprietor", "Partnership", "Private Limited Company", "Public Limited Company", "Trust / NGO", "Government", "Other"], step: 2 },
  { name: "owner_nid", label: "Owner NID / Passport No.", type: "text", step: 2 },
  { name: "owner_email", label: "Owner email (fallback for the admin login)", type: "email", step: 2 },
  { name: "owner_phone", label: "Owner phone", type: "tel", step: 2 },
  { name: "owner_since", label: "Owner since (date)", type: "date", step: 2 },
  { name: "owner_address", label: "Owner address", type: "textarea", step: 2 },
  { name: "chairman", label: "Chairman / Board Chair", type: "text", step: 2 },
  { name: "ceo", label: "CEO / Managing Director", type: "text", step: 2 },
  { name: "medical_director", label: "Medical Director", type: "text", step: 2 },
  {
    name: "management_body", label: "Management body members", type: "people",
    addLabel: "Add management member",
    roleOptions: [
      "Chairman", "Vice Chairman", "CEO / Managing Director", "Medical Director",
      "Director of Nursing", "Chief Financial Officer", "Chief Operating Officer",
      "HR Director", "IT Director", "Board Member", "Other",
    ],
    step: 2,
  },
  { name: "board_notes", label: "Board / governance notes", type: "textarea", step: 2 },
];
