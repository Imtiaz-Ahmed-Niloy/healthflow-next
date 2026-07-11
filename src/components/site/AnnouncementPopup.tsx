"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Announcement, getActiveAnnouncement, dismissAnnouncement } from "@/data/announcements";

const AnnouncementPopup = () => {
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const a = getActiveAnnouncement();
      if (a) { setAnn(a); setOpen(true); }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  if (!open || !ann) return null;

  const close = () => {
    if (ann) dismissAnnouncement(ann.id);
    setOpen(false);
  };

  const isExternal = ann.ctaUrl?.startsWith("http");

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-card border border-border/60 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 h-8 w-8 grid place-items-center rounded-full bg-card/90 backdrop-blur border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shadow-soft"
        >
          <X className="h-4 w-4" />
        </button>

        {ann.type === "image" && ann.image ? (
          <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
            <img src={ann.image} alt={ann.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="px-7 pt-8 pb-2 bg-gradient-to-br from-primary/10 via-accent/30 to-chip">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/80 backdrop-blur text-[10px] font-bold tracking-widest text-primary border border-border/60">
              <Sparkles className="h-3 w-3" /> ANNOUNCEMENT
            </span>
          </div>
        )}

        <div className="p-7 space-y-3">
          <h3 className="font-display text-2xl text-primary leading-tight">{ann.title}</h3>
          <p className="text-sm text-foreground/70 leading-relaxed">{ann.body}</p>

          <div className="flex items-center gap-3 pt-3">
            {ann.ctaLabel && ann.ctaUrl && (
              isExternal ? (
                <a
                  href={ann.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {ann.ctaLabel} <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link href={ann.ctaUrl}
                  onClick={close}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {ann.ctaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              )
            )}
            <button
              onClick={close}
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;

