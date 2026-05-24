'use client';
import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { Modal } from "@/components/admin/crud";
import { statusTone } from "@/components/admin/crud";
import { generateAdminCredentials } from "@/lib/credentials";
import { load, save, uid } from "@/lib/storage";

type H = {
  id: string;
  image: string;
  name: string;
  tag: string;
  location: string;
  address: string;
  region: string;
  plan: string;
  beds: string;
  doctors: string;
  founded: string;
  rating: string;
  reviews: string;
  specialties: string;
  cert: string;
  phone: string;
  email: string;
  website: string;
  social: string;
  hours: string;
  facilities: string;
  awards: string;
  summary: string;
  about: string;
  status: string;
};

const seed: H[] = [
  {
    id: "h1", image: "", name: "Greenfield Hospital", tag: "Multi-specialty tertiary care",
    location: "New York, USA", address: "120 Greenfield Ave, NY 10001",
    region: "NY, USA", plan: "Enterprise", beds: "320", doctors: "180",
    founded: "1986", rating: "4.7", reviews: "2400",
    specialties: "Cardiology, Neurology, Oncology, Orthopedics",
    cert: "JCI Accredited",
    phone: JSON.stringify(["+1 555 0100", "+1 555 0101"]),
    email: JSON.stringify(["info@greenfield.hf", "support@greenfield.hf"]),
    website: JSON.stringify(["https://greenfield.hf"]),
    social: JSON.stringify([
      { platform: "facebook", url: "https://facebook.com/greenfield" },
      { platform: "linkedin", url: "https://linkedin.com/company/greenfield" },
    ]),
    hours: "Mon-Sun: 24/7", facilities: "ICU, Emergency, Pharmacy, Imaging, Lab",
    awards: "Best Hospital 2023, Patient Choice Award",
    summary: "Leading tertiary care hospital with advanced specialties.",
    about: "", status: "Active",
  },
];

type OnboardingRow = {
  id: string; hospital: string; plan: string; contact: string;
  stage: string; status: string; username: string; password: string; createdAt: string;
};

const ONBOARD_KEY = "onboarding";

const Page = () => {
  const [creds, setCreds] = useState<{ hospital: string; username: string; password: string } | null>(null);

  const handleCreated = (h: H) => {
    const { username, password } = generateAdminCredentials(h.name);
    const existing = load<OnboardingRow[]>(ONBOARD_KEY, []);
    const row: OnboardingRow = {
      id: uid(),
      hospital: h.name,
      plan: h.plan || "Starter",
      contact: h.email || "",
      stage: "KYC",
      status: "Pending",
      username,
      password,
      createdAt: new Date().toISOString(),
    };
    save(ONBOARD_KEY, [row, ...existing]);
    setCreds({ hospital: h.name, username, password });
    toast.success("Onboarding entry created", { description: "Awaiting approval in Onboarding queue" });
  };

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v);
    toast.success(`${label} copied`);
  };

  return (
    <SuperLayout title="Hospital Management" subtitle="Tenants, subscriptions & lifecycle">
      <ResourcePage<H> config={{
        storeKey: "super-hospitals", seed, searchFields: ["name", "region", "location"],
        statuses: ["Active", "Trial", "Suspended"],
        onCreate: handleCreated,
        columns: [
          { key: "name", label: "Hospital", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "location", label: "Location", sortable: true, accessor: r => r.location },
          { key: "plan", label: "Plan" },
          { key: "beds", label: "Beds", sortable: true, accessor: r => Number(r.beds) },
          { key: "doctors", label: "Doctors", accessor: r => Number(r.doctors) },
          { key: "rating", label: "Rating", accessor: r => Number(r.rating) },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
        ],
        fields: [
          { name: "image", label: "Hospital cover photo", type: "image" },
          { name: "name", label: "Hospital name", type: "text", required: true },
          { name: "tag", label: "Tagline / Short description", type: "text" },
          { name: "location", label: "Location (City, Country)", type: "text", required: true },
          { name: "address", label: "Full address", type: "text" },
          { name: "region", label: "Region", type: "text" },
          { name: "founded", label: "Founded (year)", type: "number" },
          { name: "beds", label: "Total beds", type: "number" },
          { name: "doctors", label: "Doctors count", type: "number" },
          { name: "rating", label: "Rating (0–5)", type: "number" },
          { name: "reviews", label: "Reviews count", type: "number" },
          { name: "phone", label: "Phone numbers", type: "list", itemType: "tel", placeholder: "+1 555 0100" },
          { name: "email", label: "Email addresses", type: "list", itemType: "email", placeholder: "info@example.com" },
          { name: "website", label: "Website URLs", type: "list", itemType: "url", placeholder: "https://example.com" },
          { name: "social", label: "Social media links", type: "social" },
          { name: "cert", label: "Certifications / Accreditation", type: "text" },
          { name: "plan", label: "Subscription plan", type: "select", options: ["Starter", "Pro", "Enterprise"] },
          { name: "status", label: "Status", type: "select", options: ["Active", "Trial", "Suspended"] },
          { name: "hours", label: "Operating hours", type: "text" },
          { name: "specialties", label: "Specialties (comma separated)", type: "textarea" },
          { name: "facilities", label: "Facilities (comma separated)", type: "textarea" },
          { name: "awards", label: "Awards (comma separated)", type: "textarea" },
          { name: "summary", label: "Summary", type: "textarea" },
          { name: "about", label: "About / Full description", type: "textarea" },
        ],
      }} />

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title="Management admin credentials generated"
        footer={
          <button onClick={() => setCreds(null)}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">
            Done
          </button>
        }>
        {creds && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
              <KeyRound className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Credentials for <span className="font-semibold text-primary">{creds.hospital}</span> have been generated and queued for approval in
                {" "}<span className="font-semibold text-primary">Onboarding</span>. Share securely — the password is shown only once.
              </p>
            </div>
            {[
              { label: "User ID", value: creds.username },
              { label: "Password", value: creds.password },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-1.5">{label.toUpperCase()}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono break-all">{value}</code>
                  <button onClick={() => copy(value, label)}
                    className="p-2 rounded-lg border border-border hover:bg-muted" title={`Copy ${label}`}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </SuperLayout>
  );
};
export default Page;
