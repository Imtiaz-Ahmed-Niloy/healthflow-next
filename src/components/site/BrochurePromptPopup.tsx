"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X, BookOpen, ArrowRight, Stethoscope, Building2,
  Activity, Pill as PillIcon, CheckCircle2
} from "lucide-react";
import { useTranslations } from "next-intl";

const BrochurePromptPopup = () => {
  const t = useTranslations("brochurePopup");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show popup whenever visitor lands on the homepage
    const timer = setTimeout(() => {
      setOpen(true);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  if (!open) return null;

  const handleDismiss = () => {
    setOpen(false);
  };

  const handleAccept = () => {
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[430px] rounded-3xl bg-white border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          aria-label={t("close")}
          className="absolute top-3.5 right-3.5 z-20 h-8 w-8 grid place-items-center rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white transition-all cursor-pointer shadow-sm"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top Visual Gradient Header */}
        <div className="relative px-6 pt-7 pb-6 bg-gradient-to-br from-[#1a3862] via-[#21516a] to-[#2ea394] text-white overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute -top-12 -right-12 h-36 w-36 bg-[#4bdcb4]/25 blur-2xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 h-28 w-28 bg-[#1a3862]/40 blur-xl rounded-full pointer-events-none" />

          {/* Headline */}
          <h3 className="relative z-10 font-display text-[22px] font-black text-white leading-tight pr-6">
            {t("title")}
          </h3>

          {/* Teaser Icons Strip */}
          <div className="relative z-10 flex items-center gap-2 mt-3.5 pt-3 border-t border-white/15 text-white/90 text-xs">
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-lg">
              <Stethoscope className="h-3.5 w-3.5 text-teal-300" />
              <span className="text-[11px] font-medium">{t("pillChamber")}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-lg">
              <Building2 className="h-3.5 w-3.5 text-sky-300" />
              <span className="text-[11px] font-medium">{t("pillHospital")}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-lg">
              <Activity className="h-3.5 w-3.5 text-emerald-300" />
              <span className="text-[11px] font-medium">{t("pillLabs")}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium">
            {t("description")}
          </p>

          <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-100/80 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#2ea394] shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-teal-950 font-semibold leading-snug">
              {t("question")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
            >
              {t("dismiss")}
            </button>

            <Link
              href="/brochure"
              onClick={handleAccept}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#1a3862] to-[#207a72] hover:from-[#132a4a] hover:to-[#19615a] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-[#4bdcb4]" />
              <span>{t("viewBrochure")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BrochurePromptPopup;
