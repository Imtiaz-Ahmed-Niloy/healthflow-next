"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Clock3, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ALLOWED_IDENTITY_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/media";

/**
 * The papers behind a name — /api/v1/identity-documents (0068, 0069, 0070).
 *
 * One of these sits in Personal Details for the patient's own document, and
 * another in Emergency Contact for the person they nominated. Same table, same
 * reviewer, same rules; `holder` is the only difference, which is why this is
 * one component taking a prop rather than two copies drifting apart.
 *
 * The number and the file are asked for together, the way a trade licence is:
 * the number is what anyone else can look up, the scan is what proves it.
 */

export type IdentityDoc = {
  id: string;
  kind: "birth_certificate" | "nid" | "passport";
  holder: "self" | "emergency_contact";
  file_key: string;
  file_name: string | null;
  document_number: string | null;
  status: "pending" | "verified" | "rejected";
  submitted_at: string;
  review_note: string | null;
};

export const ID_KINDS: { value: IdentityDoc["kind"]; label: string }[] = [
  { value: "nid", label: "National ID (NID)" },
  { value: "passport", label: "Passport" },
  { value: "birth_certificate", label: "Birth certificate" },
];

const inputClass =
  "w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";

const STATUS_LABEL: Record<IdentityDoc["status"], string> = {
  verified: "VERIFIED",
  rejected: "REJECTED",
  pending: "BEING CHECKED",
};

export const IdentityDocumentField = ({ holder, docs, title, note, onChanged }: {
  holder: IdentityDoc["holder"];
  /** Every document on the profile; this field takes the ones that are its own. */
  docs: IdentityDoc[];
  /**
   * Both optional: inside a card whose own heading already says whose papers
   * these are, a second title and an explanation are just noise.
   */
  title?: string;
  /** Why this document is being asked for, in the reader's terms. */
  note?: string;
  onChanged: () => void | Promise<void>;
}) => {
  const [kind, setKind] = useState<IdentityDoc["kind"]>("nid");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mine = docs.filter(d => d.holder === holder);
  // One document of each kind per holder, so this is the one being replaced.
  const existing = mine.find(d => d.kind === kind);

  // Switching type shows that document's number, not the last one typed.
  useEffect(() => {
    setNumber(mine.find(d => d.kind === kind)?.document_number ?? "");
    // `mine` is derived from docs on every render; the documents are the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, docs]);

  const upload = async (file: File) => {
    // A drop bypasses the picker's `accept` filter entirely, so check here.
    if (!(ALLOWED_IDENTITY_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Upload a photo or a PDF of the document.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 10MB.`);
      return;
    }

    setBusy(true);
    try {
      const permission = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "identity", contentType: file.type, size: file.size }),
      });
      const permissionBody = await permission.json().catch(() => null);
      if (!permission.ok) throw new Error(permissionBody?.error?.message || "Could not start the upload.");

      const { key, uploadUrl } = permissionBody.data;
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("Cloudflare refused the upload.");

      // Uploading again replaces what is on file, and the database sends it
      // back for review because the thing that was checked is gone.
      const res = await fetch(
        existing ? `/api/v1/identity-documents/${existing.id}` : "/api/v1/identity-documents",
        {
          method: existing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            holder,
            file_key: key,
            file_name: file.name,
            document_number: number.trim() || null,
          }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || "Could not save that document.");

      toast.success("Document uploaded — a reviewer will check it");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload that document.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /** Correcting the number alone. 0069 sends the document back for review. */
  const saveNumber = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/identity-documents/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_number: number.trim() || null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message || "Could not save that number.");
      toast.success("Number saved — the document goes back for review");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that number.");
    } finally {
      setBusy(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  };

  // preventDefault on dragover is what makes a drop land here at all —
  // without it the browser just navigates away to the dropped file.
  const onDragOver = (e: React.DragEvent) => {
    if (busy) return;
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    // Ignore the leave events fired while crossing the zone's own children.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  return (
    <div className="mt-7 border-t border-border/50 pt-6">
      {title && <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{title}</p>}
      {note && <p className="text-sm text-muted-foreground mt-2">{note}</p>}

      <div className={`grid gap-4 sm:grid-cols-2 max-w-xl ${title || note ? "mt-4" : ""}`}>
        <label className="space-y-1.5">
          <span className="text-[10px] tracking-widest font-bold text-muted-foreground">DOCUMENT TYPE</span>
          <select className={inputClass} value={kind} onChange={e => setKind(e.target.value as IdentityDoc["kind"])}>
            {ID_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-[10px] tracking-widest font-bold text-muted-foreground">DOCUMENT NUMBER</span>
          <input className={inputClass} value={number} onChange={e => setNumber(e.target.value)}
            placeholder={kind === "passport" ? "e.g. BQ0123456" : "The number on the document"} />
        </label>
      </div>

      {/* Correcting the number of a document already on file, without making
          anyone upload the same scan again. */}
      {existing && number.trim() !== (existing.document_number ?? "") && (
        <button type="button" onClick={() => void saveNumber()} disabled={busy}
          className="mt-3 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
          <Save className="h-3.5 w-3.5" /> Save number
        </button>
      )}

      <div
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => { if (!busy) fileRef.current?.click(); }}
        className={`mt-4 rounded-2xl border border-dashed p-6 text-center transition-colors ${
          busy ? "opacity-60" : "cursor-pointer hover:border-primary/60"
        } ${dragging ? "border-primary bg-primary/5" : "border-border/60"}`}
      >
        <input ref={fileRef} type="file" accept={ALLOWED_IDENTITY_TYPES.join(",")} className="hidden" onChange={onPick} />
        <Upload className="h-5 w-5 text-muted-foreground mx-auto" />
        <p className="text-sm font-semibold text-primary mt-2">
          {busy ? "Uploading…" : dragging ? "Drop it here." : "Drag the document here, or click to choose"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">A photo or a PDF, up to 10MB.</p>
      </div>

      {mine.length > 0 && (
        <div className="mt-5 divide-y divide-border/40">
          {mine.map(doc => (
            <div key={doc.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-primary text-sm">
                  {ID_KINDS.find(k => k.value === doc.kind)?.label ?? doc.kind}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {doc.document_number ? `No. ${doc.document_number} · ` : ""}
                  {doc.file_name ?? "Document"}
                </p>
                {doc.status === "rejected" && doc.review_note && (
                  <p className="text-xs text-destructive mt-1">{doc.review_note}</p>
                )}
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${
                doc.status === "verified" ? "bg-chip text-primary"
                  : doc.status === "rejected" ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}>
                {doc.status === "verified" ? <BadgeCheck className="h-3.5 w-3.5" />
                  : doc.status === "rejected" ? <X className="h-3.5 w-3.5" />
                  : <Clock3 className="h-3.5 w-3.5" />}
                {STATUS_LABEL[doc.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
