"use client";

import { useTranslations } from "next-intl";
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
 *
 * The labels read in the admin's own language, so this is a hook rather than a
 * constant: the shape is fixed, the words come from the "hospitalFields"
 * messages, keyed by the column name.
 */

export const useHospitalSteps = (): FormStep[] => {
  const t = useTranslations("hospitalFields");
  return [
    { id: 1, label: t("steps.details") },
    // The pictures get a step of their own rather than sitting on top of step 1,
    // where they pushed the name and address below the fold.
    { id: 2, label: t("steps.photos") },
    { id: 3, label: t("steps.owner") },
  ];
};

export const useHospitalFields = (): FieldDef[] => {
  const t = useTranslations("hospitalFields");
  return [
    // ===== Step 1: Hospital details =====
    { name: "name", label: t("name"), type: "text", required: true, step: 1 },
    { name: "trade_license", label: t("trade_license"), type: "text", step: 1 },
    { name: "trade_license_doc", label: t("trade_license_doc"), type: "document", step: 1 },
    { name: "tagline", label: t("tagline"), type: "text", step: 1 },
    { name: "location", label: t("location"), type: "text", step: 1 },
    { name: "address", label: t("address"), type: "text", required: true, step: 1 },
    { name: "division", label: t("division"), type: "select", options: ["", ...BD_DIVISIONS], step: 1 },
    { name: "district", label: t("district"), type: "text", step: 1 },
    { name: "subdistrict", label: t("subdistrict"), type: "text", step: 1 },
    { name: "created_at", label: t("created_at"), type: "date", step: 1 },
    { name: "region", label: t("region"), type: "text", step: 1 },
    { name: "founded_year", label: t("founded_year"), type: "number", step: 1 },
    { name: "beds", label: t("beds"), type: "number", step: 1 },
    { name: "doctor_count", label: t("doctor_count"), type: "number", step: 1 },
    // numberStep, not just the label, because tenants.rating is numeric(2,1).
    // A number input defaults to step=1, so without this "4.5" makes the whole
    // form unsubmittable — and silently, since the browser reports it on a field
    // that has scrolled out of the dialog. (`step` here is the wizard page.)
    { name: "rating", label: t("rating"), type: "number", step: 1, min: 0, max: 5, numberStep: 0.1 },
    { name: "reviews_count", label: t("reviews_count"), type: "number", step: 1 },
    { name: "contact_phone", label: t("contact_phone"), type: "tel", step: 1 },
    // The label carries the warning because `hint` only renders on file widgets.
    { name: "contact_email", label: t("contact_email"), type: "email", step: 1 },
    { name: "additional_phones", label: t("additional_phones"), type: "list", itemType: "tel", placeholder: "+880 1700 000000", step: 1 },
    { name: "additional_emails", label: t("additional_emails"), type: "list", itemType: "email", placeholder: "info@example.com", step: 1 },
    { name: "websites", label: t("websites"), type: "list", itemType: "url", placeholder: "https://example.com", step: 1 },
    { name: "social", label: t("social"), type: "social", step: 1 },
    { name: "certifications", label: t("certifications"), type: "text", step: 1 },
    {
      name: "status",
      label: t("status"),
      type: "select",
      // Read from the generated enum so the form cannot drift from the database.
      options: [...Constants.public.Enums.tenant_status],
      step: 1,
    },
    // Seven days, each with its own open/close, posted as one JSON value.
    // Old free-text values still render on the public page — see src/lib/hours.ts.
    { name: "opening_hours", label: t("opening_hours"), type: "hours", step: 1 },
    { name: "specialties", label: t("specialties"), type: "textarea", step: 1 },
    { name: "facilities", label: t("facilities"), type: "textarea", step: 1 },
    { name: "awards", label: t("awards"), type: "textarea", step: 1 },
    { name: "summary", label: t("summary"), type: "textarea", step: 1 },
    { name: "about", label: t("about"), type: "textarea", step: 1 },
    // Each licence is a number AND a scan (0061). The number is searchable and
    // printable; the PDF is what proves it. Neither replaces the other, and the
    // scans are never published — see the note at the foot of the migration.
    { name: "tin", label: t("tin"), type: "text", step: 1 },
    { name: "tin_doc", label: t("tin_doc"), type: "document", step: 1 },
    { name: "bin", label: t("bin"), type: "text", step: 1 },
    { name: "bin_doc", label: t("bin_doc"), type: "document", step: 1 },
    { name: "operating_license", label: t("operating_license"), type: "text", step: 1 },
    { name: "operating_license_doc", label: t("operating_license_doc"), type: "document", step: 1 },
    { name: "other_licenses", label: t("other_licenses"), type: "textarea", step: 1 },
    { name: "other_licenses_doc", label: t("other_licenses_doc"), type: "document", step: 1 },

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
    { name: "owner_name", label: t("owner_name"), type: "text", step: 3 },
    {
      name: "ownership_type", label: t("ownership_type"), type: "select",
      options: [
        { value: "", label: "" },
        { value: "Individual / Proprietor", label: t("ownership.individual") },
        { value: "Partnership", label: t("ownership.partnership") },
        { value: "Private Limited Company", label: t("ownership.privateLtd") },
        { value: "Public Limited Company", label: t("ownership.publicLtd") },
        { value: "Trust / NGO", label: t("ownership.trust") },
        { value: "Government", label: t("ownership.government") },
        { value: "Other", label: t("ownership.other") },
      ],
      step: 3,
    },
    { name: "owner_nid", label: t("owner_nid"), type: "text", step: 3 },
    { name: "owner_email", label: t("owner_email"), type: "email", step: 3 },
    { name: "owner_phone", label: t("owner_phone"), type: "tel", step: 3 },
    { name: "owner_since", label: t("owner_since"), type: "date", step: 3 },
    { name: "owner_address", label: t("owner_address"), type: "textarea", step: 3 },
    { name: "chairman", label: t("chairman"), type: "text", step: 3 },
    { name: "ceo", label: t("ceo"), type: "text", step: 3 },
    { name: "medical_director", label: t("medical_director"), type: "text", step: 3 },
    {
      name: "management_body", label: t("management_body"), type: "people",
      addLabel: t("addManagementMember"),
      // Stored as typed, so the roles stay in the column's own words.
      roleOptions: [
        "Chairman", "Vice Chairman", "CEO / Managing Director", "Medical Director",
        "Director of Nursing", "Chief Financial Officer", "Chief Operating Officer",
        "HR Director", "IT Director", "Board Member", "Other",
      ],
      step: 3,
    },
    { name: "board_notes", label: t("board_notes"), type: "textarea", step: 3 },

    // ===== Step 2: Photos & Branding =====
    // Both upload to R2 and store the object KEY, not a URL — see src/lib/media.ts.
    { name: "logo_url", label: t("logo_url"), type: "image", folder: "hospitals", step: 2 },
    // The wide photo across the top of /hospitals/<slug>. Published, unlike the
    // licence scans on step 1 — hospitals_public carries this column (0008), so
    // whatever goes here is visible to the whole internet.
    { name: "cover_image_url", label: t("cover_image_url"), type: "image", folder: "hospitals", step: 2 },
  ];
};
