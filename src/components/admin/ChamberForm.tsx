"use client";

import { useMemo } from "react";
import { Field, Input, Select } from "@/components/admin/crud";
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
};

export const emptyChamberDraft = (): ChamberDraft => ({
  name: "", phone: "", address: "", location: "", division: "", district: "", subdistrict: "",
  consultation_fee: "", week: defaultWeek(),
});

export const draftFromChamber = (c: Chamber): ChamberDraft => ({
  name: c.name,
  phone: c.phone ?? "",
  address: c.address ?? "",
  location: c.location ?? "",
  division: c.division ?? "",
  district: c.district ?? "",
  subdistrict: c.subdistrict ?? "",
  consultation_fee: c.consultation_fee == null ? "" : String(c.consultation_fee),
  week: weekFromAvailability(c.availability),
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
});

export const ChamberForm = ({ draft, onChange, resetKey }: {
  draft: ChamberDraft;
  onChange: (patch: Partial<ChamberDraft>) => void;
  /** Remounts the hours editor when a different chamber is opened. */
  resetKey: string | number;
}) => {
  const districts = useMemo(() => (draft.division ? BD_LOCATIONS[draft.division] ?? [] : []), [draft.division]);
  const upazilas = useMemo(() => (draft.district ? BD_UPAZILAS[draft.district] ?? [] : []), [draft.district]);
  const set = (key: keyof ChamberDraft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ [key]: e.target.value });

  return (
    <>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Chamber name" required>
          <Input value={draft.name} onChange={set("name")} placeholder="Dr. Hasan's Chamber" />
        </Field>
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
