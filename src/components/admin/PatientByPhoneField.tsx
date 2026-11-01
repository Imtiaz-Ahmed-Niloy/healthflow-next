"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Field, Input } from "./crud";
import { PhoneInput } from "@/components/common/PhoneInput";
import { bdLocalPart, bdStoredPhone, isBdMobile } from "@/lib/phone";
import { useListResourceQuery } from "@/redux/api/createResourceApi";
import type { PatientRow } from "@/redux/api/resources";
import {
  CheckCircle2, UserPlus, Phone, Calendar, Heart, User,
  Users, AlertCircle, Sparkles, ArrowRight, X,
} from "lucide-react";
import { differenceInYears } from "date-fns";
import { useFormatters } from "@/lib/appSettings";

/** As much of a patient as a row embeds — an appointment carries these. */
type PatientRef = Pick<PatientRow, "id" | "full_name"> & {
  phone?: string | null;
  mrn?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_group?: string | null;
  address?: string | null;
};

export const NEW_PATIENT_NAME = "new_patient_name";
export const NEW_PATIENT_PHONE = "new_patient_phone";
export const NEW_PATIENT_GENDER = "new_patient_gender";
export const NEW_PATIENT_DOB = "new_patient_dob";
export const NEW_PATIENT_BLOOD_GROUP = "new_patient_blood_group";

export type PatientSelectedDetails = {
  patientId: string;
  patientName: string;
  patient?: PatientRef | null;
  isNew?: boolean;
  newPatient?: {
    full_name: string;
    phone: string;
    gender?: string;
    date_of_birth?: string;
    blood_group?: string;
  } | null;
};

const READ_ONLY = "opacity-75 cursor-not-allowed bg-muted/30 font-semibold text-primary";

const BLOOD_GROUPS: Record<string, string> = {
  o_positive: "O+",
  o_negative: "O−",
  a_positive: "A+",
  a_negative: "A−",
  b_positive: "B+",
  b_negative: "B−",
  ab_positive: "AB+",
  ab_negative: "AB−",
};

const bloodGroupLabel = (value: string | null | undefined) =>
  value ? BLOOD_GROUPS[value] || value.toUpperCase() : null;

const ageOf = (dob: string | null | undefined) =>
  dob ? differenceInYears(new Date(), new Date(dob)) : null;

export const PatientByPhoneField = ({
  name = "patient_id",
  defaultPatient,
  autoFocus,
  onPatientChange,
}: {
  name?: string;
  defaultPatient?: PatientRef | null;
  autoFocus?: boolean;
  onPatientChange?: (details: PatientSelectedDetails | null) => void;
}) => {
  const t = useTranslations("admin.patients.lookup");
  const { formatDate } = useFormatters();

  const initialPhone =
    defaultPatient?.phone && isBdMobile(defaultPatient.phone)
      ? bdStoredPhone(defaultPatient.phone)
      : "";

  const [phone, setPhone] = useState(initialPhone);
  const [rawDigits, setRawDigits] = useState(bdLocalPart(initialPhone));
  const [chosenId, setChosenId] = useState<string | null>(defaultPatient?.id ?? null);
  const [forceNew, setForceNew] = useState(false);

  // New patient draft fields
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newBloodGroup, setNewBloodGroup] = useState("");

  // Search by raw digits or phone
  const searchDigits = rawDigits.length >= 4 ? rawDigits : phone ? bdLocalPart(phone) : "";

  const { data, isFetching } = useListResourceQuery(
    { resource: "patients", limit: 20, q: searchDigits },
    { skip: searchDigits.length < 4 }
  );

  const patientResults = useMemo(() => ((data?.data ?? []) as PatientRow[]), [data]);

  // Exact matching patients by phone number
  const exactMatches = useMemo(() => {
    if (!searchDigits) return [];
    return patientResults.filter(
      (p) => p.phone && bdLocalPart(p.phone) === searchDigits
    );
  }, [patientResults, searchDigits]);

  // Partial autocomplete suggestions when typing 4..9 digits
  const suggestions = useMemo(() => {
    if (searchDigits.length >= 4 && searchDigits.length < 10 && !chosenId) {
      return patientResults.slice(0, 5);
    }
    return [];
  }, [patientResults, searchDigits, chosenId]);

  // Resolved selected patient
  const selected: PatientRef | null = useMemo(() => {
    if (forceNew) return null;
    if (chosenId) {
      const match = patientResults.find((p) => p.id === chosenId);
      if (match) return match;
    }
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }
    if (phone === initialPhone && defaultPatient) {
      return defaultPatient;
    }
    return null;
  }, [forceNew, chosenId, exactMatches, patientResults, phone, initialPhone, defaultPatient]);

  const isFullNumber = isBdMobile(searchDigits);
  const searching = isFetching && !selected;

  // Auto-select first exact match when full phone number is reached
  useEffect(() => {
    if (isFullNumber && exactMatches.length > 0 && !chosenId && !forceNew) {
      setChosenId(exactMatches[0].id);
    }
  }, [isFullNumber, exactMatches, chosenId, forceNew]);

  const onPatientChangeRef = useRef(onPatientChange);
  useEffect(() => {
    onPatientChangeRef.current = onPatientChange;
  }, [onPatientChange]);

  const lastEmittedSigRef = useRef<string | null>(null);

  // Notify parent component only when patient selection or details actually change
  useEffect(() => {
    if (!onPatientChangeRef.current) return;

    let payload: PatientSelectedDetails | null = null;
    let signature = "null";

    if (selected) {
      payload = {
        patientId: selected.id,
        patientName: selected.full_name,
        patient: selected,
        isNew: false,
      };
      signature = `selected:${selected.id}:${selected.full_name}`;
    } else {
      payload = {
        patientId: "",
        patientName: newName,
        isNew: true,
        newPatient: {
          full_name: newName,
          phone: phone || (rawDigits ? `0${rawDigits}` : ""),
          gender: newGender || undefined,
          date_of_birth: newDob || undefined,
          blood_group: newBloodGroup || undefined,
        },
      };
      signature = `manual:${newName}:${phone || rawDigits}:${newGender}:${newDob}:${newBloodGroup}`;
    }

    if (lastEmittedSigRef.current !== signature) {
      lastEmittedSigRef.current = signature;
      onPatientChangeRef.current(payload);
    }
  }, [
    selected,
    newName,
    phone,
    rawDigits,
    newGender,
    newDob,
    newBloodGroup,
  ]);

  const handlePhoneComplete = (next: string) => {
    setPhone(next);
    setChosenId(null);
    setForceNew(false);
  };

  const handleRawChange = (digits: string) => {
    setRawDigits(digits);
    if (digits.length < 10) {
      setChosenId(null);
      setForceNew(false);
    }
  };

  const handlePickSuggestion = (p: PatientRow) => {
    if (p.phone) {
      const stored = bdStoredPhone(p.phone);
      setPhone(stored);
      setRawDigits(bdLocalPart(stored));
    }
    setChosenId(p.id);
    setForceNew(false);
  };

  return (
    <div className="space-y-3">
      {/* Hidden inputs posted with the form */}
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <input
        type="hidden"
        name={NEW_PATIENT_NAME}
        value={!selected ? newName : ""}
      />
      <input
        type="hidden"
        name={NEW_PATIENT_PHONE}
        value={!selected ? phone || (rawDigits ? (rawDigits.startsWith("0") ? rawDigits : `0${rawDigits}`) : "") : ""}
      />
      <input
        type="hidden"
        name={NEW_PATIENT_GENDER}
        value={!selected ? newGender : ""}
      />
      <input
        type="hidden"
        name={NEW_PATIENT_DOB}
        value={!selected ? newDob : ""}
      />
      <input
        type="hidden"
        name={NEW_PATIENT_BLOOD_GROUP}
        value={!selected ? newBloodGroup : ""}
      />

      {/* Main input row: Phone + Patient Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <Field label={t("phone")} required>
            <PhoneInput
              defaultValue={initialPhone}
              value={rawDigits}
              onChange={handlePhoneComplete}
              onRawChange={handleRawChange}
              autoFocus={autoFocus}
              required={!selected}
            />
          </Field>

          {/* Autocomplete suggestions dropdown while typing */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border shadow-lg rounded-xl z-50 overflow-hidden text-xs">
              <div className="px-3 py-1.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Matching Patients ({suggestions.length})</span>
                <span className="text-[10px]">Click to auto-fill</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePickSuggestion(p)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/70 flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary">
                        {p.full_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
                        <span>{p.phone || "No phone"}</span>
                        {p.mrn && <span>• {p.mrn}</span>}
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Field
            label={t("name")}
            required
            hint={
              selected
                ? "Auto-filled from existing patient account"
                : "Type patient name manually"
            }
          >
            {selected ? (
              <div className="relative">
                <Input
                  value={selected.full_name}
                  readOnly
                  className={READ_ONLY}
                />
                <button
                  type="button"
                  onClick={() => {
                    setChosenId(null);
                    setForceNew(true);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary hover:underline bg-background/90 px-2 py-0.5 rounded cursor-pointer"
                  title="Type patient name manually"
                >
                  Type Manually
                </button>
              </div>
            ) : (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Enter patient full name"
              />
            )}
          </Field>
        </div>
      </div>

      {/* Multiple Family Accounts Selector (when 2+ patients share the number) */}
      {exactMatches.length > 1 && !forceNew && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
            <Users className="h-3.5 w-3.5" />
            <span>Multiple patients found under this mobile number:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {exactMatches.map((m) => {
              const isPicked = selected?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setChosenId(m.id);
                    setForceNew(false);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isPicked
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-foreground hover:bg-muted border-border"
                  }`}
                >
                  <User className="h-3 w-3" />
                  <span>{m.full_name}</span>
                  {m.mrn && <span className="text-[10px] opacity-80 font-mono">({m.mrn})</span>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setForceNew(true);
                setChosenId(null);
                setNewName("");
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="h-3 w-3" />
              <span>+ New Family Member</span>
            </button>
          </div>
        </div>
      )}

      {/* Verified Existing Patient Profile Card */}
      {selected && (
        <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 transition-all animate-in fade-in-50 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                {selected.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-foreground">
                    {selected.full_name}
                  </span>
                  {selected.mrn && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
                      {selected.mrn}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Patient Account Verified
                  </span>
                </div>

                {/* Sub-details: Gender, Age/DOB, Blood Group */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  {selected.gender && (
                    <span className="capitalize flex items-center gap-1 font-medium text-foreground/80">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {selected.gender}
                    </span>
                  )}

                  {selected.date_of_birth && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {ageOf(selected.date_of_birth) !== null
                        ? `${ageOf(selected.date_of_birth)} yrs (${formatDate(selected.date_of_birth)})`
                        : formatDate(selected.date_of_birth)}
                    </span>
                  )}

                  {selected.blood_group && (
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                      <Heart className="h-3 w-3" />
                      {bloodGroupLabel(selected.blood_group)}
                    </span>
                  )}

                  {selected.phone && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {selected.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Switch family member / Clear */}
            <div className="flex items-center gap-2 shrink-0">
              {exactMatches.length > 1 && (
                <button
                  type="button"
                  onClick={() => setChosenId(null)}
                  className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Switch
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setChosenId(null);
                  setRawDigits("");
                  setPhone("");
                  setForceNew(false);
                  setNewName("");
                }}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer"
                title="Disconnect patient"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Demographics (Manual Entry when no existing account is matched) */}
      {!selected && (
        <div className="bg-muted/30 border border-border/70 rounded-2xl p-4 space-y-3 transition-all animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UserPlus className="h-3.5 w-3.5" />
              </span>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Patient Demographics (Manual Entry)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {exactMatches.length === 0
                    ? "If this is a new patient, select optional demographics below."
                    : "Typing manually. A matching patient account exists for this number."}
                </span>
              </div>
            </div>

            {forceNew && exactMatches.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setForceNew(false);
                  setChosenId(exactMatches[0].id);
                }}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Use existing ({exactMatches[0].full_name})
              </button>
            )}
          </div>

          {/* Quick optional clinical demographics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border/50">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Gender
              </label>
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
                className="w-full text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Blood Group
              </label>
              <select
                value={newBloodGroup}
                onChange={(e) => setNewBloodGroup(e.target.value)}
                className="w-full text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Select Group</option>
                <option value="o_positive">O+</option>
                <option value="o_negative">O−</option>
                <option value="a_positive">A+</option>
                <option value="a_negative">A−</option>
                <option value="b_positive">B+</option>
                <option value="b_negative">B−</option>
                <option value="ab_positive">AB+</option>
                <option value="ab_negative">AB−</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
