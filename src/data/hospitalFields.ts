import type { FieldDef, FormStep } from "@/components/admin/ResourcePage";
import { BD_DIVISIONS } from "@/data/bdLocations";
import { Constants } from "@/lib/supabase/types";

/**
 * Field names are Postgres column names, snake_case, exactly as in
 * supabase/migrations/0008_hospitals.sql. Form values post straight through to
 * /api/v1/hospitals with no mapping layer — see docs/module-guide.md.
 *
 * Only `name` and `address` are required. The table holds every
 * hospital in Bangladesh, most of them captured from partial public
 * information, so everything else has to be optional.
 */

export const HOSPITAL_STEPS: FormStep[] = [
  { id: 1, label: "Hospital details" },
  // The pictures get a step of their own rather than sitting on top of step 1,
  // where they pushed the name and address below the fold.
  { id: 2, label: "Photos & Branding" },
  { id: 3, label: "Owner & Management" },
];

export const HOSPITAL_FIELDS: FieldDef[] = [
  // ===== Step 1: Hospital details =====
  { name: "name", label: "Hospital name", type: "text", required: true, step: 1 },
  { name: "trade_license", label: "Trade licence number", type: "text", step: 1 },
  { name: "trade_license_doc", label: "Trade licence (PDF)", type: "document", step: 1 },
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
  // Each licence is a number AND a scan (0061). The number is searchable and
  // printable; the PDF is what proves it. Neither replaces the other, and the
  // scans are never published — see the note at the foot of the migration.
  { name: "tin", label: "TIN", type: "text", step: 1 },
  { name: "tin_doc", label: "TIN certificate (PDF)", type: "document", step: 1 },
  { name: "bin", label: "BIN", type: "text", step: 1 },
  { name: "bin_doc", label: "BIN certificate (PDF)", type: "document", step: 1 },
  { name: "operating_license", label: "Operating licence number", type: "text", step: 1 },
  { name: "operating_license_doc", label: "Operating licence (PDF)", type: "document", step: 1 },
  { name: "other_licenses", label: "Other licences & accreditations", type: "textarea", step: 1 },
  { name: "other_licenses_doc", label: "Other licences & accreditations (PDF)", type: "document", step: 1 },

  // The scans arrived in 0061, and NOT through the `file` / `files` widgets:
  // those embed their contents as base64 data URIs, which would write
  // megabytes into a text column. `document` uploads to R2 and stores the key,
  // the way `image` does for the logo.
  //
  // The expiring-link problem the old note here raised is handled rather than
  // dodged: the bucket is public, so nothing renders a document's public
  // address — /api/v1/documents checks the caller against RLS and redirects to
  // a presigned link good for one minute. Making the bucket itself private is
  // a Cloudflare setting away and needs no code change.
  //
  // Also absent: `package_id`. The old free-text `plan` select
  // (Starter/Pro/Enterprise) cannot populate a uuid foreign key; package
  // assignment needs its own UI sourced from the packages table.

  // ===== Step 3: Owner & Management body =====
  { name: "owner_name", label: "Owner full name", type: "text", step: 3 },
  { name: "ownership_type", label: "Ownership type", type: "select", options: ["", "Individual / Proprietor", "Partnership", "Private Limited Company", "Public Limited Company", "Trust / NGO", "Government", "Other"], step: 3 },
  { name: "owner_nid", label: "Owner NID / Passport No.", type: "text", step: 3 },
  { name: "owner_email", label: "Owner email (fallback for the admin login)", type: "email", step: 3 },
  { name: "owner_phone", label: "Owner phone", type: "tel", step: 3 },
  { name: "owner_since", label: "Owner since (date)", type: "date", step: 3 },
  { name: "owner_address", label: "Owner address", type: "textarea", step: 3 },
  { name: "chairman", label: "Chairman / Board Chair", type: "text", step: 3 },
  { name: "ceo", label: "CEO / Managing Director", type: "text", step: 3 },
  { name: "medical_director", label: "Medical Director", type: "text", step: 3 },
  {
    name: "management_body", label: "Management body members", type: "people",
    addLabel: "Add management member",
    roleOptions: [
      "Chairman", "Vice Chairman", "CEO / Managing Director", "Medical Director",
      "Director of Nursing", "Chief Financial Officer", "Chief Operating Officer",
      "HR Director", "IT Director", "Board Member", "Other",
    ],
    step: 3,
  },
  { name: "board_notes", label: "Board / governance notes", type: "textarea", step: 3 },

  // ===== Step 2: Photos & Branding =====
  // Both upload to R2 and store the object KEY, not a URL — see src/lib/media.ts.
  { name: "logo_url", label: "Hospital logo", type: "image", folder: "hospitals", step: 2 },
  // The wide photo across the top of /hospitals/<slug>. Published, unlike the
  // licence scans on step 1 — hospitals_public carries this column (0008), so
  // whatever goes here is visible to the whole internet.
  { name: "cover_image_url", label: "Hospital cover photo", type: "image", folder: "hospitals", step: 2 },
];
