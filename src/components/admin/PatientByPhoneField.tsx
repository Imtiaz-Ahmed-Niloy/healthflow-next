"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field, Input, Select } from "./crud";
import { PhoneInput } from "@/components/common/PhoneInput";
import { bdStoredPhone, isBdMobile } from "@/lib/phone";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import type { PatientRow } from "@/redux/api/resources";

/** As much of a patient as a row embeds — an appointment carries these. */
type PatientRef = Pick<PatientRow, "id" | "full_name" | "phone">;

/**
 * The two extra inputs this posts when the number belongs to nobody yet: the
 * name typed for them, and the number. The form that holds this field reads
 * them on save and adds the patient first (ResourceConfig.beforeSubmit).
 */
export const NEW_PATIENT_NAME = "new_patient_name";
export const NEW_PATIENT_PHONE = "new_patient_phone";

const READ_ONLY = "opacity-70 cursor-not-allowed";

/**
 * Picks a patient the way a desk does: by the number they give. Two inputs,
 * the number and the name. A full number is looked up at this hospital and the
 * name fills itself in, locked. A number nobody has yet unlocks the name, and
 * what is typed there becomes a new patient when the form is saved.
 *
 * Posts the patient's id under `name`. A family often shares one number, and
 * then the name is a choice between them rather than a guess.
 */
export const PatientByPhoneField = ({ name, defaultPatient, autoFocus }: {
  name: string;
  /** The patient already on the row being edited. */
  defaultPatient?: PatientRef | null;
  autoFocus?: boolean;
}) => {
  const t = useTranslations("admin.patients.lookup");

  const initialPhone = defaultPatient?.phone && isBdMobile(defaultPatient.phone) ? bdStoredPhone(defaultPatient.phone) : "";
  const [phone, setPhone] = useState(initialPhone);
  const [chosenId, setChosenId] = useState<string | null>(defaultPatient?.id ?? null);
  const [newName, setNewName] = useState("");

  const { data, isFetching } = useListResourceQuery(
    { resource: "patients", limit: 20, filters: { phone } },
    { skip: !phone },
  );
  const matches = phone ? ((data?.data ?? []) as PatientRow[]) : [];

  // Who the form will post. In order: the one picked, the only patient on this
  // number, and — while the number has not been touched — the patient the row
  // already had, whose number may be one we cannot look up.
  const selected: PatientRef | null =
    matches.find(m => m.id === chosenId)
    ?? (matches.length === 1 ? matches[0] : null)
    ?? (phone === initialPhone ? defaultPatient ?? null : null);

  const searching = !!phone && isFetching && !selected;
  const isNew = !!phone && !isFetching && matches.length === 0 && !selected;

  const onPhone = (next: string) => {
    setPhone(next);
    setChosenId(null);
  };

  return (
    <div className="grid grid-cols-2 gap-x-4">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <input type="hidden" name={NEW_PATIENT_NAME} value={isNew ? newName : ""} />
      <input type="hidden" name={NEW_PATIENT_PHONE} value={isNew ? phone : ""} />

      <Field label={t("phone")} required>
        <PhoneInput defaultValue={initialPhone} onChange={onPhone} autoFocus={autoFocus} required={!selected} />
      </Field>

      <Field label={t("name")} required hint={isNew ? t("newPatient") : undefined}>
        {matches.length > 1 ? (
          <Select value={selected?.id ?? ""} onChange={e => setChosenId(e.target.value || null)} required aria-label={t("name")}>
            <option value="">{t("several")}</option>
            {matches.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </Select>
        ) : isNew ? (
          <Input value={newName} onChange={e => setNewName(e.target.value)} required placeholder={t("namePlaceholder")} />
        ) : (
          <Input value={selected?.full_name ?? ""} readOnly tabIndex={-1} className={READ_ONLY}
            placeholder={searching ? t("searching") : t("numberFirst")} />
        )}
      </Field>
    </div>
  );
};
