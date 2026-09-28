"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Printer, Stethoscope, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FitText, pxRange } from "@/components/common/FitText";

/**
 * The printed prescription — one sheet, two readers.
 *
 * The doctor sees it when they Print & Submit a consultation
 * (/portal/prescription); the patient opens the same sheet from their medical
 * records. Kept as one component so what a patient reads is exactly what the
 * doctor printed: the same letterhead, sections and wording, never a second
 * layout that can drift from the first.
 *
 * Printing is `window.print()` on the page itself. globals.css hides
 * everything but #rx-print-area under @media print, so the sheet — and only
 * the sheet — is what comes out, in the same compiled CSS as on screen.
 */

export type SheetMedicine = {
  name?: string;
  dosage_form?: string;
  dose?: string;
  frequency?: string;
  days?: string;
  meal?: string;
};

export type PrescriptionSheetData = {
  /** `name` is null when a chamber keeps its name off prescriptions (0090). */
  hospital: { name: string | null; address: string | null; contact_phone: string | null };
  doctor: { name: string; specialty: string | null; education: string | null; bmdc_number?: string | null };
  /** The patient bar, as label / value pairs already formatted for display. */
  patientBar: [string, string][];
  complaints: string[];
  examination: string[];
  investigation: string[];
  diagnosis: string[];
  medicines: SheetMedicine[];
  advice: string[];
  /** The follow-up date, already formatted for display; null when none was set. */
  followUp?: string | null;
};

export const PrescriptionPreview = ({ sheet, onClose }: { sheet: PrescriptionSheetData; onClose: () => void }) => {
  const t = useTranslations("rxSheet");
  const { hospital, doctor, patientBar, complaints, examination, investigation, diagnosis, medicines, advice, followUp } = sheet;

  // Portaled straight into <body> so print can drop the rest of the app with
  // display:none (globals.css). Merely hiding it left its full height in
  // place, which printed as blank pages after the sheet.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="rx-print-root fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto px-4 pb-4 md:px-8 md:pb-8 print:static print:block print:overflow-visible print:bg-transparent print:backdrop-blur-none print:p-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[210mm] bg-white text-slate-900 rounded-2xl shadow-2xl mt-8 mb-4 md:mt-12 print:static print:w-full print:max-w-none print:my-0 print:shadow-none print:rounded-none"
      >
        {/* The space above the sheet is its own margin, not the overlay's
            top padding: a sticky header stops at the padding edge, which left
            a strip above it where the sheet showed through while scrolling. */}
        {/* Not part of the printed page -- hidden outright (not just via
            the global print visibility rule) so it doesn't leave a blank
            gap at the top of the PDF where it used to sit. */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-slate-200 px-6 py-3 rounded-t-2xl print:hidden">
          <p className="text-sm font-semibold text-slate-700">{t("preview")}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:opacity-90">
              <Printer className="h-3.5 w-3.5" /> {t("print")}
            </button>
            <button onClick={onClose} className="rounded-full border border-slate-300 p-2 hover:bg-slate-100" aria-label={t("close")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* An A4 sheet: 210 × 297 mm on screen, with the signature pinned to
            the bottom however short the Rx is. In print the page margin is 0
            (that's what drops Chrome's date/title/URL header and footer), so
            the 14 mm of white space is padding here instead, and the height
            a hair under 297 mm so it never spills onto a blank 2nd page. */}
        {/* 14mm at the sides on screen as in print, so the sheet is the same
            width both ways: the hospital name is sized to fit on screen, and
            must still fit on the page. */}
        <div id="rx-print-area" className="min-h-[297mm] print:min-h-[296mm] flex flex-col px-[14mm] py-8 print:p-[14mm] font-sans text-slate-900 bg-[linear-gradient(to_bottom,#ffffff,#fbfbf6)]">
          {/* Letterhead */}
          <div className="flex items-start justify-between gap-6 pb-4 border-b-2 border-slate-800">
            {/* A chamber with no name (0091) is the mark alone — no name,
                address or phone; the doctor's own name heads the sheet. */}
            {hospital.name ? (
              // The width the doctor's block leaves; the name fits itself to it.
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full border-2 border-emerald-700 text-emerald-700 flex items-center justify-center font-bold text-xl">{hospital.name[0] ?? "H"}</div>
                <div className="min-w-0 flex-1">
                  {/* One line: 24px (text-2xl), a pixel smaller at a time for a
                      longer name, down to 16px. */}
                  <FitText as="h1" text={hospital.name} sizes={pxRange(24, 16)} className="font-bold tracking-tight text-emerald-800" />
                  {(hospital.address || hospital.contact_phone) && (
                    <p className="text-[11px] text-slate-500 italic">
                      {[hospital.address, hospital.contact_phone].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full border-2 border-emerald-700 text-emerald-700 flex items-center justify-center">
                <Stethoscope className="h-6 w-6" />
              </div>
            )}
            {/* Name, then degrees, specialty and BMDC number — a line each. */}
            {/* At most 45%, so a long list of degrees cannot squeeze the
                hospital's name off the line. */}
            <div className="max-w-[45%] shrink-0 text-right">
              <h2 className="text-lg font-bold text-slate-900">{doctor.name}</h2>
              {doctor.education && <p className="text-[11px] text-slate-600 italic">{doctor.education}</p>}
              {doctor.specialty && <p className="text-[11px] text-slate-600">{doctor.specialty}</p>}
              {doctor.bmdc_number && <p className="text-[11px] text-slate-600">{t("bmdc", { number: doctor.bmdc_number })}</p>}
            </div>
          </div>

          {/* Patient bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-x-6 gap-y-2 py-3 border-b border-dashed border-slate-300 text-[12px]">
            {patientBar.map(([l, v]) => (
              <div key={l} className="flex gap-1.5">
                <span className="text-slate-500">{l}:</span>
                <span className="font-semibold text-slate-900 truncate">{v}</span>
              </div>
            ))}
          </div>

          {/* Body: left clinical / right Rx */}
          {/* md: only kicks in above 768px -- fine on screen (the modal
              is always that wide), but a printed page's content width
              (page size minus @page margins) is usually narrower than
              that, so md: never matched and this silently collapsed to
              one column in the PDF. print: isn't a width query, so it
              forces two columns for print regardless of paper size. */}
          <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] print:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-0 min-h-[460px] flex-1">
            {/* LEFT */}
            <div className="md:pr-6 md:border-r print:pr-6 print:border-r border-slate-300 py-5 space-y-5">
              {([
                [t("complaints"), complaints],
                [t("examination"), examination],
                [t("investigation"), investigation],
                [t("diagnosis"), diagnosis],
              ] as const).map(([title, items]) => (
                <div key={title}>
                  <p className="mb-1.5 text-[11px] tracking-widest font-semibold text-slate-500 uppercase">{title}</p>
                  {items.length === 0 ? (
                    <p className="text-xs italic text-slate-400 pl-1">—</p>
                  ) : (
                    <ul className="text-[13px] text-slate-800 leading-relaxed pl-1 space-y-0.5">
                      {items.map((it, i) => (
                        <li key={i} className="flex gap-2"><span className="text-slate-400">›</span><span>{it}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* RIGHT */}
            <div className="md:pl-6 print:pl-6 py-5 flex flex-col">
              {/* Plain "Rx", not the ℞ glyph: Inter has no ℞, so it fell back to a serif font. */}
              <span className="text-2xl font-semibold text-emerald-800 leading-none">Rx</span>

              <div className="mt-4 flex-1">
                {medicines.length === 0 ? (
                  <p className="text-xs italic text-slate-400">{t("noMedicines")}</p>
                ) : (
                  <ol className="space-y-3">
                    {medicines.map((m, i) => (
                      <li key={i} className="grid grid-cols-[auto_1fr] gap-3">
                        <span className="font-normal text-slate-900 text-sm pt-0.5">{i + 1}.</span>
                        <div>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-[15px]">
                              {m.dosage_form && <span className="font-semibold text-slate-600">{m.dosage_form} </span>}
                              {m.name}
                            </span>
                            {m.dose && <span className="text-[11px] text-slate-600 italic"><span className="mr-1.5 not-italic">·</span>{m.dose}</span>}
                          </div>
                          <p className="mt-1 text-[12px] font-semibold text-slate-700 pl-1">
                            {/* frequency is itself "2 ml · 3 times daily", so split it to space its dot the same way. */}
                            {[...(m.frequency ?? "").split(" · "), m.days, m.meal].filter(Boolean).map((part, j) => (
                              <span key={j}>{j > 0 && <span className="mx-1.5">·</span>}{part}</span>
                            ))}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Advice */}
              <div className="mt-6 pt-4 border-t border-dashed border-slate-300">
                <p className="text-[11px] tracking-widest font-semibold text-slate-500 uppercase mb-2">{t("advice")}</p>
                {advice.length === 0 ? (
                  <p className="text-xs italic text-slate-400">—</p>
                ) : (
                  <ul className="text-[12.5px] text-slate-700 space-y-1 leading-relaxed">
                    {advice.map((a, i) => (
                      <li key={i} className="flex gap-2"><span className="text-emerald-700">•</span><span>{a}</span></li>
                    ))}
                  </ul>
                )}
                {followUp && (
                  <p className="mt-3 text-[12.5px] text-slate-800">
                    <span className="font-semibold">{t("followUp")}:</span> {t("followUpOn", { date: followUp })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer / signature */}
          <div className="mt-6 pt-4 border-t-2 border-slate-800 flex items-end justify-between">
            <div className="text-[10px] text-slate-500 italic max-w-xs">
              {t("disclaimer")}
            </div>
            <div className="text-right">
              {/* Room above the line for the doctor's own signature. */}
              <div aria-hidden className="h-6" />
              <div className="border-t border-slate-400 w-52 mt-1 pt-1 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-900">{doctor.name}</span>
                <div className="text-[10px] text-slate-500">{t("signed")}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};
