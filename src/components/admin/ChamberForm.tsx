"use client";

import { useMemo } from "react";
import { Field, Input, Select } from "@/components/admin/crud";
import { Switch } from "@/components/ui/switch";
import { WeeklyHoursField } from "@/components/admin/WeeklyHoursField";
import { BD_DIVISIONS, BD_LOCATIONS } from "@/data/bdLocations";
import { BD_UPAZILAS } from "@/data/bdUpazilas";
import { defaultWeek, serialiseWeek, type WeekHours } from "@/lib/hours";
import { weekFromAvailability } from "@/lib/availability";
import type { Chamber } from "@/lib/chambers";

/**
 * A chamber's details, fee and hours (0088) — the one form for it, on the
 * doctor's My Chambers page and in /super/doctors.
 */

export type ChamberDraft = {
  name: string;
  phone: string;
  address: string;
  location: string;
  division: string;
  district: string;
  subdistrict: string;
  consultation_fee: string;
  week: WeekHours;
  /** It has a name of its own (0091); without one, `name` is ignored. */
  has_name: boolean;
};

export const emptyChamberDraft = (): ChamberDraft => ({
  name: "", phone: "", address: "", location: "", division: "", district: "", subdistrict: "",
  consultation_fee: "", week: defaultWeek(), has_name: true,
});

export const draftFromChamber = (c: Chamber): ChamberDraft => ({
  // A chamber with no name has a made-up one; there is nothing of the
  // doctor's to show in the field if they turn the name on.
  name: c.has_name ? c.name : "",
  phone: c.phone ?? "",
  address: c.address ?? "",
  location: c.location ?? "",
  division: c.division ?? "",
  district: c.district ?? "",
  subdistrict: c.subdistrict ?? "",
  consultation_fee: c.consultation_fee == null ? "" : String(c.consultation_fee),
  week: weekFromAvailability(c.availability),
  has_name: c.has_name,
});

/** What /api/v1/chambers takes. */
export const chamberPayload = (d: ChamberDraft) => ({
  name: d.name.trim(),
  phone: d.phone.trim(),
  address: d.address.trim(),
  location: d.location.trim(),
  division: d.division,
  district: d.district,
  subdistrict: d.subdistrict.trim(),
  consultation_fee: d.consultation_fee.trim(),
  availability: serialiseWeek(d.week),
  has_name: d.has_name,
});

/** "Dr. Rahman's Chamber, Uttara" — what a chamber with no name is called; as chamber_made_name (0091). */
export const madeChamberName = (doctor: string, area: string) =>
  `${doctor.trim() || "Doctor"}'s Chamber${area.trim() ? `, ${area.trim()}` : ""}`;

export const ChamberForm = ({ draft, onChange, resetKey, doctorName }: {
  draft: ChamberDraft;
  onChange: (patch: Partial<ChamberDraft>) => void;
  /** Remounts the hours editor when a different chamber is opened. */
  resetKey: string | number;
  /** For showing what a chamber with no name will be called. */
  doctorName?: string;
}) => {
  const districts = useMemo(() => (draft.division ? BD_LOCATIONS[draft.division] ?? [] : []), [draft.division]);
  const upazilas = useMemo(() => (draft.district ? BD_UPAZILAS[draft.district] ?? [] : []), [draft.district]);
  const set = (key: keyof ChamberDraft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ [key]: e.target.value });

  return (
    <>
      {/* Many chambers have no name: the doctor sits there and patients know
          them by their own. Then there is no name to type, and none prints. */}
      <label className="mb-4 flex items-center justify-between gap-4 rounded-xl bg-muted/40 p-3 cursor-pointer">
        <span>
          <span className="block text-sm font-semibold text-primary">This chamber has a name</span>
          <span className="block text-xs text-muted-foreground">
            {draft.has_name
              ? "Its name heads the prescription, above the address and phone."
              : `No name to give. Patients see it as “${madeChamberName(doctorName ?? "Dr. …", draft.location)}”, and prescriptions show just the address and phone under the doctor's name.`}
          </span>
        </span>
        <Switch checked={draft.has_name} onCheckedChange={has_name => onChange({ has_name })} />
      </label>
      <div className="grid sm:grid-cols-2 gap-x-4">
        {draft.has_name && (
          <Field label="Chamber name" required>
            <Input value={draft.name} onChange={set("name")} placeholder="Popular Diagnostic, Dhanmondi" />
          </Field>
        )}
        <Field label="Phone for appointments">
          <Input type="tel" value={draft.phone} onChange={set("phone")} placeholder="01…" />
        </Field>
      </div>
      <Field label="Address">
        <Input value={draft.address} onChange={set("address")} placeholder="House, road, building or floor" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Area">
          <Input value={draft.location} onChange={set("location")} placeholder="Dhanmondi" />
        </Field>
        <Field label="Division">
          <Select value={draft.division} onChange={e => onChange({ division: e.target.value, district: "", subdistrict: "" })}>
            <option value="">—</option>
            {BD_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="District">
          <Select value={draft.district} disabled={!draft.division}
            onChange={e => onChange({ district: e.target.value, subdistrict: "" })}>
            <option value="">—</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Upazila">
          {upazilas.length ? (
            <Select value={draft.subdistrict} onChange={set("subdistrict")} disabled={!draft.district}>
              <option value="">—</option>
              {upazilas.map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          ) : (
            <Input value={draft.subdistrict} onChange={set("subdistrict")} disabled={!draft.district} />
          )}
        </Field>
        <Field label="Consultation fee">
          <Input type="number" min={0} step="0.01" value={draft.consultation_fee} onChange={set("consultation_fee")} />
        </Field>
      </div>
      <Field label="Hours at this chamber">
        <WeeklyHoursField key={resetKey} seed={() => draft.week} onChange={week => onChange({ week })} summaryLabel="Patients see" />
      </Field>
    </>
  );
};
