"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import {
  FlaskConical,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check,
  CreditCard,
  Building2,
  Stethoscope,
  Trash2,
  X,
  FileText,
  User,
  Phone,
  Banknote,
  Coins,
  ChevronDown,
  Sparkles,
  TestTube2,
  Microscope,
  Calendar,
  AlertCircle,
  Eye,
  ArrowRight,
  Filter,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Kpi } from "@/components/admin/ui";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/lib/appSettings";
import { BRAND_INFO } from "@/constants/brand";
import { mediaUrl } from "@/lib/media";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import type { LabTestRow, PatientRow } from "@/redux/api/resources";

interface DoctorOption {
  id: string;
  name: string;
  specialty?: string | null;
  consultation_fee?: number | null;
}

export interface LabBillLineItem {
  test_id?: string | null;
  description: string;
  category: string;
  sample?: string | null;
  turnaround?: string | null;
  quantity: number;
  rate: number;
  amount: number;
  doctor_name?: string | null;
}

export interface LabInvoiceData {
  id: string;
  reference: string;
  party: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  is_paid: boolean;
  created_at: string;
  description: string | null;
  line_items: LabBillLineItem[];
  doctor_name?: string | null;
  patient: {
    id?: string | null;
    name: string;
    mrn?: string | null;
    phone?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
  };
}

interface InvoicesSummary {
  total_billed: number;
  total_collected: number;
  total_due: number;
  count: number;
  catalog_tests_count?: number;
}

/**
 * Standard diagnostic quick-presets matching Bangladesh pathology & imaging routines
 */
const QUICK_PRESETS: { name: string; category: string; price: number; sample: string; turnaround: string }[] = [
  { name: "Complete Blood Count (CBC) with ESR", category: "Hematology", price: 450, sample: "EDTA Blood", turnaround: "4 Hours" },
  { name: "Blood Glucose (Fasting / RBS)", category: "Biochemistry", price: 120, sample: "Fluoride Plasma", turnaround: "2 Hours" },
  { name: "Serum Creatinine with eGFR", category: "Biochemistry", price: 350, sample: "Clot Serum", turnaround: "4 Hours" },
  { name: "Lipid Profile (Cholesterol, TG, HDL, LDL)", category: "Biochemistry", price: 1100, sample: "Clot Serum (Fasting)", turnaround: "6 Hours" },
  { name: "Liver Function Test (LFT - SGPT, SGOT, Bilirubin)", category: "Biochemistry", price: 950, sample: "Clot Serum", turnaround: "6 Hours" },
  { name: "Urine Routine & Microscopic Exam (R/M/E)", category: "Clinical Pathology", price: 200, sample: "Clean Catch Urine", turnaround: "2 Hours" },
  { name: "Serum Electrolytes (Na+, K+, Cl-)", category: "Biochemistry", price: 800, sample: "Clot Serum", turnaround: "4 Hours" },
  { name: "12-Lead Electrocardiogram (ECG)", category: "Cardiology", price: 400, sample: "Direct Tracing", turnaround: "Immediate" },
  { name: "Digital Chest X-Ray P/A View", category: "Radiology", price: 600, sample: "Radiographic Imaging", turnaround: "2 Hours" },
  { name: "Ultrasonography (USG) of Whole Abdomen", category: "Radiology", price: 1500, sample: "Ultrasound Scan", turnaround: "Same Day" },
  { name: "HbA1c (Glycated Hemoglobin HPLC)", category: "Biochemistry", price: 900, sample: "EDTA Blood", turnaround: "Same Day" },
  { name: "Thyroid Stimulating Hormone (TSH)", category: "Biochemistry", price: 600, sample: "Clot Serum", turnaround: "Same Day" },
  { name: "Dengue NS1 Antigen & Antibody Test", category: "Serology", price: 850, sample: "Clot Serum", turnaround: "3 Hours" },
  { name: "CRP (C-Reactive Protein) Quantitative", category: "Serology", price: 450, sample: "Clot Serum", turnaround: "4 Hours" },
  { name: "Serum Uric Acid", category: "Biochemistry", price: 300, sample: "Clot Serum", turnaround: "4 Hours" },
];

const CATEGORIES = [
  "ALL",
  "Hematology",
  "Biochemistry",
  "Radiology",
  "Clinical Pathology",
  "Serology",
  "Cardiology",
  "Microbiology",
] as const;

export default function LabBilling() {
  const t = useTranslations("admin.labBilling");
  const tc = useTranslations("common");
  const { formatCurrency, formatDate, formatDateTime } = useFormatters();
  const formatTk = (amount: number) => formatCurrency(amount);

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<LabInvoiceData[]>([]);
  const [catalogTests, setCatalogTests] = useState<LabTestRow[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [summary, setSummary] = useState<InvoicesSummary>({
    total_billed: 0,
    total_collected: 0,
    total_due: 0,
    count: 0,
    catalog_tests_count: 0,
  });
  const [hospitalInfo, setHospitalInfo] = useState<{
    name?: string | null;
    tagline?: string | null;
    address?: string | null;
    location?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    logo_url?: string | null;
  } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "DUE">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modals & Sliders
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<LabInvoiceData | null>(null);
  const [receiptMode, setReceiptMode] = useState<"invoice" | "thermal">("invoice");
  const [copied, setCopied] = useState(false);

  // Bill Creator Form State
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientGender, setPatientGender] = useState<string>("male");
  const [referringDoctorId, setReferringDoctorId] = useState<string>("");
  const [customDoctorName, setCustomDoctorName] = useState<string>("");
  const [testSearchInput, setTestSearchInput] = useState<string>("");
  const [testDropdownOpen, setTestDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Selected Bill Lines
  const [billLines, setBillLines] = useState<LabBillLineItem[]>([]);
  const [isUrgentStat, setIsUrgentStat] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [markPaid, setMarkPaid] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Registered Patients hook for autocomplete
  const patientsCrud = useResourceCrud<PatientRow>("patients");
  const registeredPatients = patientsCrud.items;

  // Load Main Data from /api/v1/lab-invoices
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/lab-invoices");
      if (!res.ok) {
        throw new Error("Failed to load lab billing data");
      }
      const json = await res.json();
      if (json?.data) {
        setInvoices(json.data.invoices || []);
        setCatalogTests(json.data.tests || []);
        setDoctorsList(json.data.doctors || []);
        if (json.data.hospital) setHospitalInfo(json.data.hospital);
        if (json.data.summary) setSummary(json.data.summary);
      }
    } catch {
      toast.error("Could not load diagnostic invoices and tests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Close test dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTestDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Unified available tests (Combines tests from http://localhost:3000/admin/lab plus standard presets)
  const availableTests = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; category: string; price: number; turnaround: string; sample: string }>();

    // First add from database catalog
    catalogTests.forEach((t) => {
      if (t.status === "active" || !t.status) {
        map.set(t.name.trim().toLowerCase(), {
          id: t.id,
          name: t.name,
          category: t.category || "Diagnostic Investigation",
          price: Number(t.price) || 0,
          turnaround: t.turnaround || "Standard TAT",
          sample: t.sample || "Blood/Specimen",
        });
      }
    });

    // Then supplement with popular presets if not already in catalog
    QUICK_PRESETS.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: p.name,
          category: p.category,
          price: p.price,
          turnaround: p.turnaround,
          sample: p.sample,
        });
      }
    });

    return Array.from(map.values());
  }, [catalogTests]);

  // Filtered tests inside dropdown
  const filteredDropdownTests = useMemo(() => {
    let list = availableTests;
    if (categoryFilter !== "ALL") {
      list = list.filter((t) => t.category.toLowerCase().includes(categoryFilter.toLowerCase()));
    }
    if (testSearchInput.trim()) {
      const q = testSearchInput.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.sample.toLowerCase().includes(q),
      );
    }
    return list;
  }, [availableTests, categoryFilter, testSearchInput]);

  // Add test to bill
  const handleAddTest = (test: { id?: string; name: string; category: string; price: number; turnaround: string; sample: string }) => {
    // Check if test already in bill
    if (billLines.some((l) => l.description.toLowerCase() === test.name.toLowerCase())) {
      toast.info(`"${test.name}" is already added to this bill.`);
      return;
    }

    const doctorName =
      doctorsList.find((d) => d.id === referringDoctorId)?.name ||
      customDoctorName ||
      undefined;

    setBillLines((prev) => [
      ...prev,
      {
        test_id: test.id || null,
        description: test.name,
        category: test.category,
        sample: test.sample,
        turnaround: test.turnaround,
        quantity: 1,
        rate: test.price,
        amount: test.price,
        doctor_name: doctorName,
      },
    ]);

    setTestSearchInput("");
    setTestDropdownOpen(false);
    toast.success(`Added: ${test.name}`);
  };

  const handleRemoveTest = (index: number) => {
    setBillLines((prev) => prev.filter((_, i) => i !== index));
  };

  // When patient is selected from autocomplete
  const handleSelectExistingPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    const p = registeredPatients.find((x) => x.id === patientId);
    if (p) {
      setPatientName(p.full_name);
      setPatientPhone(p.phone || "");
      setPatientGender(p.gender || "male");
      if (p.date_of_birth) {
        const birth = new Date(p.date_of_birth);
        const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        setPatientAge(String(age));
      }
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return billLines.reduce((acc, l) => acc + l.amount, 0);
  }, [billLines]);

  const urgentSurcharge = useMemo(() => {
    return isUrgentStat ? Math.round(subtotal * 0.2) : 0;
  }, [isUrgentStat, subtotal]);

  const grandTotal = useMemo(() => {
    const total = subtotal + urgentSurcharge - discountAmount;
    return Math.max(0, total);
  }, [subtotal, urgentSurcharge, discountAmount]);

  const changeDue = useMemo(() => {
    const tendered = Number(tenderedAmount) || 0;
    return Math.max(0, tendered - grandTotal);
  }, [tenderedAmount, grandTotal]);

  // Reset bill form
  const resetForm = () => {
    setSelectedPatientId("");
    setPatientName("");
    setPatientPhone("");
    setPatientAge("");
    setPatientGender("male");
    setReferringDoctorId("");
    setCustomDoctorName("");
    setBillLines([]);
    setIsUrgentStat(false);
    setDiscountAmount(0);
    setMarkPaid(true);
    setPaymentMethod("cash");
    setTenderedAmount("");
    setClinicalNotes("");
  };

  // Submit and create Lab Invoice
  const handleCreateLabBill = async (andPrint = false) => {
    if (!patientName.trim()) {
      toast.error("Please enter or select a patient name.");
      return;
    }
    if (billLines.length === 0) {
      toast.error("Please add at least one diagnostic test to the bill.");
      return;
    }

    const doctorName =
      doctorsList.find((d) => d.id === referringDoctorId)?.name ||
      customDoctorName ||
      "Inhouse Pathology Consultant";

    setSubmitting(true);
    try {
      const payload = {
        patient_id: selectedPatientId || null,
        party: patientName.trim(),
        phone: patientPhone.trim() || null,
        age: patientAge || null,
        gender: patientGender || null,
        doctor_id: referringDoctorId || null,
        doctor_name: doctorName,
        amount: grandTotal,
        discount: discountAmount,
        line_items: billLines.map((li) => ({
          ...li,
          doctor_name: doctorName,
        })),
        paid: markPaid,
        payment_method: paymentMethod,
        notes: [
          isUrgentStat ? "URGENT / STAT DELIVERY" : null,
          clinicalNotes.trim() ? clinicalNotes.trim() : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };

      const res = await fetch("/api/v1/lab-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to create lab invoice");
      }

      const resJson = await res.json();
      const createdInv = resJson.data;

      toast.success(markPaid ? "Lab Bill issued & payment recorded!" : "Lab Bill generated successfully!");

      // Refresh invoices
      await loadData();

      // Formulate invoice for receipt modal
      const newInvoiceForModal: LabInvoiceData = {
        id: createdInv.id,
        reference: createdInv.reference,
        party: createdInv.party,
        amount: Number(createdInv.amount),
        due_date: createdInv.due_date,
        paid_at: createdInv.paid_at,
        is_paid: Boolean(createdInv.paid_at),
        created_at: createdInv.created_at || new Date().toISOString(),
        description: createdInv.description,
        line_items: createdInv.line_items || billLines,
        doctor_name: doctorName,
        patient: {
          id: selectedPatientId,
          name: patientName.trim(),
          phone: patientPhone.trim(),
          gender: patientGender,
        },
      };

      resetForm();
      setCreateModalOpen(false);

      if (andPrint) {
        setViewInvoice(newInvoiceForModal);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate lab bill");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Settle Due Invoice
  const handleSettleInvoice = async (inv: LabInvoiceData) => {
    try {
      const res = await fetch("/api/v1/lab-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: inv.id, paid: true }),
      });
      if (!res.ok) throw new Error("Failed to settle invoice");
      toast.success(`Invoice #${inv.reference} settled as PAID!`);
      await loadData();
    } catch {
      toast.error("Could not record payment for this invoice.");
    }
  };

  // Filtered invoices table list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter === "PAID" && !inv.is_paid) return false;
      if (statusFilter === "DUE" && inv.is_paid) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchRef = inv.reference.toLowerCase().includes(q);
      const matchParty = inv.party.toLowerCase().includes(q);
      const matchMrn = (inv.patient?.mrn || "").toLowerCase().includes(q);
      const matchPhone = (inv.patient?.phone || "").toLowerCase().includes(q);
      const matchDoc = (inv.doctor_name || "").toLowerCase().includes(q);
      const matchTests = inv.line_items.some((l) => l.description.toLowerCase().includes(q));

      return matchRef || matchParty || matchMrn || matchPhone || matchDoc || matchTests;
    });
  }, [invoices, statusFilter, searchQuery]);

  const handleCopyRef = (ref: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopied(true);
      toast.success(`Copied reference #${ref}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hospitalNameStr = hospitalInfo?.name?.trim() || BRAND_INFO.hospitalName || BRAND_INFO.name;
  const hospitalTagline = hospitalInfo?.tagline?.trim() || "Clinical Pathology & Diagnostic Centre";
  const hospitalAddress = [hospitalInfo?.address?.trim(), hospitalInfo?.location?.trim()].filter(Boolean).join(" · ");
  const hospitalPhone = hospitalInfo?.contact_phone?.trim() || "+880 1700-000000";
  const hospitalEmail = hospitalInfo?.contact_email?.trim() || "lab@healthflowbd.com";
  const hospitalLogo = (hospitalInfo?.logo_url ? mediaUrl(hospitalInfo.logo_url) : null) || BRAND_INFO.logoMark;

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-6">
        {/* Top Header & New Bill Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              {t("title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Integrated pathology & radiology cashier counter · Connected directly with lab test directory
            </p>
          </div>
          <Btn onClick={() => setCreateModalOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" /> {t("createBill")}
          </Btn>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Kpi
            icon={FileText}
            label={t("kpiTotalBilled")}
            value={formatTk(summary.total_billed)}
            trend={`${summary.count} Bills`}
            tone="primary"
          />
          <Kpi
            icon={CheckCircle2}
            label={t("kpiTotalCollected")}
            value={formatTk(summary.total_collected)}
            trend="Settled Revenue"
            tone="ok"
          />
          <Kpi
            icon={Clock}
            label={t("kpiTotalDue")}
            value={formatTk(summary.total_due)}
            trend={summary.total_due > 0 ? "Outstanding Balance" : "Zero Due"}
            tone={summary.total_due > 0 ? "destructive" : "ok"}
          />
          <Kpi
            icon={FlaskConical}
            label={t("kpiCatalogTests")}
            value={availableTests.length}
            trend="Ready to Order"
            tone="accent"
          />
        </div>

        {/* Filter Toolbar & Search */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-background border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Tabs Filter */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "ALL" ? "bg-card text-primary shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterAll")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PAID")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "PAID" ? "bg-card text-emerald-600 shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterPaid")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DUE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  statusFilter === "DUE" ? "bg-card text-amber-600 shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterDue")}
              </button>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/70 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">{t("thRef")}</th>
                    <th className="py-3 px-4">{t("thPatient")}</th>
                    <th className="py-3 px-4">{t("thTests")}</th>
                    <th className="py-3 px-4">{t("thDoctor")}</th>
                    <th className="py-3 px-4 text-right">{t("thAmount")}</th>
                    <th className="py-3 px-4 text-center">{t("thStatus")}</th>
                    <th className="py-3 px-4 text-right">{t("thActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FlaskConical className="h-6 w-6 animate-pulse text-primary" />
                          <p>Loading diagnostic invoices...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <TestTube2 className="h-8 w-8 text-muted-foreground/50" />
                          <p className="font-semibold text-foreground text-sm">No diagnostic invoices found</p>
                          <p className="text-xs text-muted-foreground">
                            Click &quot;{t("createBill")}&quot; above to create a new patient test invoice.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        {/* Reference */}
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          <button
                            type="button"
                            onClick={() => setViewInvoice(inv)}
                            className="hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            #{inv.reference}
                          </button>
                          <div className="text-[10px] text-muted-foreground font-sans mt-0.5 font-normal">
                            {formatDateTime(inv.created_at)}
                          </div>
                        </td>

                        {/* Patient */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{inv.party}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            {inv.patient?.mrn && <span>#{inv.patient.mrn}</span>}
                            {inv.patient?.phone && <span>{inv.patient.phone}</span>}
                            {inv.patient?.gender && <span className="capitalize">{inv.patient.gender}</span>}
                          </div>
                        </td>

                        {/* Tests Billed */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {inv.line_items.slice(0, 3).map((line, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                              >
                                {line.description}
                              </span>
                            ))}
                            {inv.line_items.length > 3 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
                                +{inv.line_items.length - 3} more
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {inv.line_items.length} test{inv.line_items.length > 1 ? "s" : ""} included
                          </div>
                        </td>

                        {/* Referring Doctor */}
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {inv.doctor_name || "Inhouse Pathologist"}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground text-sm">
                          {formatTk(inv.amount)}
                        </td>

                        {/* Payment Status */}
                        <td className="py-3 px-4 text-center">
                          {inv.is_paid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" /> PAID
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Clock className="h-3 w-3" /> DUE
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!inv.is_paid && (
                              <Btn
                                variant="outline"
                                onClick={() => handleSettleInvoice(inv)}
                                className="h-7 text-xs px-2.5 text-emerald-600 hover:text-emerald-700"
                                title="Mark Paid"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Settle
                              </Btn>
                            )}
                            <Btn
                              variant="outline"
                              onClick={() => {
                                setViewInvoice(inv);
                                setReceiptMode("invoice");
                              }}
                              className="h-7 text-xs px-2.5"
                              title="Print A4 Invoice"
                            >
                              <Printer className="h-3.5 w-3.5 mr-1" /> Print
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* ===== CREATE LAB BILL MODAL (DRAWER / POPUP) ===== */}
      {/* ========================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FlaskConical className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-primary leading-tight font-bold">
                    Create Diagnostic Lab Bill
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Search and order pathology & imaging investigations with live test pricing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Row 1: Patient Information */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> 1. Patient Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Registered Patient Quick Picker */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Existing Patient (Optional)
                    </label>
                    <select
                      value={selectedPatientId}
                      onChange={(e) => handleSelectExistingPatient(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                    >
                      <option value="">— Walk-in / Unregistered —</option>
                      {registeredPatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.mrn ? `#${p.mrn}` : p.phone || "No Phone"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Patient Name */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Patient Full Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mizanur Rahman"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 45"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Gender
                    </label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Referring Doctor */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Referred By (Doctor)
                    </label>
                    <select
                      value={referringDoctorId}
                      onChange={(e) => setReferringDoctorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                    >
                      <option value="">— Self / Hospital Pathologist —</option>
                      {doctorsList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.specialty ? `(${d.specialty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Test Search & Dropdown Picker (Fetched from http://localhost:3000/admin/lab) */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Microscope className="h-3.5 w-3.5" /> 2. Diagnostic Investigation Search & Dropdown
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {availableTests.length} tests available in catalog
                  </span>
                </div>

                {/* Search Bar & Auto-Complete Combobox */}
                <div ref={dropdownRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t("selectTestPlaceholder")}
                      value={testSearchInput}
                      onChange={(e) => {
                        setTestSearchInput(e.target.value);
                        setTestDropdownOpen(true);
                      }}
                      onFocus={() => setTestDropdownOpen(true)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-card border border-border/80 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setTestDropdownOpen(!testDropdownOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Dropdown Menu Results */}
                  {testDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card rounded-xl border border-border/80 shadow-2xl max-h-72 overflow-y-auto divide-y divide-border/40">
                      {/* Category Quick Filter Pills inside dropdown */}
                      <div className="p-2 bg-muted/40 flex items-center gap-1 overflow-x-auto border-b border-border/60">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${
                              categoryFilter === cat
                                ? "bg-primary text-primary-foreground font-bold"
                                : "bg-card text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {filteredDropdownTests.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No tests matching &quot;{testSearchInput}&quot; found in catalog.
                        </div>
                      ) : (
                        filteredDropdownTests.map((test, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleAddTest(test)}
                            className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                <span>{test.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-primary/10 text-primary border border-primary/20">
                                  {test.category}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3">
                                {test.sample && <span>Specimen: {test.sample}</span>}
                                {test.turnaround && <span>Delivery: {test.turnaround}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-primary text-sm">
                                {formatTk(test.price)}
                              </span>
                              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">+ Add</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Popular Quick-Add Presets Chips */}
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Popular Diagnostic Tests (Click to add):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PRESETS.slice(0, 10).map((preset, idx) => {
                      const isAdded = billLines.some(
                        (l) => l.description.toLowerCase() === preset.name.toLowerCase(),
                      );
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddTest(preset)}
                          disabled={isAdded}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            isAdded
                              ? "bg-muted/40 text-muted-foreground border-border/40 opacity-60 cursor-not-allowed"
                              : "bg-card text-foreground border-border/70 hover:border-primary hover:text-primary shadow-xs"
                          }`}
                        >
                          {preset.name}
                          <span className="font-mono text-primary font-bold text-[11px]">
                            {formatTk(preset.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 3: Active Bill Ledger */}
              <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border/70 font-bold text-xs text-foreground flex items-center justify-between">
                  <span>Selected Tests ({billLines.length})</span>
                  <span className="font-mono text-primary font-bold">Subtotal: {formatTk(subtotal)}</span>
                </div>

                {billLines.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    <FlaskConical className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                    {t("noTestsSelected")}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/20 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2 px-3 w-8 text-center">#</th>
                        <th className="py-2 px-3">Test Particulars</th>
                        <th className="py-2 px-3">Department / Specimen</th>
                        <th className="py-2 px-3 text-right">Unit Rate</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono">
                      {billLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 text-center text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-foreground">
                            {line.description}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-muted-foreground text-[11px]">
                            {line.category} {line.sample ? `· ${line.sample}` : ""}
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">
                            {formatTk(line.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">
                            {formatTk(line.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <button
                              type="button"
                              onClick={() => handleRemoveTest(idx)}
                              className="text-destructive hover:text-destructive/80 p-1 cursor-pointer"
                              title="Remove test"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Row 4: Pricing Adjustments, Settlement & Grand Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left: Notes & Surcharges */}
                <div className="space-y-3 text-xs">
                  {/* Urgent / STAT Checkbox */}
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUrgentStat}
                      onChange={(e) => setIsUrgentStat(e.target.checked)}
                      className="rounded-md text-primary focus:ring-primary/20 h-4 w-4"
                    />
                    <div>
                      <div className="font-bold text-amber-700 dark:text-amber-400">
                        Emergency / STAT Delivery (+20% surcharge)
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Prioritize sample processing for urgent emergency report release
                      </div>
                    </div>
                  </label>

                  {/* Discount input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Discount / Waiver Amount (BDT)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={discountAmount || ""}
                      onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                    />
                  </div>

                  {/* Clinical Notes / Indication */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Clinical Notes / Provisional Indication
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Routine pre-op screening, fever investigation..."
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border/70 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Right: Grand Total & Payment Box */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Tests:</span>
                    <span>{formatTk(subtotal)}</span>
                  </div>
                  {isUrgentStat && (
                    <div className="flex justify-between text-amber-600">
                      <span>Emergency STAT (+20%):</span>
                      <span>+{formatTk(urgentSurcharge)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Discount / Waiver:</span>
                      <span>-{formatTk(discountAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-border/70 pt-2 flex justify-between items-baseline font-sans font-bold text-base text-primary">
                    <span>Net Payable:</span>
                    <span className="font-mono text-xl">{formatTk(grandTotal)}</span>
                  </div>

                  {/* Payment settlement method */}
                  <div className="pt-2 border-t border-border/50 font-sans space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs">Payment Settlement:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setMarkPaid(true)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            markPaid
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          PAID
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarkPaid(false)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            !markPaid
                              ? "bg-amber-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          DUE
                        </button>
                      </div>
                    </div>

                    {markPaid && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-0.5">Payment Method</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-card border border-border/70 text-xs text-foreground"
                          >
                            <option value="cash">Cash Counter</option>
                            <option value="bkash">bKash</option>
                            <option value="nagad">Nagad</option>
                            <option value="card">Card / POS</option>
                            <option value="bank">Bank Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-0.5">Tendered (Change Calc)</label>
                          <input
                            type="number"
                            placeholder={String(grandTotal)}
                            value={tenderedAmount}
                            onChange={(e) => setTenderedAmount(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-card border border-border/70 text-xs font-mono text-foreground"
                          />
                        </div>
                      </div>
                    )}

                    {markPaid && Number(tenderedAmount) > grandTotal && (
                      <div className="flex justify-between items-center text-xs text-emerald-600 font-mono font-bold pt-1">
                        <span>Return Change:</span>
                        <span>{formatTk(changeDue)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/40 bg-muted/20">
              <Btn variant="outline" onClick={() => setCreateModalOpen(false)}>
                {tc("cancel")}
              </Btn>
              <Btn
                variant="outline"
                onClick={() => handleCreateLabBill(false)}
                disabled={submitting}
              >
                Save Invoice
              </Btn>
              <Btn onClick={() => handleCreateLabBill(true)} disabled={submitting}>
                <Printer className="h-4 w-4 mr-1.5" /> Generate & Print
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ===== OFFICIAL DIAGNOSTIC INVOICE RECEIPT MODAL ===== */}
      {/* ========================================================= */}
      {viewInvoice && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:backdrop-blur-none">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none print:overflow-visible print:bg-white print:p-0 print:m-0">
            {/* Modal Header (Hidden in Print) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-primary leading-tight font-bold">
                    Diagnostic Lab Invoice · {viewInvoice.party}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Reference: #{viewInvoice.reference}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-muted p-0.5 rounded-lg border border-border/60 flex text-xs">
                  <button
                    type="button"
                    onClick={() => setReceiptMode("invoice")}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      receiptMode === "invoice" ? "bg-card text-primary shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    A4 Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptMode("thermal")}
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      receiptMode === "thermal" ? "bg-card text-primary shadow-xs" : "text-muted-foreground"
                    }`}
                  >
                    Thermal POS
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setViewInvoice(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0 print:m-0">
              {receiptMode === "invoice" ? (
                /* ================= A4 INVOICE MODE ================= */
                <div
                  id="printable-lab-invoice"
                  className="bg-card text-foreground p-6 sm:p-7 rounded-2xl border border-border/70 shadow-xs space-y-6 text-xs print:border-none print:shadow-none print:p-0 print:bg-white print:text-black font-sans"
                >
                  {/* Header: Hospital Letterhead */}
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
                        <p className="text-[11px] text-muted-foreground/80 font-mono mt-0.5">
                          Helpline: {hospitalPhone} · {hospitalEmail}
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight">
                        DIAGNOSTIC TEST INVOICE
                      </div>
                      <div className="mt-1 font-mono font-bold text-primary text-sm tracking-wide">
                        #{viewInvoice.reference}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Generated: {formatDateTime(viewInvoice.created_at)}
                      </div>
                      <div className="mt-2">
                        {viewInvoice.is_paid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" /> SETTLED & PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="h-3 w-3" /> DUE ON REPORT DELIVERY
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Patient & Requisition Details Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-xl bg-muted/40 border border-border/70 text-xs">
                    {/* Left: Patient */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        BILLED PATIENT:
                      </div>
                      <div className="text-base font-bold text-primary">{viewInvoice.party}</div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-foreground/80 pt-1">
                        <div>
                          <span className="text-muted-foreground">MRN: </span>
                          <span className="font-mono font-bold text-foreground">
                            {viewInvoice.patient?.mrn ? `#${viewInvoice.patient.mrn}` : "Walk-in"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <span className="font-medium text-foreground">
                            {viewInvoice.patient?.phone || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gender: </span>
                          <span className="font-medium text-foreground capitalize">
                            {viewInvoice.patient?.gender || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Doctor & Order Info */}
                    <div className="space-y-1.5 md:border-l md:border-border/50 md:pl-5">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        REFERRAL & ORDER DETAILS:
                      </div>
                      <div className="space-y-1 pt-1 text-foreground/80">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Referred Doctor:</span>
                          <span className="font-semibold text-foreground">
                            {viewInvoice.doctor_name || "Hospital Consultant"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Invoice Date:</span>
                          <span className="font-semibold text-foreground font-mono">
                            {formatDate(viewInvoice.created_at)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Delivery Commitment:</span>
                          <span className="font-semibold text-primary font-mono">
                            Within 4–6 Hours (Same Day)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Tests Ledger */}
                  <div className="border border-border/80 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60 border-b border-border/80 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                          <th className="py-2.5 px-3.5">Diagnostic Test Description</th>
                          <th className="py-2.5 px-3.5">Department / Specimen</th>
                          <th className="py-2.5 px-3.5 text-center w-24">Delivery TAT</th>
                          <th className="py-2.5 px-3.5 text-right w-32">Rate (BDT)</th>
                          <th className="py-2.5 px-3.5 text-right w-32">Total (BDT)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {viewInvoice.line_items.map((line, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3.5 text-center text-muted-foreground font-mono">{idx + 1}</td>
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-foreground text-xs">{line.description}</div>
                              {line.sample && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  Specimen Requirement: {line.sample}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-muted-foreground">
                              {line.category || "Pathology"}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono text-muted-foreground">
                              {line.turnaround || "Standard"}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono text-muted-foreground">
                              {formatTk(line.rate)}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono font-bold text-primary">
                              {formatTk(line.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals & Payment Summary */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-1">
                    <div className="text-xs text-muted-foreground space-y-1 max-w-sm">
                      <div className="font-semibold text-foreground">Diagnostic Instructions:</div>
                      <p>
                        1. Please present this original slip when collecting test reports from Counter #4.
                      </p>
                      <p>
                        2. Fasting verification was conducted at phlebotomy counter for metabolic investigations.
                      </p>
                    </div>

                    <div className="w-full sm:w-80 p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tests Gross Total:</span>
                        <span className="font-medium text-foreground">{formatTk(viewInvoice.amount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Discount / Waiver:</span>
                        <span className="font-medium text-foreground">{formatTk(0)}</span>
                      </div>
                      <div className="border-t border-border/70 pt-2 flex justify-between items-baseline font-sans font-bold text-base text-primary">
                        <span>Grand Total:</span>
                        <span className="font-mono text-lg">{formatTk(viewInvoice.amount)}</span>
                      </div>
                      <div className="border-t border-border/50 pt-2 flex justify-between items-center text-[11px] font-sans">
                        <span className="text-muted-foreground font-semibold">Payment Status:</span>
                        <span className={`font-bold uppercase ${viewInvoice.is_paid ? "text-emerald-600" : "text-amber-600"}`}>
                          {viewInvoice.is_paid ? "Paid & Settled" : "Due on delivery"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Official Terms & Authorized Signature */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border/80">
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">Important Notice:</p>
                      <p>Computer-generated official diagnostic invoice from {hospitalNameStr}.</p>
                      <p>Sample collection room operates 24/7 for emergency investigations.</p>
                    </div>

                    <div className="sm:text-right space-y-6">
                      <div className="text-[11px] text-muted-foreground">Authorized Laboratory Cashier</div>
                      <div className="border-b border-border/80 w-44 ml-auto" />
                      <div className="text-xs font-semibold text-foreground">
                        {hospitalNameStr} Diagnostic Desk
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= THERMAL POS SLIP MODE ================= */
                <div
                  id="printable-lab-thermal"
                  className="max-w-[320px] mx-auto bg-white text-black p-4 font-mono text-[11px] leading-tight space-y-3 border border-border shadow-xs"
                >
                  <div className="text-center space-y-1">
                    <div className="font-bold text-sm uppercase">{hospitalNameStr}</div>
                    <div>Diagnostic & Pathology Cash Desk</div>
                    <div className="text-[10px]">Helpline: {hospitalPhone}</div>
                    <div className="border-b border-dashed border-black pt-1" />
                  </div>

                  <div className="flex justify-between text-[10px]">
                    <span>Receipt: #{viewInvoice.reference}</span>
                    <span>{formatDate(viewInvoice.created_at)}</span>
                  </div>

                  <div className="space-y-0.5 text-[10px]">
                    <div>Patient: <b>{viewInvoice.party}</b></div>
                    {viewInvoice.patient?.phone && <div>Phone: {viewInvoice.patient.phone}</div>}
                    <div>Doctor: {viewInvoice.doctor_name || "Consultant"}</div>
                  </div>

                  <div className="border-b border-dashed border-black" />

                  {/* Items */}
                  <div className="space-y-1">
                    {viewInvoice.line_items.map((line, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="pr-2">{line.description}</div>
                        <div className="font-bold shrink-0">{formatTk(line.amount)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border-b border-dashed border-black" />

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL:</span>
                      <span>{formatTk(viewInvoice.amount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>STATUS:</span>
                      <span className="font-bold uppercase">{viewInvoice.is_paid ? "PAID" : "DUE"}</span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-black" />

                  <div className="text-center text-[9px] text-gray-700 space-y-0.5 pt-1">
                    <div>* Bring this slip for report delivery *</div>
                    <div>Counter #4 · Thank you</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Hidden in Print) */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/40 bg-muted/20 print:hidden">
              <Btn variant="outline" onClick={() => setViewInvoice(null)}>
                {tc("close")}
              </Btn>
              <Btn variant="outline" onClick={() => handleCopyRef(viewInvoice.reference)}>
                {copied ? <Check className="h-4 w-4 mr-1.5 text-emerald-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied" : "Copy Ref"}
              </Btn>
              <Btn onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" /> Print {receiptMode === "invoice" ? "Invoice" : "POS Slip"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
