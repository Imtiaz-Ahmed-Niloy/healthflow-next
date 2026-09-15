"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Clock, Loader2, Mail, Phone, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Pill } from "@/components/admin/ui";
import { Avatar } from "@/components/common/Avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamMember, TeamRole } from "@/app/api/v1/portal/team/route";

/**
 * /portal/team — everyone who works with this doctor, in one place: the
 * assistants their hospitals assign them today, and nurses and interns once
 * those are linked to a doctor (see /api/v1/portal/team). Read-only here; the
 * hospital assigns and edits its staff.
 */

const ROLE_LABEL: Record<TeamRole, { one: string; many: string }> = {
  assistant: { one: "Assistant", many: "Assistants" },
  nurse: { one: "Nurse", many: "Nurses" },
  intern: { one: "Intern", many: "Interns" },
};

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "default" }> = {
  active: { label: "Active", tone: "ok" },
  on_leave: { label: "On leave", tone: "warn" },
  suspended: { label: "Suspended", tone: "bad" },
};

const ALL = "all";

const Team = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<TeamRole | typeof ALL>(ALL);
  const [place, setPlace] = useState(ALL);

  useEffect(() => {
    fetch("/api/v1/portal/team")
      .then(async res => {
        const body = await res.json().catch(() => null);
        if (!res.ok) { toast.error(body?.error?.message || "Couldn't load your team."); return; }
        setMembers(body.data ?? []);
        setPlaces(body.places ?? []);
      })
      .catch(() => toast.error("Couldn't reach the server."))
      .finally(() => setLoading(false));
  }, []);

  // The roles actually on the team, in a fixed order — a tab per role.
  const roles = useMemo(
    () => (Object.keys(ROLE_LABEL) as TeamRole[]).filter(r => members.some(m => m.role === r)),
    [members],
  );

  const inPlace = place === ALL ? members : members.filter(m => m.place.id === place);
  const shown = role === ALL ? inPlace : inPlace.filter(m => m.role === role);

  const tab = (value: TeamRole | typeof ALL, label: string, count: number) => (
    <button
      key={value}
      type="button"
      onClick={() => setRole(value)}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${role === value ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border text-foreground/70 hover:bg-chip"}`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[11px] ${role === value ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
    </button>
  );

  return (
    <PortalLayout>
      <div>
        <h1 className="font-display text-4xl text-primary">Team Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everyone who works with you, at every hospital and chamber — the assistants your hospitals assign you, all in one place.
        </p>
      </div>

      {!loading && members.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tab(ALL, "Everyone", inPlace.length)}
            {roles.map(r => tab(r, ROLE_LABEL[r].many, inPlace.filter(m => m.role === r).length))}
          </div>
          {places.length > 1 && (
            <Select value={place} onValueChange={setPlace}>
              <SelectTrigger className="h-10 w-auto min-w-56 gap-2 rounded-full bg-card" aria-label="Hospital or chamber">
                <div className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate"><SelectValue /></span>
                </div>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>All hospitals & chambers</SelectItem>
                {places.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <UsersRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-4 font-semibold text-foreground">
              {members.length === 0 ? "No one on your team yet" : "No one here"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {members.length === 0
                ? "When a hospital assigns an assistant to you, they show up here."
                : "Nobody on your team works with you at this place."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((m, i) => {
              const status = STATUS[m.status] ?? { label: m.status, tone: "default" as const };
              return (
                <motion.div
                  key={`${m.role}-${m.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                  className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <Avatar src={null} name={m.name} className="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{m.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Pill tone="info">{ROLE_LABEL[m.role].one}</Pill>
                        <Pill tone={status.tone}>{status.label}</Pill>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><Building2 className="h-4 w-4 shrink-0" /><span className="truncate">{m.place.name}</span></p>
                    {m.shift && <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" />{m.shift} shift</p>}
                  </div>

                  <div className="mt-auto flex gap-2 pt-4">
                    {m.phone ? (
                      <a href={`tel:${m.phone}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2 text-sm font-semibold text-foreground hover:bg-chip">
                        <Phone className="h-4 w-4" /> {m.phone}
                      </a>
                    ) : (
                      <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-dashed border-border py-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" /> No phone
                      </span>
                    )}
                    {m.email && (
                      <a href={`mailto:${m.email}`} title={m.email} aria-label={`Email ${m.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground hover:bg-chip">
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default Team;
