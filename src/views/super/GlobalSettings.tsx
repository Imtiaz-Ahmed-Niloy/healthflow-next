"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2, RotateCcw, Save, Wrench } from "lucide-react";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Label } from "@/components/ui/label";
import {
  useGetGlobalSettingsQuery,
  useUpdateGlobalSettingsMutation,
  type GlobalSettingsPatch,
  type GlobalSettingsRow,
} from "@/redux/api/superApi";
import {
  TIMEZONES, TIMEZONE_LABELS, DATE_FORMATS, TIME_FORMATS, TIME_FORMAT_LABELS,
  CURRENCIES, CURRENCY_LABELS, LANGUAGES, LANGUAGE_LABELS,
} from "@/lib/globalSettings";
import { formatCurrency, formatDate, formatTime, useAppSettings } from "@/lib/appSettings";

/**
 * The platform's own defaults, from `public.global_settings` (0057).
 *
 * This screen used to be a mock: uncontrolled inputs over hardcoded strings, a
 * Save that only raised a toast, five feature flags with nothing behind them,
 * and a compliance card claiming a us-east-1 data residency, GDPR mode and
 * HIPAA logging that this product does not have. All of it is gone. What is
 * here saves, and each field changes something you can watch change.
 *
 * They are defaults, not policy: appSettings layers them under whatever a
 * person picked in their own Settings, and the note on screen says so.
 */

type Draft = Required<Pick<
  GlobalSettingsRow,
  "timezone" | "language" | "currency" | "date_format" | "time_format" | "maintenance_mode"
>> & {
  support_email: string;
  maintenance_message: string;
};

const toDraft = (row: GlobalSettingsRow): Draft => ({
  timezone: row.timezone,
  language: row.language,
  currency: row.currency,
  date_format: row.date_format,
  time_format: row.time_format,
  support_email: row.support_email ?? "",
  maintenance_mode: row.maintenance_mode,
  maintenance_message: row.maintenance_message ?? "",
});

const Select = ({
  id, label, value, onChange, children, hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div>
    <Label htmlFor={id}>{label}</Label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
    >
      {children}
    </select>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const GlobalSettings = () => {
  const { data, isLoading, error } = useGetGlobalSettingsQuery();
  const [save, { isLoading: saving }] = useUpdateGlobalSettingsMutation();

  const row = data?.data;
  const [draft, setDraft] = useState<Draft | null>(null);

  // The saved row is the source of truth; the draft is what is on screen until
  // it is saved. Re-seeded whenever the row changes, including after a save.
  useEffect(() => {
    if (row) setDraft(toDraft(row));
  }, [row]);

  /**
   * The previews below show what these settings will look like once saved —
   * not what this browser is currently rendering, which may follow a personal
   * override instead. `useAppSettings` is only here to keep them re-rendering
   * as the platform's values arrive.
   */
  useAppSettings();

  const preview = useMemo(() => {
    if (!draft) return null;
    const now = new Date();
    const as = {
      timezone: draft.timezone,
      language: draft.language,
      dateFormat: draft.date_format,
      timeFormat: draft.time_format as "12h" | "24h",
      currency: draft.currency as "USD" | "BDT" | "GBP",
    };
    return {
      date: formatDate(now, as),
      time: formatTime(now, as),
      money: formatCurrency(1250.5, as),
    };
  }, [draft]);

  const dirty = useMemo(() => {
    if (!row || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(toDraft(row));
  }, [row, draft]);

  const submit = async () => {
    if (!draft) return;
    const patch: GlobalSettingsPatch = {
      timezone: draft.timezone,
      language: draft.language,
      currency: draft.currency,
      date_format: draft.date_format,
      time_format: draft.time_format,
      // "" is a cleared field, and the column takes null for that.
      support_email: draft.support_email.trim() || null,
      maintenance_mode: draft.maintenance_mode,
      maintenance_message: draft.maintenance_message.trim() || null,
    };

    try {
      await save(patch).unwrap();
      toast.success("Settings saved", {
        description: "Everyone who has not set their own now follows these.",
      });
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message
        ?? "Please try again.";
      toast.error("Could not save settings", { description: message });
    }
  };

  return (
    <SuperLayout title="Global Settings" subtitle="Platform-wide defaults">
      {isLoading || !draft ? (
        <div className="grid lg:grid-cols-2 gap-4" aria-busy="true">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 text-destructive p-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Could not load settings. Refresh to try again.</p>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <SectionTitle title="Regional defaults" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  id="gs-timezone" label="Timezone" value={draft.timezone}
                  onChange={(v) => setDraft({ ...draft, timezone: v })}
                >
                  {TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>{TIMEZONE_LABELS[zone]}</option>
                  ))}
                </Select>

                <Select
                  id="gs-currency" label="Currency" value={draft.currency}
                  onChange={(v) => setDraft({ ...draft, currency: v })}
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>{CURRENCY_LABELS[code]}</option>
                  ))}
                </Select>

                <Select
                  id="gs-date" label="Date format" value={draft.date_format}
                  onChange={(v) => setDraft({ ...draft, date_format: v })}
                >
                  {DATE_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {format} — {formatDate(new Date(), {
                        timezone: draft.timezone,
                        language: draft.language,
                        dateFormat: format,
                        timeFormat: draft.time_format as "12h" | "24h",
                        currency: draft.currency as "USD" | "BDT" | "GBP",
                      })}
                    </option>
                  ))}
                </Select>

                <Select
                  id="gs-time" label="Clock format" value={draft.time_format}
                  onChange={(v) => setDraft({ ...draft, time_format: v })}
                >
                  {TIME_FORMATS.map((format) => (
                    <option key={format} value={format}>{TIME_FORMAT_LABELS[format]}</option>
                  ))}
                </Select>

                <Select
                  id="gs-language" label="Language" value={draft.language}
                  onChange={(v) => setDraft({ ...draft, language: v })}
                  hint="Applies to the panels; hospital content is written in whatever language its author used."
                >
                  {LANGUAGES.map((code) => (
                    <option key={code} value={code}>{LANGUAGE_LABELS[code]}</option>
                  ))}
                </Select>

                <div>
                  <Label htmlFor="gs-support">Support email</Label>
                  <input
                    id="gs-support"
                    type="email"
                    value={draft.support_email}
                    onChange={(e) => setDraft({ ...draft, support_email: e.target.value })}
                    placeholder="care@healthflowbd.com"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Shown on the maintenance notice. Leave it empty rather than wrong.
                  </p>
                </div>
              </div>

              {preview && (
                <div className="mt-5 rounded-xl bg-muted/40 p-4">
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-2">
                    HOW THAT READS
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-semibold text-primary">{preview.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time now</p>
                      <p className="font-semibold text-primary tabular-nums">{preview.time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-semibold text-primary tabular-nums">{preview.money}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <SectionTitle title="Maintenance notice" />

              <label className="flex items-start gap-3 rounded-xl bg-muted/40 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.maintenance_mode}
                  onChange={(e) => setDraft({ ...draft, maintenance_mode: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold text-primary text-sm">
                    <Wrench className="h-3.5 w-3.5" /> Show the maintenance banner
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1">
                    A yellow strip at the top of every panel and of the public site, for
                    everyone signed in or not.
                  </span>
                </span>
              </label>

              <div className="mt-4">
                <Label htmlFor="gs-maintenance-message">What it says</Label>
                <textarea
                  id="gs-maintenance-message"
                  rows={4}
                  maxLength={500}
                  value={draft.maintenance_message}
                  onChange={(e) => setDraft({ ...draft, maintenance_message: e.target.value })}
                  placeholder="Payroll exports are paused until 9pm while we move the reporting database."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {draft.maintenance_message.length}/500. Empty falls back to a general notice —
                  say what is affected and until when if you can.
                </p>
              </div>

              {/*
                Said plainly, because someone flipping this at 2am needs to know
                exactly what it does. Locking people out is a different feature
                and this is not it.
              */}
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-yellow-100/60 text-yellow-900 p-3 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  This is a notice, not a lock. Everyone can still sign in and every screen
                  still works — the banner only tells them something is going on.
                </p>
              </div>
            </Card>
          </div>

          <Card className="p-5 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground max-w-xl">
                These are defaults. Anyone who has set their own timezone, language, date
                format or currency under Settings keeps theirs — changing these moves
                everyone who never picked, which is nearly everyone.
              </p>
              <div className="flex items-center gap-2">
                {dirty && (
                  <Btn variant="outline" onClick={() => row && setDraft(toDraft(row))}>
                    <RotateCcw className="h-4 w-4" /> Discard
                  </Btn>
                )}
                <Btn onClick={() => void submit()} disabled={!dirty || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
                </Btn>
              </div>
            </div>
          </Card>
        </>
      )}
    </SuperLayout>
  );
};

export default GlobalSettings;
