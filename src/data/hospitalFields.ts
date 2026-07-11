import type { FieldDef, FormStep } from "@/components/admin/ResourcePage";
import { BD_DIVISIONS } from "@/data/bdLocations";

export const HOSPITAL_STEPS: FormStep[] = [
  { id: 1, label: "Hospital details" },
  { id: 2, label: "Owner & Management" },
];

export const HOSPITAL_FIELDS: FieldDef[] = [
  // ===== Step 1: Hospital details =====
  { name: "image", label: "Hospital cover photo", type: "image", step: 1 },
  { name: "name", label: "Hospital name", type: "text", required: true, step: 1 },
  { name: "tag", label: "Tagline / Short description", type: "text", step: 1 },
  { name: "location", label: "Location (City, Country)", type: "text", required: true, step: 1 },
  { name: "address", label: "Full address", type: "text", step: 1 },
  { name: "division", label: "Division", type: "select", options: ["", ...BD_DIVISIONS], step: 1 },
  { name: "district", label: "District (Zilla)", type: "text", step: 1 },
  { name: "subdistrict", label: "Subdistrict (Upazila)", type: "text", step: 1 },
  { name: "createdAt", label: "Date added", type: "date", step: 1 },
  { name: "region", label: "Region", type: "text", step: 1 },
  { name: "founded", label: "Founded (year)", type: "number", step: 1 },
  { name: "beds", label: "Total beds", type: "number", step: 1 },
  { name: "doctors", label: "Doctors count", type: "number", step: 1 },
  { name: "rating", label: "Rating (0–5)", type: "number", step: 1 },
  { name: "reviews", label: "Reviews count", type: "number", step: 1 },
  { name: "phone", label: "Phone numbers", type: "list", itemType: "tel", placeholder: "+880 1700 000000", step: 1 },
  { name: "email", label: "Email addresses", type: "list", itemType: "email", placeholder: "info@example.com", step: 1 },
  { name: "website", label: "Website URLs", type: "list", itemType: "url", placeholder: "https://example.com", step: 1 },
  { name: "social", label: "Social media links", type: "social", step: 1 },
  { name: "cert", label: "Certifications / Accreditation", type: "text", step: 1 },
  { name: "plan", label: "Subscription plan", type: "select", options: ["Starter", "Pro", "Enterprise"], step: 1 },
  { name: "status", label: "Status", type: "select", options: ["Active", "Trial", "Suspended"], step: 1 },
  { name: "hours", label: "Operating hours", type: "text", step: 1 },
  { name: "specialties", label: "Specialties (comma separated)", type: "textarea", step: 1 },
  { name: "facilities", label: "Facilities (comma separated)", type: "textarea", step: 1 },
  { name: "awards", label: "Awards (comma separated)", type: "textarea", step: 1 },
  { name: "summary", label: "Summary", type: "textarea", step: 1 },
  { name: "about", label: "About / Full description", type: "textarea", step: 1 },
  { name: "tin", label: "TIN Certificate", type: "file", hint: "Upload the Tax Identification Number certificate (PDF, PNG or JPG).", step: 1 },
  { name: "bin", label: "BIN Certificate", type: "file", hint: "Upload the Business Identification Number certificate (PDF, PNG or JPG).", step: 1 },
  { name: "tradeLicense", label: "Trade License", type: "file", hint: "Upload the current trade license (PDF, PNG or JPG).", step: 1 },
  { name: "operatingLicense", label: "Hospital Operating License", type: "file", hint: "Upload the hospital operating license (PDF, PNG or JPG).", step: 1 },
  { name: "otherLicenses", label: "Other Licenses & Accreditations", type: "files", hint: "Add accreditations, fire safety, environmental clearance, lab certifications, etc.", step: 1 },

  // ===== Step 2: Owner & Management body =====
  { name: "ownerName", label: "Owner full name", type: "text", step: 2 },
  { name: "ownershipType", label: "Ownership type", type: "select", options: ["Individual / Proprietor", "Partnership", "Private Limited Company", "Public Limited Company", "Trust / NGO", "Government", "Other"], step: 2 },
  { name: "ownerNid", label: "Owner NID / Passport No.", type: "text", step: 2 },
  { name: "ownerEmail", label: "Owner email", type: "email", step: 2 },
  { name: "ownerPhone", label: "Owner phone", type: "tel", step: 2 },
  { name: "ownerSince", label: "Owner since (date)", type: "date", step: 2 },
  { name: "ownerAddress", label: "Owner address", type: "textarea", step: 2 },
  { name: "chairman", label: "Chairman / Board Chair", type: "text", step: 2 },
  { name: "ceo", label: "CEO / Managing Director", type: "text", step: 2 },
  { name: "medicalDirector", label: "Medical Director", type: "text", step: 2 },
  {
    name: "managementBody", label: "Management body members", type: "people",
    addLabel: "Add management member",
    roleOptions: [
      "Chairman", "Vice Chairman", "CEO / Managing Director", "Medical Director",
      "Director of Nursing", "Chief Financial Officer", "Chief Operating Officer",
      "HR Director", "IT Director", "Board Member", "Other",
    ],
    step: 2,
  },
  { name: "boardNotes", label: "Board / governance notes", type: "textarea", step: 2 },
];
