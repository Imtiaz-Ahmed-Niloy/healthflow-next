'use client';
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, X, CalendarDays, MapPin } from "lucide-react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { Modal } from "@/components/admin/crud";
import { statusTone } from "@/components/admin/crud";
import { generateAdminCredentials } from "@/lib/credentials";
import { load, save, uid } from "@/lib/storage";
import { BD_DIVISIONS, BD_LOCATIONS } from "@/data/bdLocations";
import { BD_UPAZILAS } from "@/data/bdUpazilas";
import { HOSPITAL_FIELDS, HOSPITAL_STEPS } from "@/data/hospitalFields";

type H = {
  id: string;
  image: string;
  name: string;
  tag: string;
  location: string;
  address: string;
  region: string;
  division: string;
  district: string;
  subdistrict: string;
  createdAt: string;
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
  tin: string;
  bin: string;
  tradeLicense: string;
  operatingLicense: string;
  otherLicenses: string;
  status: string;
  // Owner
  ownerName: string;
  ownershipType: string;
  ownerNid: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerAddress: string;
  ownerSince: string;
  // Management body
  chairman: string;
  ceo: string;
  medicalDirector: string;
  managementBody: string;
  boardNotes: string;
};

const seed: H[] = [
  {
    id: "h1", image: "", name: "Greenfield Hospital", tag: "Multi-specialty tertiary care",
    location: "Dhaka, Bangladesh", address: "120 Greenfield Ave, Dhaka 1212",
    region: "Dhaka", division: "Dhaka", district: "Dhaka", subdistrict: "Gulshan",
    createdAt: "2024-01-15",
    plan: "Enterprise", beds: "320", doctors: "180",
    founded: "1986", rating: "4.7", reviews: "2400",
    specialties: "Cardiology, Neurology, Oncology, Orthopedics",
    cert: "JCI Accredited",
    phone: JSON.stringify(["+880 1700 000000"]),
    email: JSON.stringify(["info@greenfield.hf"]),
    website: JSON.stringify(["https://greenfield.hf"]),
    social: JSON.stringify([{ platform: "facebook", url: "https://facebook.com/greenfield" }]),
    hours: "Mon-Sun: 24/7", facilities: "ICU, Emergency, Pharmacy, Imaging, Lab",
    awards: "Best Hospital 2023",
    summary: "Leading tertiary care hospital with advanced specialties.",
    about: "",
    tin: "", bin: "", tradeLicense: "", operatingLicense: "", otherLicenses: "",
    status: "Active",
    ownerName: "Dr. Rashed Karim",
    ownershipType: "Private Limited Company",
    ownerNid: "1990123456789",
    ownerEmail: "owner@greenfield.hf",
    ownerPhone: "+880 1700 000111",
    ownerAddress: "House 12, Road 7, Gulshan 1, Dhaka",
    ownerSince: "1986-04-12",
    chairman: "Dr. Rashed Karim",
    ceo: "Lila Ahmed",
    medicalDirector: "Dr. Imran Khan",
    managementBody: JSON.stringify([
      { name: "Dr. Rashed Karim", role: "Chairman", phone: "+880 1700 000111", email: "chairman@greenfield.hf" },
      { name: "Lila Ahmed", role: "CEO / Managing Director", phone: "+880 1700 000222", email: "ceo@greenfield.hf" },
      { name: "Dr. Imran Khan", role: "Medical Director", phone: "+880 1700 000333", email: "md@greenfield.hf" },
    ]),
    boardNotes: "Board meets quarterly. AGM held every January.",
  },
];

type OnboardingRow = {
  id: string; hospital: string; plan: string; contact: string;
  stage: string; status: string; username: string; password: string; createdAt: string;
};

const ONBOARD_KEY = "onboarding";

const Page = () => {
  const [creds, setCreds] = useState<{ hospital: string; username: string; password: string } | null>(null);

  // Filter state
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const districtOptions = useMemo(() => (division ? BD_LOCATIONS[division] || [] : []), [division]);
  const upazilaOptions = useMemo(() => (district ? BD_UPAZILAS[district] || [] : []), [district]);

  const filterFn = (h: H) => {
    if (division && h.division !== division) return false;
    if (district && h.district !== district) return false;
    if (subdistrict && (h.subdistrict || "").toLowerCase() !== subdistrict.toLowerCase()) return false;
    if (dateFrom && (!h.createdAt || h.createdAt < dateFrom)) return false;
    if (dateTo && (!h.createdAt || h.createdAt > dateTo)) return false;
    return true;
  };

  const hasFilter = !!(division || district || subdistrict || dateFrom || dateTo);
  const clearFilters = () => { setDivision(""); setDistrict(""); setSubdistrict(""); setDateFrom(""); setDateTo(""); };

  const extraFilters = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-1 py-0.5">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <select value={division} onChange={e => { setDivision(e.target.value); setDistrict(""); setSubdistrict(""); }}
          className="h-7 bg-transparent text-xs outline-none pr-1">
          <option value="">Division</option>
          {BD_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={district} onChange={e => { setDistrict(e.target.value); setSubdistrict(""); }}
          disabled={!division}
          className="h-7 bg-transparent text-xs outline-none pr-1 disabled:opacity-50">
          <option value="">District</option>
          {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {upazilaOptions.length > 0 ? (
          <select value={subdistrict} onChange={e => setSubdistrict(e.target.value)}
            disabled={!district}
            className="h-7 bg-transparent text-xs outline-none pr-1 disabled:opacity-50">
            <option value="">Subdistrict</option>
            {upazilaOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input value={subdistrict} onChange={e => setSubdistrict(e.target.value)}
            disabled={!district} placeholder="Subdistrict"
            className="h-7 w-28 bg-transparent text-xs outline-none disabled:opacity-50" />
        )}
      </div>
      <div className="inline-flex items-center gap-1.5 bg-muted/40 rounded-full pl-3 pr-2 py-0.5">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="h-7 bg-transparent text-xs outline-none" aria-label="From date" />
        <span className="text-xs text-muted-foreground">→</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="h-7 bg-transparent text-xs outline-none" aria-label="To date" />
      </div>
      {hasFilter && (
        <button onClick={clearFilters}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-semibold border border-border hover:bg-muted">
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );

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
        defaults: { createdAt: new Date().toISOString().slice(0, 10) } as Partial<H>,
        extraFilters,
        filterFn,
        steps: HOSPITAL_STEPS,
        columns: [
          { key: "name", label: "Hospital", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "location", label: "Location", sortable: true, accessor: r => r.location },
          { key: "district", label: "District", accessor: r => r.district || "" },
          { key: "plan", label: "Plan" },
          { key: "beds", label: "Beds", sortable: true, accessor: r => Number(r.beds) },
          { key: "doctors", label: "Doctors", accessor: r => Number(r.doctors) },
          { key: "createdAt", label: "Added", sortable: true, accessor: r => r.createdAt || "" },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
        ],
        fields: HOSPITAL_FIELDS,
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

