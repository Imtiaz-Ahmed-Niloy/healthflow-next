import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/useSession";
import type { UIDoctor } from "@/hooks/useDoctors";

/** One saved doctor, as /api/v1/saved-doctors returns it (0092). */
export type SavedDoctor = { id: string; doctor_id: string; created_at: string };

/**
 * The signed-in patient's saved doctors, and saving or unsaving one.
 *
 * A doctor is saved by the doctors row the site lists them by (UIDoctor.id),
 * but a doctor at several places is one person (0090), so any of their rows
 * counts. Only a patient has a list; for anyone else it stays empty and
 * `canSave` is false.
 */
export const useSavedDoctors = () => {
  const { user, isLoading: sessionLoading } = useSession();
  const canSave = user?.role === "patient";
  const [fetched, setSaved] = useState<SavedDoctor[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  // Only a patient has a list; for anyone else it is empty and never loading.
  const saved = useMemo(() => (canSave ? fetched : []), [canSave, fetched]);
  const loading = sessionLoading || (canSave && fetching);

  useEffect(() => {
    if (sessionLoading || !canSave) return;
    let active = true;
    fetch("/api/v1/saved-doctors?limit=100")
      .then(res => res.json())
      .then(body => { if (active) setSaved(body?.data ?? []); })
      .catch(() => undefined)
      .finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [canSave, sessionLoading]);

  /** The saved entry for this doctor, by any of their rows. */
  const entryFor = useCallback(
    (d: UIDoctor) => saved.find(s => s.doctor_id === d.id || d.places.some(p => p.id === s.doctor_id)) ?? null,
    [saved],
  );

  const isSaved = useCallback((d: UIDoctor) => !!entryFor(d), [entryFor]);

  const toggle = async (d: UIDoctor) => {
    if (!canSave || busy) return;
    const entry = entryFor(d);
    setBusy(true);
    try {
      if (entry) {
        const res = await fetch(`/api/v1/saved-doctors/${entry.id}`, { method: "DELETE" });
        if (!res.ok) { toast.error("Couldn't remove them from your saved doctors."); return; }
        setSaved(list => list.filter(s => s.id !== entry.id));
        toast.success(`${d.name} removed from your saved doctors`);
      } else {
        const res = await fetch("/api/v1/saved-doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctor_id: d.id }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) { toast.error("Couldn't save this doctor.", { description: body?.error?.message }); return; }
        setSaved(list => [body.data as SavedDoctor, ...list]);
        toast.success(`${d.name} saved`, { description: "Find them under Saved Doctors in your panel." });
      }
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return { saved, loading, busy, canSave, signedIn: !!user, sessionLoading, isSaved, toggle };
};
