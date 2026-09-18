"use client";

import { motion } from "framer-motion";
import { Printer, Stethoscope, X } from "lucide-react";
import { useTranslations } from "next-intl";

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
};

export const PrescriptionPreview = ({ sheet, onClose }: { sheet: PrescriptionSheetData; onClose: () => void }) => {
  const t = useTranslations("rxSheet");
  const { hospital, doctor, patientBar, complaints, examination, investigation, diagnosis, medicines, advice } = sheet;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8 print:static print:block print:overflow-visible print:bg-transparent print:backdrop-blur-none print:p-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl my-4 print:static print:w-full print:max-w-none print:my-0 print:shadow-none print:rounded-none"
      >
        {/* Not part of the printed page -- hidden outright (not just via
            the global print visibility rule) so it doesn't leave a blank
            gap at the top of the PDF where it used to sit. */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3 rounded-t-2xl print:hidden">
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

        <div id="rx-print-area" className="px-10 py-8 font-serif text-slate-900 bg-[linear-gradient(to_bottom,#ffffff,#fbfbf6)]">
          {/* Letterhead */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-slate-800">
            {/* A chamber with no name (0091) is the mark alone — no name,
                address or phone; the doctor's own name heads the sheet. */}
            {hospital.name ? (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border-2 border-emerald-700 text-emerald-700 flex items-center justify-center font-bold text-xl">{hospital.name[0] ?? "H"}</div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-emerald-800">{hospital.name}</h1>
                  <p className="text-[11px] text-slate-500 italic">
                    {[hospital.address, hospital.contact_phone].filter(Boolean).join(" • ") || t("noAddress")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full border-2 border-emerald-700 text-emerald-700 flex items-center justify-center">
                <Stethoscope className="h-6 w-6" />
              </div>
            )}
            {/* Name, then degrees, specialty and BMDC number — a line each. */}
            <div className="text-right">
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
          <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] print:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-0 min-h-[460px]">
            {/* LEFT */}
            <div className="md:pr-6 md:border-r print:pr-6 print:border-r border-slate-300 py-5 space-y-5">
              {([
                ["C/O", t("complaints"), complaints],
                ["O/E", t("examination"), examination],
                ["Inv", t("investigation"), investigation],
                ["Dx", t("diagnosis"), diagnosis],
              ] as const).map(([abbr, title, items]) => (
                <div key={title}>
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{abbr}</span>
                    <p className="text-[11px] tracking-widest font-semibold text-slate-500 uppercase">{title}</p>
                  </div>
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
              <div className="flex items-end gap-2 -mb-1">
                <span className="text-6xl italic font-bold text-emerald-800 leading-none">℞</span>
                <span className="text-[10px] tracking-widest font-semibold text-slate-500 uppercase pb-2">{t("prescription")}</span>
              </div>

              <div className="mt-4 flex-1">
                {medicines.length === 0 ? (
                  <p className="text-xs italic text-slate-400">{t("noMedicines")}</p>
                ) : (
                  <ol className="space-y-3">
                    {medicines.map((m, i) => (
                      <li key={i} className="grid grid-cols-[auto_1fr] gap-3">
                        <span className="font-bold text-slate-900 text-sm pt-0.5">{i + 1}.</span>
                        <div>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-[15px]">
                              {m.dosage_form && <span className="font-semibold text-slate-600">{m.dosage_form} </span>}
                              {m.name}
                            </span>
                            {m.dose && <span className="text-[11px] text-slate-600 italic">({m.dose})</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[12px] text-slate-700 pl-1">
                            {m.frequency && <span><span className="text-slate-400">{t("sig")}</span> <span className="font-semibold tracking-wider">{m.frequency}</span></span>}
                            {m.days && <span><span className="text-slate-400">{t("duration")}</span> <span className="font-semibold">{m.days}</span></span>}
                            {m.meal && <span className="italic text-slate-600">— {m.meal}</span>}
                          </div>
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
    </div>
  );
};
