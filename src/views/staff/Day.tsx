"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Loader2, LogOut, MapPin, Phone, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Btn, Pill } from "@/components/admin/ui";
import { useSession } from "@/lib/auth/useSession";
import type { TeamRole } from "@/lib/doctorTeam";

/**
 * /staff — where a member of a doctor's team lands (0147): their doctor's
 * patients on a day, and nothing else. Everything on it comes from
 * /api/v1/staff, which asks doctor_staff_queue; the phone column is there
 * only for the roles that call patients.
 */

type Me = {
  member_name: string;
  member_role: TeamRole;
  status: string;
  doctor_name: string;
  place_name: string | null;
};

type Row = {
  appointment_id: string;
  scheduled_time: string | null;
  status: string;
  priority: string | null;
  walk_in: boolean;
  patient_name: string | null;
  patient_phone: string | null;
  place_name: string;
};

const STATUS_TONE: Record<string, "ok" | "info" | "default"> = {
  scheduled: "info",
  completed: "ok",
  cancelled: "default",
};

/** The browser's own date, so "today" is the member's local day. */
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const Day = () => {
  const t = useTranslations("portal.staff");
  const tr = useTranslations("portal.team.roles");
  const tc = useTranslations("common");
  const router = useRouter();
  const { signOut } = useSession();
  const [date, setDate] = useState(localToday);
  const [me, setMe] = useState<Me | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/v1/staff?date=${date}`)
      .then(async res => {
        const body = await res.json().catch(() => null);
        if (!live) return;
        if (res.status === 404) { setMissing(true); return; }
        if (!res.ok) { toast.error(t("loadFailed"), { description: body?.error?.message }); return; }
        setMe(body.data.me);
        setRows(body.data.queue ?? []);
      })
      .catch(() => live && toast.error(tc("networkError")))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [date, t, tc]);

  const doctor = me?.doctor_name ?? "";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl text-primary">{me ? t("title", { doctor }) : "HealthFlow"}</h1>
            {me && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("subtitle", { doctor, role: tr(`${me.member_role}.one`) })}
                {me.place_name && <> {t("atPlace", { place: me.place_name })}</>}
              </p>
            )}
          </div>
          <Btn variant="outline" onClick={async () => { await signOut(); toast.success(tc("signedOut")); router.replace("/signin"); router.refresh(); }}>
            <LogOut className="h-4 w-4" /> {t("signOut")}
          </Btn>
        </div>

        {missing ? (
          <p className="mt-10 rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center text-sm text-muted-foreground">{t("notOnTeam")}</p>
        ) : me && me.status !== "active" ? (
          <p className="mt-10 rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center text-sm text-muted-foreground">{t("paused", { doctor })}</p>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">{t("date")}</span>
                <input type="date" value={date} onChange={e => { if (e.target.value) { setLoading(true); setDate(e.target.value); } }}
                  className="bg-transparent outline-none" />
              </label>
              <div className="flex items-center gap-3">
                {date !== localToday() && (
                  <button type="button" onClick={() => { setLoading(true); setDate(localToday()); }}
                    className="text-sm font-semibold text-primary hover:underline">{t("today")}</button>
                )}
                {!loading && <span className="text-sm text-muted-foreground">{t("count", { count: rows.length })}</span>}
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <UsersRound className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-4 font-semibold text-foreground">{t("emptyTitle")}</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("emptyBody", { doctor })}</p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {rows.map((r, i) => (
                    <li key={r.appointment_id} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chip text-sm font-semibold text-primary">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{r.patient_name || t("unnamed")}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{r.scheduled_time ? r.scheduled_time.slice(0, 5) : t("noTime")}</span>
                          <span className="inline-flex items-center gap-1 min-w-0"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{r.place_name}</span></span>
                          {r.patient_phone && (
                            <a href={`tel:${r.patient_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Phone className="h-3.5 w-3.5" />{r.patient_phone}
                            </a>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Pill tone={STATUS_TONE[r.status] ?? "default"}>
                          {r.status in STATUS_TONE ? t(`statuses.${r.status as "scheduled" | "completed" | "cancelled"}`) : r.status}
                        </Pill>
                        {r.walk_in && <span className="text-[11px] text-muted-foreground">{t("walkIn")}</span>}
                        {r.priority === "high" && <Pill tone="bad">{t("priorities.high")}</Pill>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default Day;
