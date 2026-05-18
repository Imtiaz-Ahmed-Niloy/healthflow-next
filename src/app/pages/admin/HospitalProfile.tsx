'use client';
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, SectionTitle, Pill } from "@/components/admin/ui";
import { Field, Input, TextArea, Select } from "@/components/admin/crud";
import { toast } from "sonner";

const tabs = ["Identity", "Branches", "Licenses", "Contacts"] as const;
type Tab = typeof tabs[number];

const HospitalProfile = () => {
  const [tab, setTab] = useState<Tab>("Identity");
  return (
    <AdminLayout title="Hospital Profile" subtitle="Identity, branches, licenses & contacts">
      <div className="inline-flex items-center gap-1 bg-muted/40 rounded-full p-1 mb-5 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold ${tab === t ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {tab === "Identity" && (
        <Card className="p-5">
          <SectionTitle title="Identity" action={<Btn onClick={() => toast.success("Saved")}>Save</Btn>} />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Hospital name"><Input defaultValue="Greenfield Hospital" /></Field>
            <Field label="Type"><Select defaultValue="General"><option>General</option><option>Specialty</option><option>Teaching</option></Select></Field>
            <Field label="Address"><Input defaultValue="221B Health Ave, NY" /></Field>
            <Field label="Phone"><Input defaultValue="+1 555 0000" /></Field>
            <Field label="Tagline"><Input defaultValue="Compassionate care, modern medicine" /></Field>
            <Field label="Description"><TextArea defaultValue="A 320-bed multi-specialty hospital serving the metropolitan area." /></Field>
          </div>
        </Card>
      )}

      {tab === "Branches" && (
        <Card className="p-5">
          <SectionTitle title="Branches" action={<Btn onClick={() => toast.success("Branch added")}>+ Add Branch</Btn>} />
          {[{ n: "Main Campus", a: "221B Health Ave, NY", b: 320 }, { n: "Westside Clinic", a: "12 Care Rd, NJ", b: 48 }].map(b => (
            <div key={b.n} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 mb-2">
              <div>
                <p className="font-semibold text-primary">{b.n}</p>
                <p className="text-xs text-muted-foreground">{b.a} · {b.b} beds</p>
              </div>
              <Btn variant="ghost" onClick={() => toast.info("Editing")}>Edit</Btn>
            </div>
          ))}
        </Card>
      )}

      {tab === "Licenses" && (
        <Card className="p-5">
          <SectionTitle title="Licenses & Accreditations" action={<Btn onClick={() => toast.success("License uploaded")}>+ Upload</Btn>} />
          {[{ n: "Operating License 2026", e: "2026-12-31", s: "Active" }, { n: "JCI Accreditation", e: "2027-08-15", s: "Active" }, { n: "Lab CLIA Certificate", e: "2026-06-30", s: "Renewal" }].map(l => (
            <div key={l.n} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 mb-2">
              <div><p className="font-semibold text-primary">{l.n}</p><p className="text-xs text-muted-foreground">Expires {l.e}</p></div>
              <Pill tone={l.s === "Active" ? "ok" : "warn"}>{l.s}</Pill>
            </div>
          ))}
        </Card>
      )}

      {tab === "Contacts" && (
        <Card className="p-5">
          <SectionTitle title="Key Contacts" />
          <div className="grid sm:grid-cols-2 gap-3">
            {[{ r: "Medical Director", n: "Dr. Imran Khan", c: "+1 555 0001" }, { r: "CFO", n: "Lila Ahmed", c: "+1 555 0002" }, { r: "Head of Nursing", n: "Nadia Sultana", c: "+1 555 0003" }, { r: "IT Manager", n: "Bilal Hossain", c: "+1 555 0004" }].map(p => (
              <div key={p.r} className="rounded-xl bg-muted/40 p-4">
                <p className="text-[10px] tracking-widest text-muted-foreground">{p.r.toUpperCase()}</p>
                <p className="font-semibold text-primary mt-1">{p.n}</p>
                <p className="text-xs text-muted-foreground">{p.c}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AdminLayout>
  );
};
export default HospitalProfile;
