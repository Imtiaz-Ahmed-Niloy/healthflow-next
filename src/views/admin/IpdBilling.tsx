"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Kpi } from "@/components/admin/ui";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import {
  type AdmissionRow,
  type BillLine,
} from "@/redux/api/resources";
import { useFormatters } from "@/lib/appSettings";
import {
  Receipt, Plus, Search, Printer, Copy, Check, X,
  BedDouble, Stethoscope, Utensils, Activity,
  FileText, Scissors, Droplet, CreditCard,
  Trash2, Sparkles, CheckCircle2
} from "lucide-react";
import { BRAND_INFO } from "@/constants/brand";
import { mediaUrl } from "@/lib/media";
import { printIpdInvoice } from "@/lib/ipdInvoicePrint";
import { toast } from "sonner";

/**
 * IPD Billing Item with categorical classification.
 */
export type IpdFeeCategory =
  | "room"
  | "doctor"
  | "food"
  | "nursing"
  | "pharmacy"
  | "lab"
  | "ot"
  | "equipment"
  | "misc";

export type IpdBillLineItem = {
  id?: string;
  category: IpdFeeCategory;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

export const FEE_CATEGORIES: { key: IpdFeeCategory; label: string; icon: typeof BedDouble }[] = [
  { key: "room", label: "Bed & Cabin Stays", icon: BedDouble },
  { key: "doctor", label: "Doctor & Specialist Visits", icon: Stethoscope },
  { key: "food", label: "Diet & Food Services", icon: Utensils },
  { key: "nursing", label: "Nursing & Patient Care", icon: Activity },
  { key: "pharmacy", label: "Medicines & Consumables", icon: Droplet },
  { key: "lab", label: "Laboratory & Diagnostics", icon: Activity },
  { key: "ot", label: "Operation Theatre & OT Charges", icon: Scissors },
  { key: "equipment", label: "Equipment & Oxygen Support", icon: Activity },
  { key: "misc", label: "Administrative & Miscellaneous", icon: FileText },
];

/**
 * Common quick-add presets for Bangladesh hospital inpatient workflows
 */
const QUICK_PRESETS: { category: IpdFeeCategory; label: string; rate: number; defaultQty: number }[] = [
  { category: "doctor", label: "Attending Consultant Daily Round", rate: 1000, defaultQty: 1 },
  { category: "doctor", label: "Specialist Physician Consultation", rate: 1500, defaultQty: 1 },
  { category: "food", label: "Patient 3-Meal Daily Diet Plan", rate: 500, defaultQty: 1 },
  { category: "food", label: "Special Diabetic / Renal Diet", rate: 650, defaultQty: 1 },
  { category: "food", label: "Attendant Daily Meal Service", rate: 400, defaultQty: 1 },
  { category: "nursing", label: "Daily Inpatient Nursing & Vitals", rate: 300, defaultQty: 1 },
  { category: "equipment", label: "Bedside Medical Oxygen Support", rate: 800, defaultQty: 1 },
  { category: "lab", label: "Inpatient Routine Blood & Urine Panel", rate: 1500, defaultQty: 1 },
  { category: "nursing", label: "Surgical Dressing & Antiseptic Care", rate: 400, defaultQty: 1 },
  { category: "ot", label: "OT Setup & Sterilization Charge", rate: 3500, defaultQty: 1 },
  { category: "misc", label: "IPD Admission File & Sanitization", rate: 500, defaultQty: 1 },
];

const categoryBadgeColor: Record<IpdFeeCategory, string> = {
  room: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  doctor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  food: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  nursing: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  pharmacy: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  lab: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  ot: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  equipment: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  misc: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
};

/** Compute stay days from admission date to end date */
const computeStayDays = (admittedAt: string, dischargedAt?: string | null): number => {
  const start = new Date(admittedAt);
  const end = dischargedAt ? new Date(dischargedAt) : new Date();
  const safeEnd = end.getTime() >= start.getTime() ? end : start;
  const msElapsed = safeEnd.getTime() - start.getTime();
  return Math.max(1, Math.ceil(msElapsed / (1000 * 60 * 60 * 24)));
};

/** Get primary placement label from bed_stays */
const getStayLocation = (a: AdmissionRow): string => {
  const openStay = a.bed_stays?.find(s => s.ended_at === null);
  const lastStay = a.bed_stays?.[a.bed_stays.length - 1];
  const stay = openStay || lastStay;
  if (!stay) return "Unassigned Bed";
  if (stay.cabins) {
    return `Cabin ${stay.cabins.number} (${stay.cabins.category || "Standard"})`;
  }
  if (stay.beds) {
    return `${stay.beds.wards?.name ?? "General Ward"} · Bed ${stay.beds.number}`;
  }
  return "General Ward";
};

const getStayDailyRate = (a: AdmissionRow): number => {
  const openStay = a.bed_stays?.find(s => s.ended_at === null);
  const lastStay = a.bed_stays?.[a.bed_stays.length - 1];
  const stay = openStay || lastStay;
  if (!stay) return 500;
  if (stay.cabins) return Number(stay.cabins.daily_rate) || 2000;
  if (stay.beds?.wards) return Number(stay.beds.wards.daily_rate) || 500;
  return 500;
};

const IpdBilling = () => {
  const t = useTranslations("admin.ipdBilling");
  const tc = useTranslations("common");
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const { push } = useNotifications();

  // Load Admissions
  const admissionsCrud = useResourceCrud<AdmissionRow>("admissions");
  const admissions = admissionsCrud.items;

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "pending" | "settled">("all");

  // Hospital Profile for Print Header
  const [hospitalProfile, setHospitalProfile] = useState<{
    name?: string | null;
    tagline?: string | null;
    address?: string | null;
    location?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    logo_url?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/hospital/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body?.data) setHospitalProfile(body.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Modal States
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>("");
  const [builderLines, setBuilderLines] = useState<IpdBillLineItem[]>([]);
  const [builderDiscount, setBuilderDiscount] = useState<number>(0);
  const [builderMarkPaid, setBuilderMarkPaid] = useState<boolean>(false);
  const [builderPaymentMethod, setBuilderPaymentMethod] = useState<string>("cash");
  const [savingBill, setSavingBill] = useState(false);

  // Settlement Quick Modal
  const [settleAdmission, setSettleAdmission] = useState<AdmissionRow | null>(null);
  const [settleMethod, setSettleMethod] = useState("cash");
  const [settling, setSettling] = useState(false);

  // Invoice Print View Modal
  const [viewInvoiceAdmission, setViewInvoiceAdmission] = useState<AdmissionRow | null>(null);
  const [copied, setCopied] = useState(false);

  // Selected Admission for the builder
  const currentTargetAdmission = useMemo(() => {
    return admissions.find((a) => a.id === selectedAdmissionId) || null;
  }, [admissions, selectedAdmissionId]);

  // When an admission is selected in the builder, initialize line items
  const handleSelectAdmission = (admId: string) => {
    setSelectedAdmissionId(admId);
    const adm = admissions.find((a) => a.id === admId);
    if (!adm) return;

    const invoice = adm.finance_invoices?.[0];
    if (invoice && Array.isArray(invoice.line_items) && invoice.line_items.length > 0) {
      // Load saved invoice line items
      const loaded: IpdBillLineItem[] = invoice.line_items.map((l: BillLine & { category?: string }) => ({
        category: (l.category as IpdFeeCategory) || "room",
        description: l.description,
        quantity: Number(l.quantity) || 1,
        rate: Number(l.rate) || 0,
        amount: Number(l.amount) || (Number(l.quantity) * Number(l.rate)),
      }));
      setBuilderLines(loaded);
      setBuilderDiscount(0);
      setBuilderMarkPaid(Boolean(invoice.paid_at));
    } else {
      // Auto-seed stay charges from admission dates & bed rates
      const days = computeStayDays(adm.admitted_at, adm.discharged_at);
      const stayLoc = getStayLocation(adm);
      const dailyRate = getStayDailyRate(adm);

      const initialLines: IpdBillLineItem[] = [
        {
          category: "room",
          description: `${stayLoc} (Inpatient Stay Charges)`,
          quantity: days,
          rate: dailyRate,
          amount: days * dailyRate,
        },
      ];

      // If doctor is assigned, add doctor round
      if (adm.doctors) {
        initialLines.push({
          category: "doctor",
          description: `Daily Consultant Rounds · ${adm.doctors.name}`,
          quantity: days,
          rate: 1000,
          amount: days * 1000,
        });
      }

      // Add default food plan
      initialLines.push({
        category: "food",
        description: "Patient Inpatient Daily Diet Meal Service",
        quantity: days,
        rate: 500,
        amount: days * 500,
      });

      // Add default nursing
      initialLines.push({
        category: "nursing",
        description: "Daily Inpatient Nursing & Patient Care",
        quantity: days,
        rate: 300,
        amount: days * 300,
      });

      setBuilderLines(initialLines);
      setBuilderDiscount(0);
      setBuilderMarkPaid(false);
    }
  };

  const addPresetFee = (preset: typeof QUICK_PRESETS[0]) => {
    const days = currentTargetAdmission ? computeStayDays(currentTargetAdmission.admitted_at, currentTargetAdmission.discharged_at) : 1;
    const qty = preset.category === "food" || preset.category === "nursing" ? days : preset.defaultQty;
    const newLine: IpdBillLineItem = {
      category: preset.category,
      description: preset.label,
      quantity: qty,
      rate: preset.rate,
      amount: qty * preset.rate,
    };
    setBuilderLines((prev) => [...prev, newLine]);
    toast.success(`Added "${preset.label}"`);
  };

  const addCustomFee = () => {
    const newLine: IpdBillLineItem = {
      category: "misc",
      description: "Custom Hospital Inpatient Service / Fee",
      quantity: 1,
      rate: 500,
      amount: 500,
    };
    setBuilderLines((prev) => [...prev, newLine]);
  };

  const updateLineItem = (index: number, patch: Partial<IpdBillLineItem>) => {
    setBuilderLines((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], ...patch };
      item.amount = Number((item.quantity * item.rate).toFixed(2));
      copy[index] = item;
      return copy;
    });
  };

  const removeLineItem = (index: number) => {
    setBuilderLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Bill calculations
  const builderSubtotal = useMemo(() => {
    return builderLines.reduce((sum, l) => sum + l.amount, 0);
  }, [builderLines]);

  const builderGrandTotal = useMemo(() => {
    return Math.max(0, builderSubtotal - Number(builderDiscount || 0));
  }, [builderSubtotal, builderDiscount]);

  // Save generated/edited bill to finance_invoices
  const handleSaveBill = async () => {
    if (!currentTargetAdmission) {
      toast.error("Please select an admitted patient first.");
      return;
    }
    if (builderLines.length === 0) {
      toast.error("Please add at least one fee line item.");
      return;
    }

    setSavingBill(true);
    const existingInvoice = currentTargetAdmission.finance_invoices?.[0];
    const ref = existingInvoice?.reference || `IPD-${currentTargetAdmission.id.slice(0, 8).toUpperCase()}`;

    const payload = {
      reference: ref,
      party: currentTargetAdmission.patients?.full_name || "Inpatient",
      kind: "receivable" as const,
      amount: builderGrandTotal,
      due_date: new Date().toISOString().slice(0, 10),
      paid_at: builderMarkPaid ? new Date().toISOString() : null,
      patient_id: currentTargetAdmission.patient_id,
      admission_id: currentTargetAdmission.id,
      description: `IPD Inpatient Hospital Bill · ${currentTargetAdmission.patients?.full_name || ""}`,
      line_items: builderLines,
    };

    try {
      let res: Response;
      if (existingInvoice) {
        res = await fetch(`/api/v1/finance-invoices/${existingInvoice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/v1/finance-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to save IPD bill");
      }

      toast.success(builderMarkPaid ? "IPD Bill generated and settled as PAID!" : "IPD Bill generated successfully!");
      push({
        title: "IPD Bill Saved",
        body: `Invoice #${ref} generated for ${currentTargetAdmission.patients?.full_name ?? "Patient"} (${formatCurrency(builderGrandTotal)}).`,
        tone: "ok",
      });

      await admissionsCrud.refetch();
      setBillModalOpen(false);

      // Open print preview immediately for confirmation
      const updated = admissions.find((a) => a.id === currentTargetAdmission.id) || currentTargetAdmission;
      setViewInvoiceAdmission(updated);
    } catch (e: unknown) {
      toast.error((e as Error).message || "An error occurred while saving the bill.");
    } finally {
      setSavingBill(false);
    }
  };

  // Quick Settle Action
  const handleConfirmSettle = async () => {
    if (!settleAdmission) return;
    setSettling(true);

    const existingInvoice = settleAdmission.finance_invoices?.[0];
    const totalAmount = existingInvoice ? Number(existingInvoice.amount) : (settleAdmission.admission_bill?.total || 5000);
    const ref = existingInvoice?.reference || `IPD-${settleAdmission.id.slice(0, 8).toUpperCase()}`;

    try {
      let res: Response;
      if (existingInvoice) {
        res = await fetch(`/api/v1/finance-invoices/${existingInvoice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paid_at: new Date().toISOString(),
          }),
        });
      } else {
        const days = computeStayDays(settleAdmission.admitted_at, settleAdmission.discharged_at);
        const stayLoc = getStayLocation(settleAdmission);
        const dailyRate = getStayDailyRate(settleAdmission);
        const autoLines: IpdBillLineItem[] = [
          {
            category: "room",
            description: `${stayLoc} (Inpatient Stay Charges)`,
            quantity: days,
            rate: dailyRate,
            amount: days * dailyRate,
          },
          {
            category: "food",
            description: "Patient Inpatient Daily Diet Meal Service",
            quantity: days,
            rate: 500,
            amount: days * 500,
          },
        ];
        res = await fetch("/api/v1/finance-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: ref,
            party: settleAdmission.patients?.full_name || "Inpatient",
            kind: "receivable",
            amount: totalAmount,
            due_date: new Date().toISOString().slice(0, 10),
            paid_at: new Date().toISOString(),
            patient_id: settleAdmission.patient_id,
            admission_id: settleAdmission.id,
            description: `IPD Inpatient Hospital Bill (${settleMethod.toUpperCase()})`,
            line_items: autoLines,
          }),
        });
      }

      if (!res.ok) {
        throw new Error("Could not settle invoice");
      }

      toast.success(`Payment of ${formatCurrency(totalAmount)} recorded via ${settleMethod.toUpperCase()}`);
      push({
        title: "IPD Bill Settled",
        body: `Full payment settled for #${ref} (${settleAdmission.patients?.full_name ?? "Patient"}).`,
        tone: "ok",
      });

      await admissionsCrud.refetch();
      setSettleAdmission(null);
    } catch {
      toast.error("Failed to record bill payment.");
    } finally {
      setSettling(false);
    }
  };

  // Copy reference helper
  const handlePrintModalInvoice = () => {
    if (!viewInvoiceAdmission) return;
    const a = viewInvoiceAdmission;
    const inv = a.finance_invoices?.[0];
    const days = computeStayDays(a.admitted_at, a.discharged_at);
    const stayLoc = getStayLocation(a);
    const stayRate = getStayDailyRate(a);
    const reference = inv?.reference || `ADM-${a.id.slice(0, 8).toUpperCase()}`;
    const isSettled = Boolean(inv?.paid_at);
    const isDismissed = a.status === "discharged";

    const lines: BillLine[] = (inv?.line_items && Array.isArray(inv.line_items) && inv.line_items.length > 0)
      ? inv.line_items
      : [
          {
            description: `${stayLoc} (Stay Duration Charges)`,
            quantity: days,
            rate: stayRate,
            amount: days * stayRate,
          },
          {
            description: a.doctors ? `Daily Consultant Rounds · ${a.doctors.name}` : "Consultant Inpatient Rounds",
            quantity: days,
            rate: 1000,
            amount: days * 1000,
          },
          {
            description: "Patient Inpatient Daily Diet Meal Service",
            quantity: days,
            rate: 500,
            amount: days * 500,
          },
          {
            description: "Inpatient Nursing Care & Routine Vitals Check",
            quantity: days,
            rate: 300,
            amount: days * 300,
          },
        ];

    const total = inv ? Number(inv.amount) : lines.reduce((s, l) => s + l.amount, 0);

    const hospitalNameStr = hospitalProfile?.name?.trim() || BRAND_INFO.hospitalName || BRAND_INFO.name;
    const hospitalTagline = hospitalProfile?.tagline?.trim() || "Inpatient Department (IPD) · Admission & Bed Services";
    const hospitalAddress = [
      hospitalProfile?.address?.trim(),
      hospitalProfile?.location?.trim(),
    ].filter(Boolean).join(" · ");
    const hospitalPhone = hospitalProfile?.contact_phone?.trim() || "+880 1700-000000";
    const hospitalEmail = hospitalProfile?.contact_email?.trim() || "care@healthflowbd.com";
    const hospitalLogo = (hospitalProfile?.logo_url ? mediaUrl(hospitalProfile.logo_url) : null) || BRAND_INFO.logoMark;

    printIpdInvoice({
      reference,
      generatedAt: formatDateTime(new Date().toISOString()),
      isDismissed,
      isSettled,
      hospital: {
        name: hospitalNameStr,
        tagline: hospitalTagline,
        address: hospitalAddress,
        phone: hospitalPhone,
        email: hospitalEmail,
        logoUrl: hospitalLogo,
      },
      patient: {
        name: a.patients?.full_name || "Unknown Patient",
        mrn: a.patients?.mrn || undefined,
        phone: a.patients?.phone || undefined,
        gender: a.patients?.gender || undefined,
        bloodGroup: a.patients?.blood_group || undefined,
      },
      admission: {
        admissionDate: formatDateTime(a.admitted_at),
        calculatedThrough: isDismissed
          ? formatDateTime(a.discharged_at || new Date().toISOString())
          : `${formatDateTime(new Date().toISOString())} (Current Date)`,
        stayDays: days,
        location: stayLoc,
        doctorName: a.doctors?.name || "Attending Consultant",
        doctorSpecialty: a.doctors?.specialty || undefined,
      },
      lines: lines.map((l) => ({
        description: l.description,
        subtext: isDismissed ? "Discharge settlement charge" : "Live ongoing inpatient charge",
        quantity: l.quantity,
        unitLabel: l.quantity === 1 ? "Unit" : "Days",
        rate: Number(l.rate),
        amount: Number(l.amount),
      })),
      subtotal: total,
      grandTotal: total,
      paymentStatus: isSettled ? "SETTLED & PAID" : isDismissed ? "DUE UPON DISCHARGE" : "ACCRUING (LIVE)",
      formatCurrency,
    });
  };

  const handleCopyReference = (ref: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ref).then(() => {
        setCopied(true);
        toast.success("Bill reference copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // Aggregated KPIs
  const totalInpatients = admissions.length;
  const activeInpatients = admissions.filter((a) => a.status !== "discharged").length;

  const totalBilled = useMemo(() => {
    return admissions.reduce((sum, a) => {
      const inv = a.finance_invoices?.[0];
      if (inv) return sum + Number(inv.amount);
      const days = computeStayDays(a.admitted_at, a.discharged_at);
      const rate = getStayDailyRate(a);
      return sum + (days * rate) + (days * 800); // estimated running total
    }, 0);
  }, [admissions]);

  const totalCollected = useMemo(() => {
    return admissions.reduce((sum, a) => {
      const inv = a.finance_invoices?.[0];
      return inv?.paid_at ? sum + Number(inv.amount) : sum;
    }, 0);
  }, [admissions]);

  const totalOutstanding = Math.max(0, totalBilled - totalCollected);

  // Filtered rows for the list table
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((a) => {
      const inv = a.finance_invoices?.[0];
      const isSettled = Boolean(inv?.paid_at);
      const isActive = a.status !== "discharged";

      if (filterTab === "active" && !isActive) return false;
      if (filterTab === "pending" && isSettled) return false;
      if (filterTab === "settled" && !isSettled) return false;

      if (search) {
        const q = search.toLowerCase();
        const ref = inv?.reference || `ADM-${a.id.slice(0, 8)}`;
        const patientStr = a.patients ? `${a.patients.full_name} ${a.patients.mrn} ${a.patients.phone}` : "";
        const docStr = a.doctors ? a.doctors.name : "";
        const stayLoc = getStayLocation(a);
        return [ref, patientStr, docStr, stayLoc].some((val) => val.toLowerCase().includes(q));
      }
      return true;
    });
  }, [admissions, filterTab, search]);

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
        <Kpi
          label={t("kpiTotalBills")}
          value={totalInpatients}
          hint="Hospital Admissions"
          icon={Receipt}
        />
        <Kpi
          label={t("kpiTotalBilled")}
          value={formatCurrency(totalBilled)}
          hint="Aggregate IPD Charges"
          icon={CreditCard}
        />
        <Kpi
          label={t("kpiCollected")}
          value={formatCurrency(totalCollected)}
          hint="Realized Collections"
          icon={CheckCircle2}
          tone="ok"
        />
        <Kpi
          label={t("kpiOutstanding")}
          value={formatCurrency(totalOutstanding)}
          hint="Due / Running Balances"
          icon={Activity}
          tone={totalOutstanding > 0 ? "destructive" : "default"}
        />
        <Kpi
          label={t("kpiActiveInpatients")}
          value={activeInpatients}
          hint="Current Bed Occupancies"
          icon={BedDouble}
        />
      </div>

      {/* Main Table Card */}
      <Card className="p-5 space-y-5">
        {/* Top Controls: Search, Tabs, and Primary Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background w-64 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterTab === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterAll")} ({admissions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("active")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterTab === "active" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterActive")} ({activeInpatients})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("pending")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterTab === "pending" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterPending")}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("settled")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterTab === "settled" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterSettled")}
              </button>
            </div>
          </div>

          <Btn
            onClick={() => {
              // Open bill builder with first active admission or empty
              const firstAdm = admissions[0];
              if (firstAdm) {
                handleSelectAdmission(firstAdm.id);
              }
              setBillModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> {t("generateBill")}
          </Btn>
        </div>

        {/* IPD Bills Table */}
        <div className="border border-border/70 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border/70 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="py-3 px-3.5 w-32">{t("thRef")}</th>
                <th className="py-3 px-3.5">{t("thPatient")}</th>
                <th className="py-3 px-3.5">{t("thStay")}</th>
                <th className="py-3 px-3.5">{t("thDoctor")}</th>
                <th className="py-3 px-3.5">{t("thBreakdown")}</th>
                <th className="py-3 px-3.5 text-right w-28">{t("thTotal")}</th>
                <th className="py-3 px-3.5 text-center w-28">{t("thStatus")}</th>
                <th className="py-3 px-3.5 text-right w-44">{t("thActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredAdmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Receipt className="h-9 w-9 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-medium">No IPD bill records found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredAdmissions.map((a) => {
                  const inv = a.finance_invoices?.[0];
                  const ref = inv?.reference || `ADM-${a.id.slice(0, 8).toUpperCase()}`;
                  const isSettled = Boolean(inv?.paid_at);
                  const isDismissed = a.status === "discharged";
                  const days = computeStayDays(a.admitted_at, a.discharged_at);
                  const stayLoc = getStayLocation(a);
                  const stayRate = getStayDailyRate(a);

                  // Computed or stored amount
                  const total = inv ? Number(inv.amount) : (days * stayRate) + (days * 1800);

                  return (
                    <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                      {/* Reference */}
                      <td className="py-3 px-3.5 font-mono font-bold text-primary">
                        #{ref}
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-foreground text-xs">{a.patients?.full_name ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          MRN: #{a.patients?.mrn ?? "—"} · {a.patients?.phone ?? ""}
                        </div>
                      </td>

                      {/* Stay Timeline & Room */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-foreground">{stayLoc}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDate(a.admitted_at)} · <span className="font-bold text-primary font-mono">{days} Day{days > 1 ? "s" : ""}</span>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-foreground">{a.doctors?.name || "Medical Officer"}</div>
                        <div className="text-[11px] text-muted-foreground">{a.doctors?.specialty || "Inpatient Care"}</div>
                      </td>

                      {/* Breakdown badges */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${categoryBadgeColor.room}`}>
                            Room
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${categoryBadgeColor.doctor}`}>
                            Doctor
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${categoryBadgeColor.food}`}>
                            Diet/Food
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${categoryBadgeColor.nursing}`}>
                            Nursing
                          </span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-foreground">
                        {formatCurrency(total)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            {t("statusPaid")}
                          </span>
                        ) : isDismissed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                            {t("statusDue")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {t("statusAccruing")}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Settle / Collect Button if not yet paid */}
                          {!isSettled && (
                            <button
                              type="button"
                              onClick={() => setSettleAdmission(a)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors cursor-pointer"
                              title="Record payment for this bill"
                            >
                              {t("recordPayment")}
                            </button>
                          )}

                          {/* Edit / Customize Fees */}
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectAdmission(a.id);
                              setBillModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg border border-border hover:bg-muted font-medium text-[11px] text-foreground transition-colors cursor-pointer"
                            title="Add or edit doctor, food, tests and fees"
                          >
                            {t("customizeFees")}
                          </button>

                          {/* View & Print Invoice */}
                          <button
                            type="button"
                            onClick={() => setViewInvoiceAdmission(a)}
                            className="p-1 rounded-lg border border-border hover:bg-muted text-primary transition-colors cursor-pointer"
                            title="Print official IPD Invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ============================================================== */}
      {/* COMPREHENSIVE IPD BILL GENERATOR & FEE CUSTOMIZER MODAL */}
      {/* ============================================================== */}
      {billModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-primary leading-tight font-bold">
                    IPD Inpatient Bill Generator & Fee Customizer
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Assemble comprehensive inpatient fees: Room/Bed, Doctor Rounds, Diet/Food, Nursing, Medicines & Diagnostics
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Step 1: Admission Selection Card */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Select Admitted Patient / Stay:
                  </label>
                  {currentTargetAdmission && (
                    <span className="font-mono text-[11px] text-primary font-bold">
                      #{currentTargetAdmission.finance_invoices?.[0]?.reference || `IPD-${currentTargetAdmission.id.slice(0, 8).toUpperCase()}`}
                    </span>
                  )}
                </div>

                <select
                  value={selectedAdmissionId}
                  onChange={(e) => handleSelectAdmission(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Select an Admission —</option>
                  {admissions.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.patients?.full_name ?? "Patient"} (MRN: #{adm.patients?.mrn ?? "—"}) · {getStayLocation(adm)} · {adm.status === "discharged" ? "Discharged" : "Admitted"}
                    </option>
                  ))}
                </select>

                {currentTargetAdmission && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Patient: </span>
                      <span className="font-semibold text-foreground">{currentTargetAdmission.patients?.full_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location: </span>
                      <span className="font-semibold text-foreground">{getStayLocation(currentTargetAdmission)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stay: </span>
                      <span className="font-bold text-primary font-mono">
                        {computeStayDays(currentTargetAdmission.admitted_at, currentTargetAdmission.discharged_at)} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Attending: </span>
                      <span className="font-semibold text-foreground">{currentTargetAdmission.doctors?.name || "Medical Officer"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Quick Preset Fee Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick Add Common IPD Fees:
                  </span>
                  <span className="text-[10px] text-muted-foreground">Click chip to append to bill</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addPresetFee(preset)}
                      className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-primary/5 hover:border-primary/50 text-foreground text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3 w-3 text-primary" />
                      <span>{preset.label}</span>
                      <span className="font-mono text-muted-foreground">৳{preset.rate}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Itemized Fee Table Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Itemized Inpatient Charges ({builderLines.length} items):
                  </span>
                  <Btn variant="outline" onClick={addCustomFee}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Line
                  </Btn>
                </div>

                <div className="border border-border/70 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border/70 font-bold text-[10px] uppercase text-muted-foreground tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-36">Category</th>
                        <th className="py-2.5 px-3">Service Description</th>
                        <th className="py-2.5 px-3 w-20 text-center">Qty / Days</th>
                        <th className="py-2.5 px-3 w-28 text-right">Unit Rate (৳)</th>
                        <th className="py-2.5 px-3 w-28 text-right">Amount (৳)</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {builderLines.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-muted-foreground">
                            No charge lines added yet. Click a preset above or &quot;Add Custom Line&quot;.
                          </td>
                        </tr>
                      ) : (
                        builderLines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-muted/10">
                            {/* Category Select */}
                            <td className="py-2 px-3">
                              <select
                                value={line.category}
                                onChange={(e) => updateLineItem(idx, { category: e.target.value as IpdFeeCategory })}
                                className="w-full px-2 py-1 rounded-lg border border-border bg-background text-[11px] font-medium"
                              >
                                {FEE_CATEGORIES.map((c) => (
                                  <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                              </select>
                            </td>

                            {/* Description */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => updateLineItem(idx, { description: e.target.value })}
                                className="w-full px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium"
                                placeholder="Service or item description..."
                              />
                            </td>

                            {/* Quantity */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => updateLineItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                                className="w-full px-2 py-1 text-center font-mono rounded-lg border border-border bg-background text-xs"
                              />
                            </td>

                            {/* Rate */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min={0}
                                value={line.rate}
                                onChange={(e) => updateLineItem(idx, { rate: Math.max(0, Number(e.target.value)) })}
                                className="w-full px-2 py-1 text-right font-mono rounded-lg border border-border bg-background text-xs"
                              />
                            </td>

                            {/* Total Amount */}
                            <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                              {formatCurrency(line.amount)}
                            </td>

                            {/* Delete */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                className="p-1 rounded text-muted-foreground hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 4: Summary & Settlement Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Settlement options */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
                  <div className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Settlement Status & Method:
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={builderMarkPaid}
                      onChange={(e) => setBuilderMarkPaid(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Mark bill as Paid & Settled immediately upon generating</span>
                  </label>

                  {builderMarkPaid && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Payment Mode:</label>
                      <select
                        value={builderPaymentMethod}
                        onChange={(e) => setBuilderPaymentMethod(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs"
                      >
                        <option value="cash">Cash Counter</option>
                        <option value="bkash">bKash Merchant</option>
                        <option value="nagad">Nagad Merchant</option>
                        <option value="card">Credit / Debit Card POS</option>
                        <option value="bank">Direct Bank Transfer</option>
                        <option value="insurance">Corporate / Insurance Coverage</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Totals & Discount Card */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>IPD Charges Subtotal:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(builderSubtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Discount / Waiver (৳):</span>
                    <input
                      type="number"
                      min={0}
                      value={builderDiscount}
                      onChange={(e) => setBuilderDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-28 px-2 py-0.5 text-right rounded-lg border border-border bg-background font-mono text-xs text-foreground"
                    />
                  </div>

                  <div className="border-t border-border/80 pt-2 flex justify-between items-baseline font-sans font-bold text-base text-primary">
                    <span>Net Bill Payable:</span>
                    <span className="font-mono text-lg">{formatCurrency(builderGrandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
              <Btn variant="outline" onClick={() => setBillModalOpen(false)}>
                {tc("cancel")}
              </Btn>
              <Btn onClick={handleSaveBill} disabled={savingBill || builderLines.length === 0}>
                {savingBill ? "Saving Bill..." : "Save & Generate Invoice"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* QUICK SETTLEMENT MODAL */}
      {/* ============================================================== */}
      {settleAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border/80 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Record IPD Bill Settlement
                </h3>
                <p className="text-xs text-muted-foreground">
                  Patient: <span className="font-bold text-foreground">{settleAdmission.patients?.full_name}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">MRN:</span>
                <span className="font-mono font-bold text-foreground">#{settleAdmission.patients?.mrn ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-semibold text-foreground">{getStayLocation(settleAdmission)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/50 text-sm font-bold text-primary">
                <span>Amount to Settle:</span>
                <span className="font-mono">
                  {formatCurrency(
                    settleAdmission.finance_invoices?.[0]?.amount
                      ? Number(settleAdmission.finance_invoices[0].amount)
                      : (computeStayDays(settleAdmission.admitted_at, settleAdmission.discharged_at) * getStayDailyRate(settleAdmission)) + 2000
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Received Via:</label>
              <select
                value={settleMethod}
                onChange={(e) => setSettleMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
              >
                <option value="cash">Cash Billing Counter</option>
                <option value="bkash">bKash Payment Gateway</option>
                <option value="nagad">Nagad Payment Gateway</option>
                <option value="card">Credit / Debit Card Machine (POS)</option>
                <option value="bank">Bank Deposit / Cheque</option>
                <option value="insurance">Insurance / Corporate Clear</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => setSettleAdmission(null)} disabled={settling}>
                {tc("cancel")}
              </Btn>
              <Btn onClick={handleConfirmSettle} disabled={settling}>
                {settling ? "Recording..." : "Confirm & Settle Paid"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PRINTABLE OFFICIAL IPD INVOICE MODAL (A4 READY) */}
      {/* ============================================================== */}
      {viewInvoiceAdmission && typeof document !== "undefined" && createPortal(
        <div
          className="sale-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none"
          onClick={() => setViewInvoiceAdmission(null)}
        >
          <div
            className="bg-card text-foreground rounded-2xl shadow-2xl border border-border/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none print:overflow-visible print:bg-white print:p-0 print:m-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar (Hidden in Print) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-primary leading-tight font-bold">
                    Official IPD Inpatient Hospital Invoice
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Ref: {viewInvoiceAdmission.finance_invoices?.[0]?.reference || `ADM-${viewInvoiceAdmission.id.slice(0, 8).toUpperCase()}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewInvoiceAdmission(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label={tc("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0 print:m-0">
              {(() => {
                const a = viewInvoiceAdmission;
                const inv = a.finance_invoices?.[0];
                const days = computeStayDays(a.admitted_at, a.discharged_at);
                const stayLoc = getStayLocation(a);
                const stayRate = getStayDailyRate(a);
                const reference = inv?.reference || `ADM-${a.id.slice(0, 8).toUpperCase()}`;
                const isSettled = Boolean(inv?.paid_at);
                const isDismissed = a.status === "discharged";

                // Resolve lines from invoice or generate default breakdown
                const lines: BillLine[] = (inv?.line_items && Array.isArray(inv.line_items) && inv.line_items.length > 0)
                  ? inv.line_items
                  : [
                      {
                        description: `${stayLoc} (Stay Duration Charges)`,
                        quantity: days,
                        rate: stayRate,
                        amount: days * stayRate,
                      },
                      {
                        description: a.doctors ? `Daily Consultant Rounds · ${a.doctors.name}` : "Consultant Inpatient Rounds",
                        quantity: days,
                        rate: 1000,
                        amount: days * 1000,
                      },
                      {
                        description: "Patient Inpatient Daily Diet Meal Service",
                        quantity: days,
                        rate: 500,
                        amount: days * 500,
                      },
                      {
                        description: "Inpatient Nursing Care & Routine Vitals Check",
                        quantity: days,
                        rate: 300,
                        amount: days * 300,
                      },
                    ];

                const total = inv ? Number(inv.amount) : lines.reduce((s, l) => s + l.amount, 0);

                const hospitalNameStr = hospitalProfile?.name?.trim() || BRAND_INFO.hospitalName || BRAND_INFO.name;
                const hospitalTagline = hospitalProfile?.tagline?.trim() || "Inpatient Department (IPD) · Admission & Bed Services";
                const hospitalAddress = [
                  hospitalProfile?.address?.trim(),
                  hospitalProfile?.location?.trim(),
                ].filter(Boolean).join(" · ");
                const hospitalPhone = hospitalProfile?.contact_phone?.trim() || "+880 1700-000000";
                const hospitalEmail = hospitalProfile?.contact_email?.trim() || "care@healthflowbd.com";
                const hospitalLogo = (hospitalProfile?.logo_url ? mediaUrl(hospitalProfile.logo_url) : null) || BRAND_INFO.logoMark;

                return (
                  <div
                    id="printable-ipd-invoice"
                    className="bg-card text-foreground p-6 sm:p-7 rounded-2xl border border-border/70 shadow-xs space-y-6 text-xs print:border-none print:shadow-none print:p-0 print:bg-white print:text-black"
                  >
                    {/* Header: Hospital Branding & Invoice Identification */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-border/70 gap-4">
                      <div className="flex items-center gap-3">
                        <Image
                          src={hospitalLogo}
                          alt={hospitalNameStr}
                          width={48}
                          height={48}
                          unoptimized
                          className="h-12 w-auto max-w-[140px] shrink-0 object-contain rounded-lg"
                        />
                        <div>
                          <h2 className="text-lg font-bold text-primary tracking-tight">{hospitalNameStr}</h2>
                          <p className="text-[11px] text-muted-foreground font-medium">{hospitalTagline}</p>
                          {hospitalAddress && (
                            <p className="text-[11px] text-muted-foreground/90 font-medium mt-0.5">{hospitalAddress}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground/80 font-mono mt-0.5">Helpline: {hospitalPhone} · {hospitalEmail}</p>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight">
                          {isDismissed ? "IPD DISCHARGE INVOICE" : "IPD INPATIENT BILL"}
                        </div>
                        <div className="mt-1 font-mono font-bold text-primary text-sm tracking-wide">
                          #{reference}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Generated: {formatDateTime(new Date().toISOString())}
                        </div>
                        <div className="mt-2">
                          {isSettled ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              SETTLED & PAID
                            </span>
                          ) : isDismissed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                              DUE UPON DISCHARGE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                              ACTIVE ADMISSION · LIVE CHARGES
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Patient & Admission Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl bg-muted/40 border border-border/70 text-xs">
                      {/* Left: Patient info */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          BILLED PATIENT (INPATIENT):
                        </div>
                        <div className="text-base font-bold text-primary">
                          {a.patients?.full_name ?? "—"}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-foreground/80 pt-1">
                          <div>
                            <span className="text-muted-foreground">MRN: </span>
                            <span className="font-mono font-bold text-foreground">#{a.patients?.mrn ?? "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Phone: </span>
                            <span className="font-medium text-foreground">{a.patients?.phone ?? "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Gender: </span>
                            <span className="font-medium text-foreground capitalize">{a.patients?.gender ?? "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Blood Group: </span>
                            <span className="font-medium text-foreground font-mono">{a.patients?.blood_group ? a.patients.blood_group.toUpperCase().replace("_", "") : "—"}</span>
                          </div>
                        </div>
                        {a.diagnosis && (
                          <div className="pt-1.5 border-t border-border/50 text-[11px]">
                            <span className="text-muted-foreground font-semibold">Provisional Diagnosis: </span>
                            <span className="text-foreground font-medium">{a.diagnosis}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Stay Timeline */}
                      <div className="space-y-1.5 md:border-l md:border-border/50 md:pl-5">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          ADMISSION & STAY DETAILS:
                        </div>
                        <div className="space-y-1 pt-1 text-foreground/80">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Admission Date:</span>
                            <span className="font-semibold text-foreground font-mono">{formatDateTime(a.admitted_at)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{isDismissed ? "Discharge Date:" : "Billed Through:"}</span>
                            <span className="font-semibold text-foreground font-mono">
                              {isDismissed ? formatDateTime(a.discharged_at || a.admitted_at) : `${formatDateTime(new Date().toISOString())} (Current)`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Stay Duration:</span>
                            <span className="font-bold text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded-md">
                              {days} Day{days > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Assigned Location:</span>
                            <span className="font-semibold text-foreground">{stayLoc}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Attending Consultant:</span>
                            <span className="font-semibold text-foreground">{a.doctors?.name || "Medical Officer"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Itemized Table */}
                    <div className="border border-border/80 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/60 border-b border-border/80 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                            <th className="py-2.5 px-3.5">Particulars / Inpatient Service Description</th>
                            <th className="py-2.5 px-3.5 text-center w-28">Quantity</th>
                            <th className="py-2.5 px-3.5 text-right w-32">Rate (BDT)</th>
                            <th className="py-2.5 px-3.5 text-right w-32">Total (BDT)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {lines.map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-3.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                              <td className="py-3 px-3.5">
                                <div className="font-semibold text-foreground text-xs">{item.description}</div>
                              </td>
                              <td className="py-3 px-3.5 text-center font-semibold font-mono text-foreground">
                                {item.quantity}
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono text-muted-foreground">
                                {formatCurrency(Number(item.rate))}
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono font-bold text-primary">
                                {formatCurrency(Number(item.amount))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Calculation Summary Box */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-1">
                      <div className="text-xs text-muted-foreground space-y-1 max-w-sm">
                        <div className="font-semibold text-foreground">Billing Duration Notice:</div>
                        <p>
                          Inpatient stay charges and dietary care computed for {days} calendar day(s).
                        </p>
                        <p className="text-[11px] text-muted-foreground/80">
                          Doctor consultation rounds, surgical fees, diagnostics, and food services are itemized above.
                        </p>
                      </div>

                      <div className="w-full sm:w-80 p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs font-mono">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Stay Subtotal:</span>
                          <span className="font-medium text-foreground">{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Discount / Waiver:</span>
                          <span className="font-medium text-foreground">{formatCurrency(0)}</span>
                        </div>
                        <div className="border-t border-border/70 pt-2 flex justify-between items-baseline font-sans font-bold text-base text-primary">
                          <span>Grand Total:</span>
                          <span className="font-mono text-lg">{formatCurrency(total)}</span>
                        </div>
                        <div className="border-t border-border/50 pt-2 flex justify-between items-center text-[11px] font-sans">
                          <span className="text-muted-foreground font-semibold">Payment Status:</span>
                          <span className={`font-bold uppercase ${isSettled ? "text-emerald-600" : isDismissed ? "text-rose-600" : "text-amber-600"}`}>
                            {isSettled ? "Settled & Paid" : isDismissed ? "Due upon discharge" : "Accruing (Live)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Terms & Signature */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border/80">
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">Terms & Instructions:</p>
                        <p>1. This is an official computer-generated inpatient bill from {hospitalNameStr}.</p>
                        <p>2. Final billing settlement and discharge summary clearance are completed at the billing cash counter.</p>
                        <p>3. Wishing the patient a speedy and complete recovery.</p>
                      </div>

                      <div className="sm:text-right space-y-6">
                        <div className="text-[11px] text-muted-foreground">Authorized Hospital Accounts</div>
                        <div className="border-b border-border/80 w-44 ml-auto" />
                        <div className="text-xs font-semibold text-foreground">
                          {hospitalNameStr} Accounts & Billing Desk
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Bottom Actions (Hidden in Print) */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/40 bg-muted/20 print:hidden">
              <Btn variant="outline" onClick={() => setViewInvoiceAdmission(null)}>
                {tc("close")}
              </Btn>
              <Btn
                variant="outline"
                onClick={() => {
                  const inv = viewInvoiceAdmission.finance_invoices?.[0];
                  const ref = inv?.reference || `IPD-${viewInvoiceAdmission.id.slice(0, 8).toUpperCase()}`;
                  handleCopyReference(ref);
                }}
              >
                {copied ? <Check className="h-4 w-4 mr-1.5 text-emerald-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied" : "Copy Reference"}
              </Btn>
              <Btn onClick={handlePrintModalInvoice}>
                <Printer className="h-4 w-4 mr-1.5" /> Print Invoice
              </Btn>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
};

export default IpdBilling;

