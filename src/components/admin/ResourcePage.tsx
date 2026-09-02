"use client";

import { ReactNode, useState, useMemo, useRef, useEffect } from "react";
import { Upload, X, Plus, Copy, Facebook, Twitter, Instagram, Linkedin, Youtube, Globe, FileText, Paperclip, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Pill } from "./ui";
import { DataTable, Toolbar, Modal, ConfirmDialog, RowActions, Drawer, exportCSV, useCrud, Field, Input, Select, Chips, statusTone, type Column } from "./crud";
import { useResourceCrud } from "./useResourceCrud";
import { useFormatters } from "@/lib/appSettings";
import { createPortal } from "react-dom";
import {
  mediaUrl, MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES,
  MAX_DOCUMENT_BYTES, ALLOWED_DOCUMENT_TYPES, type MediaFolder,
} from "@/lib/media";
import {
  DAYS, defaultWeek, parseWeek, serialiseWeek, summariseWeek, formatDay,
  type DayKey, type DayHours, type WeekHours,
} from "@/lib/hours";

/**
 * Uploads to Cloudflare R2 and stores the object KEY, not a URL.
 *
 * It used to read the file with FileReader and put a base64 data URL straight
 * into the column — a 2MB logo became a ~2.7MB string inside Postgres, on a
 * row the public site reads. The file now goes browser -> Cloudflare directly
 * and the row holds "hospitals/2026/09/a1b2c3d4.png".
 *
 * See docs/image-uploads-r2.md and src/lib/media.ts.
 */
function ImageUploadField({ name, required, defaultValue, folder = "hospitals" }: { name: string; required?: boolean; defaultValue?: string; folder?: MediaFolder }) {
  // What goes in the column: a key for anything uploaded here, or whatever was
  // already stored (an Unsplash link, an /assets path) left untouched.
  const [stored, setStored] = useState<string>(defaultValue || "");
  // What the <img> shows. Kept separate because the browser can preview a file
  // it has in hand before R2 has finished taking it.
  const [preview, setPreview] = useState<string>(() => mediaUrl(defaultValue) || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Purely visual: the zone lights up while a file is over it.
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError(null);

    // The file input's `accept` filters the picker, but a drop bypasses it
    // entirely — someone can drag a PDF onto this. Check the type ourselves
    // rather than sending it and reading Cloudflare's refusal back.
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError("That is not an image we take — PNG, JPG, WebP, AVIF or SVG.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 5MB.`);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setBusy(true);

    try {
      const permission = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, contentType: file.type, size: file.size }),
      });
      const body = await permission.json().catch(() => null);
      if (!permission.ok) throw new Error(body?.error?.message || "Could not start the upload.");

      const { key, uploadUrl, publicUrl } = body.data;

      // Straight to Cloudflare. Never through our server.
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Cloudflare refused the upload.");

      setStored(key);
      setPreview(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that image.");
      // Put the field back how it was rather than leaving a preview of a file
      // that never landed.
      setPreview(mediaUrl(stored) || "");
    } finally {
      setBusy(false);
      URL.revokeObjectURL(localPreview);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  };

  // preventDefault on dragover is what makes a drop land here at all —
  // without it the browser navigates away to the dropped file.
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

  const openPicker = () => { if (!busy) inputRef.current?.click(); };

  const clear = () => { setStored(""); setPreview(""); setError(null); };

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex items-center gap-4 rounded-xl border border-dashed p-3 transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-border/60"
      }`}
    >
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        aria-label={preview ? "Change image" : "Choose an image"}
        className="h-24 w-24 rounded-xl bg-muted/40 border border-border/60 overflow-hidden flex items-center justify-center shrink-0 disabled:opacity-60"
      >
        {preview ? <img src={preview} alt="preview" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
      </button>
      <div className="flex-1">
        <input type="hidden" name={name} value={stored} required={required} />
        <input ref={inputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={onPick} className="hidden" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={openPicker} disabled={busy}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-60">
            <Upload className="h-3.5 w-3.5" /> {busy ? "Uploading…" : preview ? "Change" : "Upload"} image
          </button>
          {preview && !busy && (
            <button type="button" onClick={clear}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
        {error
          ? <p className="text-[11px] text-destructive mt-1.5">{error}</p>
          : <p className="text-[11px] text-muted-foreground mt-1.5">
              {dragging ? "Drop it here." : "Drag an image here, or click to choose. PNG, JPG, WebP, AVIF or SVG, up to 5MB."}
            </p>}
      </div>
    </div>
  );
}

/**
 * The seven-day operating hours editor.
 *
 * One field, one value, posted as JSON — see src/lib/hours.ts.
 *
 * Built around the fact that a hospital almost never has seven different
 * schedules. It has one, and then Friday is different. So the row does the
 * work: set a day, then "Copy to all" pushes it across the week and you
 * correct the one or two that differ. Filling seven rows by hand is possible,
 * but it is not the path the design expects anyone to take.
 *
 * Each day carries a MODE rather than only a pair of times, because "Closed"
 * and "Open 24 hours" are not times. Encoding them as 00:00–00:00 is how a
 * hospital ends up claiming to be shut and open at once.
 */
/**
 * A scanned licence or certificate — PDF, straight to R2, column holds the key
 * (0061).
 *
 * Deliberately NOT FileUploadField, which base64-encodes the file into the
 * column. That is what logos used to do, and a 2MB image became a ~2.7MB
 * string inside Postgres; a scanned licence is heavier still. Same upload path
 * as the logo instead: presigned PUT to Cloudflare, "documents/2026/09/x.pdf"
 * in the row.
 */
function DocumentUploadField({ name, required, defaultValue, hint }: { name: string; required?: boolean; defaultValue?: string; hint?: string }) {
  const [stored, setStored] = useState<string>(defaultValue || "");
  // The name of the file the user just picked, so the field says "licence.pdf"
  // rather than the opaque key. Nothing persists it — an existing document
  // falls back to the filename inside its key.
  const [label, setLabel] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Never mediaUrl(): that builds the PUBLIC address, and a licence scan is
  // not public. This route checks who is asking and hands back a link that
  // expires in a minute.
  const href = stored ? `/api/v1/documents?key=${encodeURIComponent(stored)}` : null;
  const shown = label || (stored ? stored.split("/").pop() || "Document" : "");

  const upload = async (file: File) => {
    setError(null);

    // A drop bypasses the picker's `accept` filter entirely.
    if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
      setError("Licence documents must be PDFs.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 10MB.`);
      return;
    }

    setBusy(true);
    try {
      const permission = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "documents", contentType: file.type, size: file.size }),
      });
      const body = await permission.json().catch(() => null);
      if (!permission.ok) throw new Error(body?.error?.message || "Could not start the upload.");

      const { key, uploadUrl } = body.data;

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Cloudflare refused the upload.");

      setStored(key);
      setLabel(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that document.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
  };

  // preventDefault on dragover is what makes a drop land here at all —
  // without it the browser navigates away to the dropped file.
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

  const openPicker = () => { if (!busy) inputRef.current?.click(); };

  const clear = () => { setStored(""); setLabel(""); setError(null); };

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex items-center gap-3 rounded-xl border border-dashed p-3 transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-border/60"
      }`}
    >
      <input type="hidden" name={name} value={stored} required={required} />
      <input ref={inputRef} type="file" accept="application/pdf" onChange={onPick} className="hidden" />

      <button type="button" onClick={openPicker} disabled={busy} aria-label={stored ? "Replace document" : "Choose a PDF"}
        className="h-12 w-12 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center shrink-0 disabled:opacity-60">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        {stored ? (
          <p className="text-xs font-semibold text-foreground truncate">
            {href
              ? <a href={href} target="_blank" rel="noreferrer" className="hover:underline">{shown}</a>
              : shown}
          </p>
        ) : null}
        <div className="flex items-center gap-2 mt-1">
          <button type="button" onClick={openPicker} disabled={busy}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-60">
            <Upload className="h-3.5 w-3.5" /> {busy ? "Uploading…" : stored ? "Replace" : "Upload"} PDF
          </button>
          {stored && !busy && (
            <button type="button" onClick={clear}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
        {error
          ? <p className="text-[11px] text-destructive mt-1.5">{error}</p>
          : <p className="text-[11px] text-muted-foreground mt-1.5">
              {dragging ? "Drop it here." : hint || "Drag the scan here, or click to choose. PDF, up to 10MB."}
            </p>}
      </div>
    </div>
  );
}

function WeeklyHoursField({ name, defaultValue }: { name: string; defaultValue?: unknown }) {
  const [week, setWeek] = useState<WeekHours>(() => parseWeek(defaultValue) ?? defaultWeek());


  const setDay = (key: DayKey, day: DayHours) => setWeek(w => ({ ...w, [key]: day }));

  const copyToAll = (key: DayKey) =>
    setWeek(w => DAYS.reduce((next, d) => ({ ...next, [d.key]: w[key] }), {} as WeekHours));

  const summary = summariseWeek(week);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={serialiseWeek(week)} />


      <div className="rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden">
        {DAYS.map(d => {
          const day = week[d.key];
          return (
            <div key={d.key} className="flex flex-wrap items-center gap-2 px-3 py-2 hover:bg-muted/30">
              <span className="w-24 shrink-0 text-sm font-medium text-foreground/80">{d.label}</span>

              <select
                value={day.mode}
                onChange={e => {
                  const mode = e.target.value as DayHours["mode"];
                  if (mode === "hours") {
                    // Keep the times the row last had rather than snapping
                    // back to the default and throwing away the edit.
                    const prev = day.mode === "hours" ? day : null;
                    setDay(d.key, { mode: "hours", open: prev?.open ?? "09:00", close: prev?.close ?? "17:00" });
                  } else {
                    setDay(d.key, { mode } as DayHours);
                  }
                }}
                className="bg-muted/40 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="hours">Open</option>
                <option value="24h">24 hours</option>
                <option value="closed">Closed</option>
              </select>

              {day.mode === "hours" ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={day.open}
                    onChange={e => setDay(d.key, { ...day, open: e.target.value })}
                    className="bg-muted/40 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={e => setDay(d.key, { ...day, close: e.target.value })}
                    className="bg-muted/40 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">{formatDay(day)}</span>
              )}

              <button
                type="button"
                onClick={() => copyToAll(d.key)}
                title={`Copy ${d.label} to every day`}
                className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground border border-transparent hover:border-border hover:text-primary"
              >
                <Copy className="h-3 w-3" /> Copy to all
              </button>
            </div>
          );
        })}
      </div>

      {/* What a visitor will actually be shown. The editor is seven rows; the
          public page collapses them, so the admin should see that collapse. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">Visitors see</span>
        {summary.map(row => (
          <span key={row.days} className="rounded-full bg-muted/50 px-2.5 py-1">
            <span className="font-medium text-foreground/70">{row.days}</span> · {row.hours}
          </span>
        ))}
      </div>
    </div>
  );
}

type DocFile = { name: string; type: string; data: string };

function FileUploadField({ name, required, defaultValue, accept = "image/*,application/pdf", hint }: { name: string; required?: boolean; defaultValue?: string; accept?: string; hint?: string }) {
  const init: DocFile | null = (() => {
    if (!defaultValue) return null;
    try { const p = JSON.parse(defaultValue); if (p && p.data) return p as DocFile; } catch { /* ignore */ }
    if (typeof defaultValue === "string" && defaultValue.startsWith("data:")) return { name: "document", type: defaultValue.slice(5, defaultValue.indexOf(";")) || "application/octet-stream", data: defaultValue };
    return null;
  })();
  const [file, setFile] = useState<DocFile | null>(init);
  const inputRef = useRef<HTMLInputElement>(null);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, type: f.type, data: String(reader.result || "") });
    reader.readAsDataURL(f);
  };
  const isImage = file?.type?.startsWith("image/");
  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-xl bg-muted/40 border border-border/60 overflow-hidden flex items-center justify-center shrink-0">
        {file ? (isImage ? <img src={file.data} alt={file.name} className="h-full w-full object-cover" /> : <FileText className="h-7 w-7 text-primary" />) : <Upload className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <input type="hidden" name={name} value={file ? JSON.stringify(file) : ""} required={required} />
        <input ref={inputRef} type="file" accept={accept} onChange={onPick} className="hidden" />
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" /> {file ? "Replace" : "Upload"} file
          </button>
          {file && (
            <>
              <a href={file.data} target="_blank" rel="noreferrer" download={file.name}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> {file.name}
              </a>
              <button type="button" onClick={() => setFile(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border inline-flex items-center gap-1.5">
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">{hint || "PDF, PNG or JPG."}</p>
      </div>
    </div>
  );
}

function FilesUploadField({ name, defaultValue, accept = "image/*,application/pdf", hint }: { name: string; defaultValue?: string; accept?: string; hint?: string }) {
  const init: DocFile[] = (() => {
    if (!defaultValue) return [];
    try { const p = JSON.parse(defaultValue); if (Array.isArray(p)) return p as DocFile[]; } catch { /* ignore */ }
    return [];
  })();
  const [files, setFiles] = useState<DocFile[]>(init);
  const inputRef = useRef<HTMLInputElement>(null);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    Promise.all(list.map(f => new Promise<DocFile>(res => {
      const r = new FileReader();
      r.onload = () => res({ name: f.name, type: f.type, data: String(r.result || "") });
      r.readAsDataURL(f);
    }))).then(added => setFiles(prev => [...prev, ...added]));
    if (inputRef.current) inputRef.current.value = "";
  };
  const remove = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(files)} />
      <input ref={inputRef} type="file" accept={accept} multiple onChange={onPick} className="hidden" />
      {files.length > 0 && (
        <ul className="space-y-2 mb-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              {f.type?.startsWith("image/") ? <img src={f.data} alt={f.name} className="h-8 w-8 rounded object-cover" /> : <FileText className="h-5 w-5 text-primary" />}
              <a href={f.data} download={f.name} target="_blank" rel="noreferrer" className="flex-1 text-sm truncate hover:underline">{f.name}</a>
              <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-md hover:bg-background" title="Remove">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => inputRef.current?.click()}
        className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add license / document
      </button>
      <p className="text-[11px] text-muted-foreground mt-1.5">{hint || "Add multiple PDFs or images."}</p>
    </div>
  );
}

function parseList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string" && v.trim()) {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.filter(Boolean); } catch { /* fallthrough */ }
    return v.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function ListField({ name, defaultValue, inputType = "text", placeholder }: { name: string; defaultValue?: unknown; inputType?: string; placeholder?: string }) {
  const [items, setItems] = useState<string[]>(() => {
    const arr = parseList(defaultValue);
    return arr.length ? arr : [""];
  });
  const update = (i: number, v: string) => setItems(p => p.map((x, idx) => idx === i ? v : x));
  const add = () => setItems(p => [...p, ""]);
  const remove = (i: number) => setItems(p => p.length === 1 ? [""] : p.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(items.filter(Boolean))} />
      {items.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type={inputType} value={val} onChange={e => update(i, e.target.value)} placeholder={placeholder}
            className="flex-1 bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
          <button type="button" onClick={() => remove(i)} className="p-2 rounded-lg border border-border hover:bg-muted" title="Remove">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
    </div>
  );
}

const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "twitter", label: "Twitter / X", Icon: Twitter },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "other", label: "Other", Icon: Globe },
];

type SocialLink = { platform: string; url: string };

function SocialField({ name, defaultValue }: { name: string; defaultValue?: unknown }) {
  const [items, setItems] = useState<SocialLink[]>(() => {
    if (typeof defaultValue === "string" && defaultValue.trim()) {
      try { const p = JSON.parse(defaultValue); if (Array.isArray(p)) return p; } catch { /* ignore */ }
    }
    if (Array.isArray(defaultValue)) return defaultValue as SocialLink[];
    return [{ platform: "facebook", url: "" }];
  });
  const update = (i: number, patch: Partial<SocialLink>) =>
    setItems(p => p.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const add = () => setItems(p => [...p, { platform: "facebook", url: "" }]);
  const remove = (i: number) => setItems(p => p.length === 1 ? [{ platform: "facebook", url: "" }] : p.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(items.filter(s => s.url))} />
      {items.map((s, i) => {
        const def = SOCIAL_PLATFORMS.find(p => p.key === s.platform) || SOCIAL_PLATFORMS[5];
        const Icon = def.Icon;
        return (
          <div key={i} className="flex items-center gap-2">
            <select value={s.platform} onChange={e => update(i, { platform: e.target.value })}
              className="bg-muted/40 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
              {SOCIAL_PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-lg px-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <input type="url" value={s.url} onChange={e => update(i, { url: e.target.value })}
                placeholder="https://…"
                className="flex-1 bg-transparent py-2 text-sm outline-none" />
            </div>
            <button type="button" onClick={() => remove(i)} className="p-2 rounded-lg border border-border hover:bg-muted" title="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
        <Plus className="h-3.5 w-3.5" /> Add link
      </button>
    </div>
  );
}

// ============ People (members) field ============
type Person = { name: string; role: string; phone: string; email: string };

function PeopleField({ name, defaultValue, roleOptions, addLabel }: { name: string; defaultValue?: unknown; roleOptions?: string[]; addLabel?: string }) {
  const [items, setItems] = useState<Person[]>(() => {
    if (typeof defaultValue === "string" && defaultValue.trim()) {
      try { const p = JSON.parse(defaultValue); if (Array.isArray(p)) return p as Person[]; } catch { /* ignore */ }
    }
    if (Array.isArray(defaultValue)) return defaultValue as Person[];
    return [{ name: "", role: roleOptions?.[0] || "", phone: "", email: "" }];
  });
  const update = (i: number, patch: Partial<Person>) =>
    setItems(p => p.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const add = () => setItems(p => [...p, { name: "", role: roleOptions?.[0] || "", phone: "", email: "" }]);
  const remove = (i: number) => setItems(p => p.length === 1 ? [{ name: "", role: roleOptions?.[0] || "", phone: "", email: "" }] : p.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items.filter(m => m.name || m.role))} />
      {items.map((m, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <User className="h-3.5 w-3.5" /> Member {i + 1}
            </div>
            <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg border border-border hover:bg-muted" title="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={m.name} onChange={e => update(i, { name: e.target.value })} placeholder="Full name"
              className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60" />
            {roleOptions && roleOptions.length > 0 ? (
              <select value={m.role} onChange={e => update(i, { role: e.target.value })}
                className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60">
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input value={m.role} onChange={e => update(i, { role: e.target.value })} placeholder="Role / designation"
                className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60" />
            )}
            <input type="tel" value={m.phone} onChange={e => update(i, { phone: e.target.value })} placeholder="Phone"
              className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60" />
            <input type="email" value={m.email} onChange={e => update(i, { email: e.target.value })} placeholder="Email"
              className="bg-card rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary border border-border/60" />
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
        <Plus className="h-3.5 w-3.5" /> {addLabel || "Add member"}
      </button>
    </div>
  );
}

export type SelectOption = string | { value: string; label: string };

/** Normalises the two accepted option shapes to the one the markup needs. */
/**
 * One value in the view drawer.
 *
 * The drawer used to print `String(v)` for every column, which is fine for a
 * name and useless for everything else: the weekly hours, the social links and
 * the management body are all objects, and every one of them rendered as
 * "[object Object]". The columns that hold real structure are the ones a
 * person opens the drawer to read.
 */
/**
 * A uuid is not information — nobody recognises
 * "bb2c5b38-1745-4677-8de8-69c6eeb8ee40" as the Growth package. The drawer
 * drops these columns entirely; where the name matters, the resource embeds
 * the row it points at (hospitals embeds `packages`) and that is shown instead.
 */
const isIdColumn = (key: string) => key === "id" || key.endsWith("_id");

/** "owner_email" reads better as "OWNER EMAIL" than "OWNER_EMAIL". */
const label = (key: string) => key.replace(/_/g, " ").toUpperCase();

/**
 * Columns that hold a picture rather than a word: logo_url, cover_image_url,
 * photo_url, avatar_url. The stored value is an R2 key, which tells the reader
 * nothing; the picture tells them everything.
 */
const isImageColumn = (key: string) => /(logo|image|photo|avatar|cover)/.test(key);

/** A thumbnail in the drawer, full size on click. */
const DetailImage = ({ value }: { value: string }) => {
  const [zoom, setZoom] = useState(false);
  const src = mediaUrl(value);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  // No R2 public base configured, or an empty column: show what is stored
  // rather than a broken image.
  if (!src) return <>{value}</>;

  return (
    <>
      <button type="button" onClick={() => setZoom(true)} title="Open full size"
        className="block rounded-lg overflow-hidden border border-border/60 hover:border-primary transition-colors">
        <img src={src} alt="" className="h-24 w-24 object-cover" />
      </button>

      {zoom && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-6 animate-in fade-in duration-150"
        >
          <button type="button" aria-label="Close" onClick={() => setZoom(false)}
            className="absolute top-4 right-4 h-9 w-9 grid place-items-center rounded-full bg-card/90 border border-border/60 text-muted-foreground hover:text-primary">
            <X className="h-4 w-4" />
          </button>
          {/* Clicking the picture itself must not close what you opened to look at. */}
          <img src={src} alt="" onClick={e => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl" />
        </div>,
        document.body,
      )}
    </>
  );
};

/** "2026-08-29" and "2026-08-29T16:43:16.659416+00:00" respectively. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

const DetailValue = ({ name, value }: { name: string; value: unknown }) => {
  // The platform's timezone, date format and clock format (0057) — so a row
  // written at 16:43 UTC reads as the Dhaka time the reader lives in.
  const { formatDate, formatDateTime } = useFormatters();

  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground font-normal">—</span>;
  }

  // created_at, updated_at, and any date column: a raw ISO string is a
  // machine's format, and it is what the drawer used to print.
  if (typeof value === "string") {
    if (TIMESTAMP.test(value)) return <>{formatDateTime(value)}</>;
    if (DATE_ONLY.test(value)) return <>{formatDate(value)}</>;
  }

  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;

  // A logo or photo: show the picture, not the key that points at it.
  if (isImageColumn(name) && typeof value === "string") return <DetailImage value={value} />;

  // A scanned licence (0061). The column holds an R2 key, which is no use to
  // read; what the reader wants is to open the document. Through
  // /api/v1/documents, never the public bucket address — see that route.
  if (name.endsWith("_doc") && typeof value === "string") {
    return (
      <a
        href={`/api/v1/documents?key=${encodeURIComponent(value)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-primary hover:underline"
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        {value.split("/").pop() || "Document"}
      </a>
    );
  }

  // The weekly opening hours, shown the way the public page shows them:
  // "Mon – Fri · 9:00 AM – 5:00 PM" rather than seven near-identical rows.
  const week = name === "opening_hours" ? parseWeek(value) : null;
  if (week) {
    return (
      <span className="flex flex-col gap-0.5">
        {summariseWeek(week).map(row => (
          <span key={row.days}>
            <span className="font-normal text-muted-foreground">{row.days}</span> · {row.hours}
          </span>
        ))}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground font-normal">—</span>;
    return (
      <span className="flex flex-col gap-0.5">
        {value.map((item, i) => <span key={i}>{describe(item)}</span>)}
      </span>
    );
  }

  if (typeof value === "object") {
    // An embedded row — the package a hospital is on, say. Its name is the
    // whole reason it was embedded; the rest is the machinery behind it.
    const named = (value as Record<string, unknown>).name;
    if (typeof named === "string" && named) return <>{named}</>;

    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => !isIdColumn(k) && v !== null && v !== "");
    if (entries.length === 0) return <span className="text-muted-foreground font-normal">—</span>;
    return (
      <span className="flex flex-col gap-0.5">
        {entries.map(([k, v]) => (
          <span key={k}>
            <span className="font-normal text-muted-foreground">{k.replace(/_/g, " ")}:</span> {describe(v)}
          </span>
        ))}
      </span>
    );
  }

  return <>{String(value)}</>;
};

/**
 * One item of a list: "Dr Karim · Chairman · 01711…" for a person, the value
 * itself for a plain string. Keys are dropped because the values carry their
 * own meaning here and the labels would double the length of every line.
 */
const describe = (item: unknown): string => {
  if (item === null || item === undefined) return "—";
  if (typeof item !== "object") return String(item);
  return Object.entries(item as Record<string, unknown>)
    .filter(([k, v]) => !isIdColumn(k) && v !== null && v !== undefined && v !== "")
    .map(([, v]) => v)
    .map(v => (typeof v === "object" ? JSON.stringify(v) : String(v)))
    .join(" · ") || "—";
};

const toOptions = (options: SelectOption[]) =>
  options.map(o => (typeof o === "string" ? { value: o, label: o } : o));

export type FieldDef = (
  /**
   * `min`, `max` and `numberStep` map onto the HTML attributes of the same
   * name and matter more than they look.
   *
   * A number input with no step defaults to step=1, so the browser rejects
   * any decimal — and it does it by blocking submit, not by showing an error
   * the user can see when the field has scrolled out of the dialog. A column
   * typed numeric(2,1) needs `numberStep: 0.1` or its form can never be
   * saved. Use "any" when the precision does not matter.
   *
   * `numberStep` rather than `step` because `step` below is the wizard page
   * this field belongs to.
   */
  | { name: string; label: string; type: "text" | "email" | "tel" | "number" | "date" | "time"; required?: boolean; fullWidth?: boolean; min?: number; max?: number; numberStep?: number | "any" }
  /**
   * Options are plain strings when the stored value is what a human should
   * read. Pass { value, label } when it is not — a database enum like
   * "on_leave", or a foreign key, where the value is a uuid and the label is
   * the name it points at. Same shape as `statuses` below.
   */
  | { name: string; label: string; type: "select"; options: SelectOption[]; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "textarea"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "image"; folder?: MediaFolder; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "file"; accept?: string; hint?: string; required?: boolean; fullWidth?: boolean }
  // A scanned PDF in R2, the column holding its object key — DocumentUploadField.
  | { name: string; label: string; type: "document"; hint?: string; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "files"; accept?: string; hint?: string; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "list"; itemType?: "text" | "email" | "tel" | "url"; placeholder?: string; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "social"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "hours"; required?: boolean; fullWidth?: boolean }
  | { name: string; label: string; type: "people"; roleOptions?: string[]; addLabel?: string; required?: boolean; fullWidth?: boolean }
) & { step?: number };

export type FormStep = { id: number; label: string };

export function RecordFormFields({
  fields, editing, activeStepId, stepIds,
}: {
  fields: FieldDef[];
  editing: Record<string, unknown> | null;
  activeStepId?: number;
  stepIds?: number[];
}) {
  const ids = stepIds && stepIds.length ? stepIds : [1];
  return (
    <div className="grid grid-cols-2 gap-x-4">
      {fields.map(f => {
        const fieldStep = f.step ?? ids[0];
        const hidden = activeStepId !== undefined ? fieldStep !== activeStepId : false;
        const wide = f.fullWidth || f.type === "textarea" || f.type === "image" || f.type === "file" || f.type === "document" || f.type === "files" || f.type === "list" || f.type === "social" || f.type === "hours" || f.type === "people";
        return (
          <div key={f.name} className={`${wide ? "col-span-2" : ""} ${hidden ? "hidden" : ""}`}>
            <Field label={f.label} required={f.required}>
              {f.type === "select" ? (
                <Select name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? toOptions(f.options)[0]?.value ?? ""}>
                  {toOptions(f.options).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : f.type === "textarea" ? (
                <textarea name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} rows={3}
                  className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
              ) : f.type === "image" ? (
                <ImageUploadField name={f.name} required={f.required} folder={f.folder} defaultValue={(editing as never)?.[f.name] ?? ""} />
              ) : f.type === "file" ? (
                <FileUploadField name={f.name} required={f.required} accept={f.accept} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
              ) : f.type === "document" ? (
                <DocumentUploadField name={f.name} required={f.required} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
              ) : f.type === "files" ? (
                <FilesUploadField name={f.name} accept={f.accept} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
              ) : f.type === "list" ? (
                <ListField name={f.name} inputType={f.itemType ?? "text"} placeholder={f.placeholder}
                  defaultValue={(editing as never)?.[f.name]} />
              ) : f.type === "social" ? (
                <SocialField name={f.name} defaultValue={(editing as never)?.[f.name]} />
              ) : f.type === "hours" ? (
                <WeeklyHoursField name={f.name} defaultValue={(editing as never)?.[f.name]} />
              ) : f.type === "people" ? (
                <PeopleField name={f.name} defaultValue={(editing as never)?.[f.name]} roleOptions={f.roleOptions} addLabel={f.addLabel} />
              ) : (
                <Input name={f.name} type={f.type} required={f.required}
                        min={f.min} max={f.max} step={f.numberStep}
                        defaultValue={(editing as never)?.[f.name] ?? ""} />
              )}
            </Field>
          </div>
        );
      })}
    </div>
  );
}

export type ResourceConfig<T extends { id: string; status?: string }> = {
  storeKey: string;
  /**
   * Module name under /api/v1. When set, the page reads and writes real data
   * through RTK Query and `seed` is ignored. When absent it falls back to the
   * original localStorage behaviour, so pages not yet migrated are unaffected.
   */
  resource?: string;
  seed?: T[];
  searchFields: (keyof T)[];
  columns: Column<T>[];
  fields: FieldDef[];
  steps?: FormStep[];
  /**
   * Status filter chips. Plain strings show as-is; pass { value, label } when
   * the stored value is not what a human should read — a database enum like
   * "pending" or "on_leave" needs a label.
   */
  statuses?: (string | { value: string; label: string })[];
  exportName?: string;
  addLabel?: string;
  defaults?: Partial<T>;
  onCreate?: (record: T) => void;
  onUpdate?: (record: T) => void;
  extraFilters?: ReactNode;
  filterFn?: (row: T) => boolean;
  /**
   * Extra buttons per row, rendered before View / Edit / Delete. Use for module
   * actions that are not CRUD — approving a hospital, say.
   */
  rowActions?: (row: T) => ReactNode;
};

/**
 * Widgets that post JSON in a hidden input. Their values must be parsed before
 * submit, because Postgres text[] and jsonb columns cannot accept a JSON string.
 *
 * `image` / `file` / `files` are deliberately absent: they embed base64 data
 * URIs and their consumers still expect the string form.
 */
const JSON_VALUED_TYPES = new Set(["list", "social", "people"]);

export function ResourcePage<T extends { id: string; status?: string }>({ config, extra }: { config: ResourceConfig<T>; extra?: ReactNode }) {
  // Both hooks run every render — React forbids calling one conditionally.
  // useResourceCrud skips its request when config.resource is undefined, and
  // useCrud is cheap, so the unused one costs nothing.
  const local = useCrud<T>(config.storeKey, config.seed ?? []);
  const remote = useResourceCrud<T>(config.resource);
  const crud = config.resource ? remote : local;
  const isLoading = config.resource ? remote.isLoading : false;
  const loadError = config.resource ? remote.error : undefined;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sel, setSel] = useState<string[]>([]);

  // Lets a filtered list be deep-linked: /super/hospitals?status=pending is
  // where /super/onboarding now redirects, and it has to arrive filtered or the
  // "queue" is just the full list again.
  //
  // Read after mount, not during render: touching window during SSR would make
  // the server and client disagree and trip a hydration mismatch. Mount-only on
  // purpose — re-running would overwrite the user's own filter clicks. The ref
  // keeps the check current without making `statuses` a dependency, which is
  // rebuilt inline by callers and so changes identity every render.
  const statusesRef = useRef(config.statuses);
  statusesRef.current = config.statuses;

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("status");
    if (!wanted) return;
    const allowed = (statusesRef.current ?? []).map((s) =>
      typeof s === "string" ? s : s.value,
    );
    if (allowed.includes(wanted)) setStatus(wanted);
  }, []);
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<T | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [step, setStep] = useState(0);
  /** Guards onInvalid, which fires once per offending field in one batch. */
  const invalidHandled = useRef(false);

  /**
   * When the wizard last changed step, so a submit can tell whether it is a
   * real Save or the tail of the click that pressed Next.
   *
   * Next and Save are the same primary button in the same corner of the
   * footer. Pressing Next advances the step, React re-renders, and Save
   * appears under a cursor that has not moved — so the rest of that one click
   * lands on Save and submits the form. The record saved and the dialog shut
   * halfway through filling it in.
   *
   * This was always true; it only became visible when the forms started
   * passing validation. Before that the stray submit was blocked by an empty
   * required field and looked like nothing happening at all.
   */
  const stepChangedAt = useRef(0);
  const goToStep = (next: number | ((s: number) => number)) => {
    stepChangedAt.current = Date.now();
    setStep(next);
  };

  const steps = config.steps && config.steps.length > 0 ? config.steps : null;
  const stepIds = steps ? steps.map(s => s.id) : [1];
  const activeStepId = steps ? steps[step]?.id ?? steps[0].id : 1;
  const isLastStep = !steps || step >= (steps.length - 1);
  const isFirstStep = step === 0;

  useEffect(() => { if (creating || editing) setStep(0); }, [creating, editing]);

  const rows = useMemo(() => crud.items.filter(i => {
    const inSearch = !q || config.searchFields.some(f => String((i as never)[f] ?? "").toLowerCase().includes(q.toLowerCase()));
    const inStatus = status === "all" || (i.status || "").toLowerCase() === status.toLowerCase();
    const inExtra = !config.filterFn || config.filterFn(i);
    return inSearch && inStatus && inExtra;
  }), [crud.items, q, status, config]);

  return (
    <>
      <Card className="p-5">
        <Toolbar
          search={q} onSearch={setQ}
          onAdd={() => setCreating(true)} addLabel={config.addLabel || "New"}
          onExport={() => exportCSV(rows as never, `${config.exportName || config.storeKey}.csv`)}
          bulkCount={sel.length} onBulkDelete={() => setBulk(true)}
          filters={(config.statuses || config.extraFilters) && (
            <div className="flex flex-wrap items-center gap-2">
              {config.statuses && (
                <Chips value={status as never} onChange={setStatus as never}
                  options={[
                    { value: "all", label: "All" },
                    ...config.statuses.map(s => (typeof s === "string" ? { value: s, label: s } : s)),
                  ]} />
              )}
              {config.extraFilters}
            </div>
          )}
        />
        {loadError ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-destructive">Could not load records.</p>
            <p className="text-xs text-muted-foreground mt-1">
              You may not have access to this module, or the request failed.
            </p>
            <button type="button" onClick={() => remote.refetch()}
              className="mt-3 px-4 py-2 rounded-full text-xs font-semibold border border-border hover:bg-muted">
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <DataTable<T>
            rows={rows} columns={config.columns}
            selected={sel} onSelect={setSel}
            onRow={r => setViewing(r)}
            actions={r => (
              <div className="flex items-center gap-1">
                {config.rowActions?.(r)}
                <RowActions
                  onView={() => setViewing(r)}
                  onEdit={() => setEditing(r)}
                  onDelete={() => setConfirm(r.id)}
                />
              </div>
            )}
          />
        )}
      </Card>

      {extra}

      {/* Create / Edit */}
      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }}
        size="lg"
        title={editing ? "Edit record" : "Create new"}
        footer={<>
          <button onClick={() => { setCreating(false); setEditing(null); }} className="px-4 py-2 rounded-full text-sm font-semibold border border-border">Cancel</button>
          {steps && !isFirstStep && (
            <button type="button" onClick={() => goToStep(s => Math.max(0, s - 1))}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-border inline-flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          {steps && !isLastStep ? (
            <button type="button" onClick={() => goToStep(s => Math.min(steps.length - 1, s + 1))}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1.5">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button form="resource-form" type="submit" className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground">Save</button>
          )}
        </>}>
        {steps && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {steps.map((s, i) => (
              <button key={s.id} type="button" onClick={() => goToStep(i)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition ${i === step ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-primary"}`}>
                <span className={`h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] ${i === step ? "bg-primary-foreground/20" : "bg-background"}`}>{i + 1}</span>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <form id="resource-form"
          /**
           * The dialog scrolls, and a field can be far outside the visible
           * part of it. When the browser blocks submit on such a field it
           * reports nothing the user can see — the form simply stops
           * responding to Save, which reads as a broken button.
           *
           * onInvalid fires per offending field before that happens, so the
           * first one is scrolled into view and focused.
           */
          onInvalid={e => {
            // Only the first offending field matters — the browser fires this
            // for every one of them in the same batch, and racing them means
            // the last one wins rather than the first.
            if (invalidHandled.current) return;
            invalidHandled.current = true;
            setTimeout(() => { invalidHandled.current = false; }, 0);

            const field = e.target as HTMLInputElement;

            // On a wizard, the field may live on a step that is not rendered.
            // A required field inside a `hidden` container cannot be focused,
            // so the browser refuses to submit and reports NOTHING — no
            // bubble, no console warning, no request. Save simply stops
            // working, which is indistinguishable from a broken button.
            // Switching to its step is what makes the problem visible.
            const wantedStep = steps
              ? steps.findIndex(s => s.id === (config.fields.find(f => f.name === field.name)?.step ?? stepIds[0]))
              : -1;
            // goToStep, not setStep: this switch also swaps which button sits
            // under the cursor — Save becomes Next — and the tail of the click
            // that triggered validation would otherwise land on it.
            const mustSwitch = wantedStep >= 0 && wantedStep !== step;
            if (mustSwitch) goToStep(wantedStep);

            // Two frames: one for React to commit the step change, one for the
            // browser to lay the field out before scrolling to it.
            requestAnimationFrame(() => requestAnimationFrame(() => {
              field.scrollIntoView({ block: "center", behavior: "smooth" });
              field.focus({ preventScroll: true });
              // The native bubble is suppressed once submission is blocked, so
              // on a step switch the user would otherwise see a jump and no
              // reason for it.
              if (mustSwitch) field.reportValidity();
            }));
          }}
          onSubmit={async e => {
          e.preventDefault();

          // Ignore a submit that arrives on the heels of a step change. See
          // stepChangedAt: pressing Next swaps Save into the same pixels, and
          // the rest of that single click lands on it. A human cannot press
          // Next and genuinely mean Save a quarter-second later without
          // moving, so anything this fast is the tail of the Next click.
          if (steps && Date.now() - stepChangedAt.current < 400) return;

          // Read the form before any await: currentTarget is null afterwards.
          const fd = new FormData(e.currentTarget);
          const obj: Record<string, unknown> = { ...((config.defaults as Record<string, unknown>) || {}) };
          config.fields.forEach(f => {
            const raw = String(fd.get(f.name) ?? "");
            if (!JSON_VALUED_TYPES.has(f.type)) { obj[f.name] = raw; return; }
            // Omit rather than send "" or a broken parse — an empty key lets the
            // column keep its default instead of failing validation.
            if (raw === "") return;
            try { obj[f.name] = JSON.parse(raw); } catch { /* omit */ }
          });
          // A rejected save leaves the modal open with everything the user
          // typed still in it. Closing regardless — which is what this did —
          // threw the work away and left only a toast to explain it, and the
          // errors that land here are the recoverable kind: a duplicate name,
          // a field the server rejected. Both want a correction, not a retype.
          //
          // Both sources report the same way: create resolves undefined on
          // failure, update resolves false. Either way the hook has already
          // shown the reason, so there is nothing to say here.
          if (editing) {
            const updated = await crud.update(editing.id, obj as never);
            if (!updated) return;
            config.onUpdate?.({ ...editing, ...(obj as object) } as T);
          } else {
            const created = await crud.create(obj as never);
            if (!created) return;
            config.onCreate?.(created as T);
          }
          setCreating(false); setEditing(null);
        }}>
          <div className="grid grid-cols-2 gap-x-4">
            {config.fields.map(f => {
              const fieldStep = f.step ?? stepIds[0];
              const hidden = steps ? fieldStep !== activeStepId : false;
              const wide = f.fullWidth || f.type === "textarea" || f.type === "image" || f.type === "file" || f.type === "document" || f.type === "files" || f.type === "list" || f.type === "social" || f.type === "hours" || f.type === "people";
              return (
                <div key={f.name} className={`${wide ? "col-span-2" : ""} ${hidden ? "hidden" : ""}`}>
                  <Field label={f.label} required={f.required}>
                    {f.type === "select" ? (
                      <Select name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? toOptions(f.options)[0]?.value ?? ""}>
                        {toOptions(f.options).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    ) : f.type === "textarea" ? (
                      <textarea name={f.name} required={f.required} defaultValue={(editing as never)?.[f.name] ?? ""} rows={3}
                        className="w-full bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm" />
                    ) : f.type === "image" ? (
                      <ImageUploadField name={f.name} required={f.required} folder={f.folder} defaultValue={(editing as never)?.[f.name] ?? ""} />
                    ) : f.type === "file" ? (
                      <FileUploadField name={f.name} required={f.required} accept={f.accept} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
                    ) : f.type === "document" ? (
                      <DocumentUploadField name={f.name} required={f.required} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
                    ) : f.type === "files" ? (
                      <FilesUploadField name={f.name} accept={f.accept} hint={f.hint} defaultValue={(editing as never)?.[f.name] ?? ""} />
                    ) : f.type === "list" ? (
                      <ListField name={f.name} inputType={f.itemType ?? "text"} placeholder={f.placeholder}
                        defaultValue={(editing as never)?.[f.name]} />
                    ) : f.type === "social" ? (
                      <SocialField name={f.name} defaultValue={(editing as never)?.[f.name]} />
                    ) : f.type === "hours" ? (
                      <WeeklyHoursField name={f.name} defaultValue={(editing as never)?.[f.name]} />
                    ) : f.type === "people" ? (
                      <PeopleField name={f.name} defaultValue={(editing as never)?.[f.name]} roleOptions={f.roleOptions} addLabel={f.addLabel} />
                    ) : (
                      <Input name={f.name} type={f.type} required={f.required}
                        min={f.min} max={f.max} step={f.numberStep}
                        defaultValue={(editing as never)?.[f.name] ?? ""} />
                    )}
                  </Field>
                </div>
              );
            })}
          </div>
        </form>
      </Modal>


      {/* View drawer */}
      <Drawer open={!!viewing} onClose={() => setViewing(null)} title="Details">
        {viewing && (
          <div className="space-y-3 text-sm">
            {Object.entries(viewing).filter(([k]) => !isIdColumn(k)).map(([k, v]) => (
              <div key={k} className="border-b border-border/40 pb-2">
                <p className="text-[10px] tracking-widest text-muted-foreground">{label(k)}</p>
                <p className="text-primary font-semibold mt-0.5 break-words">
                  {k === "status"
                    ? <Pill tone={statusTone(String(v))}>{String(v)}</Pill>
                    : <DetailValue name={k} value={v} />}
                </p>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && crud.remove(confirm)}
        title="Delete record" description="This will permanently remove the entry." />
      <ConfirmDialog open={bulk} onClose={() => setBulk(false)} onConfirm={() => { crud.bulkRemove(sel); setSel([]); }}
        title={`Delete ${sel.length} records?`} description="Bulk action cannot be undone." />
    </>
  );
}

