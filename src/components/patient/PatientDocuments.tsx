"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, FileText, FolderOpen, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ALLOWED_IDENTITY_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/media";
import { useFormatters } from "@/lib/appSettings";
import { ConfirmDialog } from "@/components/admin/crud";

/**
 * The patient's own paperwork, on /patient/medical-records (0076).
 *
 * What HealthFlow recorded sits above this on the page; this is everything
 * else — a prescription from another chamber, a blood report, an X-ray. The
 * patient says what each file is, so the list can be sorted by it.
 *
 * Files go to R2 under records/ through /api/v1/uploads, and open through
 * /api/v1/documents, which checks the row is theirs and hands back a link
 * that expires in a minute.
 */

type Kind = "prescription" | "lab_report" | "imaging" | "discharge_summary" | "vaccination" | "insurance" | "other";

const KINDS = ["prescription", "lab_report", "imaging", "discharge_summary", "vaccination", "insurance", "other"] as const satisfies readonly Kind[];

type Doc = {
  id: string;
  kind: Kind;
  title: string;
  file_key: string;
  file_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  document_date: string | null;
  notes: string | null;
  created_at: string;
};

const sizeLabel = (bytes: number | null) =>
  bytes == null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** "Blood report.pdf" → "Blood report" — a sensible starting title. */
const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

export const PatientDocuments = () => {
  const t = useTranslations("patient.documents");
  const tc = useTranslations("common");
  const kindLabel = (k: string) => t(`kinds.${(KINDS as readonly string[]).includes(k) ? (k as Kind) : "other"}`);
  const { formatDate } = useFormatters();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Kind | "all">("all");

  const [kind, setKind] = useState<Kind>("prescription");
  const [title, setTitle] = useState("");
  const [docDate, setDocDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState<Doc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/patient-documents?limit=100");
      const body = await res.json().catch(() => null);
      if (!res.ok) { toast.error(body?.error?.message || t("loadFailed")); return; }
      setDocs(body.data ?? []);
    } catch {
      toast.error(tc("networkError"));
    } finally {
      setLoading(false);
    }
  }, [t, tc]);

  useEffect(() => { void load(); }, [load]);

  const upload = async (file: File) => {
    // A drop skips the picker's `accept` filter, so check here too.
    if (!(ALLOWED_IDENTITY_TYPES as readonly string[]).includes(file.type)) {
      toast.error(t("wrongType"));
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(t("tooBig", { size: (file.size / 1024 / 1024).toFixed(1) }));
      return;
    }

    setBusy(true);
    try {
      const permission = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "records", contentType: file.type, size: file.size }),
      });
      const permissionBody = await permission.json().catch(() => null);
      if (!permission.ok) throw new Error(permissionBody?.error?.message || t("startFailed"));

      const { key, uploadUrl } = permissionBody.data;
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error(t("refused"));

      const res = await fetch("/api/v1/patient-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim() || titleFromFile(file.name) || t("document"),
          file_key: key,
          file_name: file.name,
          content_type: file.type,
          size_bytes: file.size,
          document_date: docDate || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || t("saveFailed"));

      toast.success(t("added", { kind: kindLabel(kind) }));
      setTitle("");
      setDocDate("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (doc: Doc) => {
    const res = await fetch(`/api/v1/patient-documents/${doc.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => null);
    if (!res.ok) { toast.error(body?.error?.message || t("removeFailed")); return; }
    toast.success(t("removed"));
    setDocs(d => d.filter(x => x.id !== doc.id));
  };

  const shown = filter === "all" ? docs : docs.filter(d => d.kind === filter);
  const present = KINDS.filter(k => docs.some(d => d.kind === k)).map(k => ({ value: k, label: kindLabel(k) }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl text-primary">{t("title")}</h2>
        {present.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {[{ value: "all" as const, label: t("all") }, ...present].map(k => (
              <button key={k.value} onClick={() => setFilter(k.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  filter === k.value ? "bg-primary text-primary-foreground" : "bg-chip text-primary hover:bg-chip/70"
                }`}>
                {k.label} {String(k.value === "all" ? docs.length : docs.filter(d => d.kind === k.value).length).padStart(2, "0")}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-2">{t("subtitle")}</p>

      {/* Add one */}
      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        <label className="space-y-1.5">
          <span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("type")}</span>
          <select value={kind} onChange={e => setKind(e.target.value as Kind)}
            className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm">
            {KINDS.map(k => <option key={k} value={k}>{kindLabel(k)}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("name")}</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("namePlaceholder")}
            className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] tracking-widest font-bold text-muted-foreground">{t("date")}</span>
          <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)}
            className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
        </label>
      </div>

      <label
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) void upload(file);
        }}
        className={`mt-3 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border/70 hover:bg-muted/30"
        } ${busy ? "opacity-60 pointer-events-none" : ""}`}
      >
        <Upload className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-primary">
          {busy ? t("uploading") : t("drop")}
        </span>
        <span className="text-xs text-muted-foreground">{t("limits")}</span>
        <input ref={fileRef} type="file" className="hidden" accept={(ALLOWED_IDENTITY_TYPES as readonly string[]).join(",")}
          onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
      </label>

      {/* What is on file */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("loading")}</p>
      ) : docs.length === 0 ? (
        <div className="py-10 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-primary">{t("emptyTitle")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("emptyBody")}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {shown.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-chip/30">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-card grid place-items-center text-primary">
                {d.content_type?.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-primary text-sm truncate">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[kindLabel(d.kind), d.document_date ? formatDate(d.document_date) : t("addedOn", { date: formatDate(d.created_at) }), sizeLabel(d.size_bytes)]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              <a href={`/api/v1/documents?key=${encodeURIComponent(d.file_key)}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-chip">
                <Eye className="h-3.5 w-3.5" /> {t("view")}
              </a>
              <button onClick={() => setRemoving(d)} aria-label={t("remove", { title: d.title })}
                className="p-2 rounded-lg text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => { if (removing) void remove(removing); }}
        title={t("confirmTitle", { title: removing?.title ?? t("document") })}
        description={t("confirmBody")}
      />
    </motion.div>
  );
};
