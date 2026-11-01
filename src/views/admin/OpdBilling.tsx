"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Receipt,
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
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Kpi } from "@/components/admin/ui";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/lib/appSettings";
import { OpdInvoiceReceiptModal, type OpdInvoiceData, type LineItem } from "@/components/portal/OpdInvoiceReceiptModal";
import { DateRangeFilterPopover, type DateFilterPreset } from "@/components/portal/DateRangeFilterPopover";
import { doctorsApi, patientsApi, appointmentsApi } from "@/redux/api/resources";

interface DoctorOption {
  id: string;
  name: string;
  specialty?: string | null;
  consultation_fee?: number | null;
}

interface InvoicesSummary {
  total_billed: number;
  total_collected: number;
  total_due: number;
  count: number;
}

const QUICK_PRESETS: { label: string; rate: number }[] = [
  { label: "General OPD Consultation Fee", rate: 500 },
  { label: "Follow-up Consultation Fee", rate: 300 },
  { label: "Emergency Consultation Fee", rate: 800 },
  { label: "Nebulization Respiratory Therapy", rate: 200 },
  { label: "Random Blood Sugar (RBS)", rate: 150 },
  { label: "12-Lead Electrocardiogram (ECG)", rate: 400 },
  { label: "Surgical Dressing & Antiseptic Care", rate: 350 },
  { label: "IV Cannulation & Injection Push", rate: 150 },
  { label: "Vaccination Administration Charge", rate: 200 },
  { label: "Suture / Stitches Removal Charge", rate: 300 },
];

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getInvDate = (created_at: string) => {
  try {
    return toLocalDateStr(new Date(created_at));
  } catch {
    return "";
  }
};

const OpdBilling = () => {
  const t = useTranslations("admin.opdBilling");
  const tc = useTranslations("common");
  const { formatCurrency, formatDate } = useFormatters();
  const formatTk = (amount: number) => formatCurrency(amount);

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<OpdInvoiceData[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [hospitalInfo, setHospitalInfo] = useState<{ name?: string; address?: string; contact_phone?: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "DUE">("ALL");
  const [doctorFilter, setDoctorFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OpdInvoiceData | null>(null);
  const [receiptMode, setReceiptMode] = useState<"invoice" | "thermal">("invoice");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Bill Form State
  const [patientMode, setPatientMode] = useState<"registered" | "walkin">("registered");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinMrn, setWalkinMrn] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");

  // Fee lines builder
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "General OPD Consultation Fee", quantity: 1, rate: 500, amount: 500 },
  ]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isPaidNow, setIsPaidNow] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  // Redux lists for patient & appointment pickers
  const { data: patientsData } = patientsApi.useList({ limit: 100 });
  const registeredPatients = useMemo(() => patientsData?.data ?? [], [patientsData]);

  const { data: appointmentsData } = appointmentsApi.useList({ limit: 100 });
  const appointmentsList = useMemo(() => appointmentsData?.data ?? [], [appointmentsData]);



  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/opd-invoices");
      const body = await res.json().catch(() => null);
      if (res.ok && body?.data) {
        setInvoices(body.data.invoices ?? []);
        setDoctorsList(body.data.doctors ?? []);
        setHospitalInfo(body.data.hospital ?? null);
      }
    } catch {
      toast.error("Failed to load OPD invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  // When doctor is picked in modal, auto-set consultation fee
  const handleDoctorChange = (docId: string) => {
    setSelectedDoctorId(docId);
    const doc = doctorsList.find((d) => d.id === docId);
    const fee = Number(doc?.consultation_fee) || 500;
    setLineItems((prev) => {
      if (prev.length > 0 && prev[0].description.includes("Consultation")) {
        const copy = [...prev];
        copy[0] = {
          ...copy[0],
          description: `Consultation Fee · ${doc?.name || "Consultant"}`,
          rate: fee,
          amount: fee * (copy[0].quantity || 1),
        };
        return copy;
      }
      return [
        {
          description: `Consultation Fee · ${doc?.name || "Consultant"}`,
          quantity: 1,
          rate: fee,
          amount: fee,
        },
        ...prev,
      ];
    });
  };

  // When patient is picked in modal
  const handlePatientSelect = (patId: string) => {
    setSelectedPatientId(patId);
    const patient = registeredPatients.find((p) => p.id === patId);
    if (patient) {
      setWalkinName(patient.full_name);
      setWalkinPhone(patient.phone || "");
      setWalkinMrn(patient.mrn);
    }
  };

  // When appointment is picked in modal
  const handleAppointmentSelect = (appId: string) => {
    setSelectedAppointmentId(appId);
    const app = appointmentsList.find((a) => a.id === appId);
    if (app) {
      if (app.patient_id) {
        handlePatientSelect(app.patient_id);
      }
      if (app.doctor_id) {
        handleDoctorChange(app.doctor_id);
      }
    }
  };

  const addPresetLine = (preset: typeof QUICK_PRESETS[0]) => {
    setLineItems((prev) => [
      ...prev,
      {
        description: preset.label,
        quantity: 1,
        rate: preset.rate,
        amount: preset.rate,
      },
    ]);
    toast.success(`Added ${preset.label}`);
  };

  const addCustomLine = () => {
    setLineItems((prev) => [
      ...prev,
      { description: "OPD Medical Service / Investigation", quantity: 1, rate: 300, amount: 300 },
    ]);
  };

  const updateLineItem = (index: number, patch: Partial<LineItem>) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], ...patch };
      item.amount = Number((item.quantity * item.rate).toFixed(2));
      copy[index] = item;
      return copy;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  }, [lineItems]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - Number(discountAmount || 0));
  }, [subtotal, discountAmount]);

  const handleCreateInvoice = async (printMode?: "invoice" | "thermal") => {
    const finalPartyName = walkinName.trim() || (patientMode === "registered" ? registeredPatients.find(p => p.id === selectedPatientId)?.full_name : "") || "Walk-in Patient";
    if (!finalPartyName) {
      toast.error("Patient name is required");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Please add at least one bill item");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient_id: selectedPatientId || null,
        party: finalPartyName,
        amount: grandTotal,
        description: lineItems.map((li) => `${li.description} (x${li.quantity})`).join(", "),
        line_items: lineItems,
        paid: isPaidNow,
        payment_method: paymentMethod,
        appointment_id: selectedAppointmentId || null,
        doctor_id: selectedDoctorId || null,
        due_date: isPaidNow ? null : dueDate,
      };

      const res = await fetch("/api/v1/opd-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error?.message || "Failed to create OPD invoice");
      }

      toast.success(isPaidNow ? "OPD Bill created and settled as PAID!" : "OPD Bill generated successfully!");

      const createdInv: OpdInvoiceData = {
        ...body.data,
        facility_name: hospitalInfo?.name || "HealthFlow Medical Center",
        party: finalPartyName,
        line_items: lineItems,
        amount: grandTotal,
        patient: {
          full_name: finalPartyName,
          mrn: walkinMrn || (selectedPatientId ? registeredPatients.find(p => p.id === selectedPatientId)?.mrn : undefined),
          phone: walkinPhone,
        },
      };

      await loadInvoices();
      setCreateModalOpen(false);

      if (printMode) {
        setSelectedInvoice(createdInv);
        setReceiptMode(printMode);
        setReceiptModalOpen(true);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (inv: OpdInvoiceData) => {
    try {
      const res = await fetch("/api/v1/opd-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: inv.id, paid: true }),
      });
      if (!res.ok) {
        toast.error("Failed to settle invoice");
        return;
      }
      toast.success(`Invoice #${inv.reference} marked as paid`);
      await loadInvoices();
    } catch {
      toast.error("Network error while settling invoice");
    }
  };

  const handleCopyReference = (ref: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ref).then(() => {
        setCopiedId(id);
        toast.success("Invoice reference copied");
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const yesterdayStr = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const sevenDaysAgoStr = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    return invoices.filter((inv) => {
      const isPaid = Boolean(inv.paid_at || inv.is_paid);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PAID" && isPaid) ||
        (statusFilter === "DUE" && !isPaid);

      const matchesDoctor =
        doctorFilter === "ALL" ||
        inv.doctor_name?.toLowerCase().includes(doctorFilter.toLowerCase());

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.reference.toLowerCase().includes(q) ||
        inv.party.toLowerCase().includes(q) ||
        (inv.patient?.mrn && inv.patient.mrn.toLowerCase().includes(q)) ||
        (inv.description && inv.description.toLowerCase().includes(q));

      const invDate = getInvDate(inv.created_at);
      let matchesDate = true;
      if (dateFilter === "today") {
        matchesDate = invDate === todayStr;
      } else if (dateFilter === "yesterday") {
        matchesDate = invDate === yesterdayStr;
      } else if (dateFilter === "last7days") {
        matchesDate = invDate >= sevenDaysAgoStr && invDate <= todayStr;
      } else if (dateFilter === "thisMonth") {
        matchesDate = invDate >= monthStartStr && invDate <= todayStr;
      } else if (dateFilter === "custom") {
        if (startDate && invDate < startDate) matchesDate = false;
        if (endDate && invDate > endDate) matchesDate = false;
      }

      return matchesStatus && matchesDoctor && matchesSearch && matchesDate;
    });
  }, [invoices, statusFilter, doctorFilter, searchQuery, dateFilter, startDate, endDate]);

  const activeTotals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inv) => {
        const amt = Number(inv.amount || 0);
        const isPaid = Boolean(inv.paid_at || inv.is_paid);
        acc.total += amt;
        if (isPaid) {
          acc.collected += amt;
        } else {
          acc.due += amt;
        }
        return acc;
      },
      { total: 0, collected: 0, due: 0 }
    );
  }, [filteredInvoices]);

  return (
    <AdminLayout title={t("title")} subtitle={t("subtitle")}>
      {/* KPI Overview Strip (Doctor Panel Parity) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Kpi
          label={t("kpiTotalBilled")}
          value={formatCurrency(activeTotals.total)}
          hint={`${filteredInvoices.length} Invoices`}
          icon={Receipt}
          tone="primary"
        />
        <Kpi
          label={t("kpiTotalCollected")}
          value={formatCurrency(activeTotals.collected)}
          hint="Collected Revenue"
          icon={CheckCircle2}
          tone="ok"
        />
        <Kpi
          label={t("kpiTotalDue")}
          value={formatCurrency(activeTotals.due)}
          hint="Pending Settlements"
          icon={Clock}
          tone={activeTotals.due > 0 ? "destructive" : "default"}
        />
        <Kpi
          label={t("kpiTotalCount")}
          value={filteredInvoices.length}
          hint="OPD Consultations"
          icon={Stethoscope}
          tone="accent"
        />
      </div>

      {/* Main Billing Card */}
      <Card className="p-5 space-y-5">
        {/* Filter & Action Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background w-64 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Status Pills Filter */}
            <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === "ALL" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterAll")} ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PAID")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === "PAID" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterPaid")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DUE")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === "DUE" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("filterDue")}
              </button>
            </div>

            {/* Doctor Filter Dropdown */}
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-border bg-background font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Doctors & Departments</option>
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.name}>
                  {doc.name} {doc.specialty ? `(${doc.specialty})` : ""}
                </option>
              ))}
            </select>

            {/* Date Range Popover */}
            <DateRangeFilterPopover
              value={dateFilter}
              onChange={setDateFilter}
              startDate={startDate}
              endDate={endDate}
              onRangeChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              onReset={() => {
                setDateFilter("all");
                setStartDate("");
                setEndDate("");
              }}
            />
          </div>

          {/* Primary Create Action */}
          <Btn onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> {t("createBill")}
          </Btn>
        </div>

        {/* Invoices Data Table */}
        <div className="border border-border/70 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border/70 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="py-3 px-3.5 w-32">{t("thRef")}</th>
                <th className="py-3 px-3.5">{t("thPatient")}</th>
                <th className="py-3 px-3.5">{t("thDoctor")}</th>
                <th className="py-3 px-3.5">{t("thServices")}</th>
                <th className="py-3 px-3.5 text-right w-28">{t("thAmount")}</th>
                <th className="py-3 px-3.5 w-32">{t("thDate")}</th>
                <th className="py-3 px-3.5 text-center w-24">{t("thStatus")}</th>
                <th className="py-3 px-3.5 text-right w-44">{t("thActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <span>Loading OPD invoices...</span>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Receipt className="h-9 w-9 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-medium">No OPD invoices match your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = Boolean(inv.paid_at || inv.is_paid);
                  return (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      {/* Reference */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-primary">#{inv.reference}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyReference(inv.reference, inv.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                            title="Copy invoice reference"
                          >
                            {copiedId === inv.id ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-foreground text-xs">{inv.party}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {inv.patient?.mrn ? `MRN: #${inv.patient.mrn}` : "Walk-in"} {inv.patient?.phone ? `· ${inv.patient.phone}` : ""}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3 px-3.5">
                        <div className="font-medium text-foreground">{inv.doctor_name || "Hospital Consultant"}</div>
                        <div className="text-[11px] text-muted-foreground">Outpatient Care</div>
                      </td>

                      {/* Services Summary */}
                      <td className="py-3 px-3.5">
                        <div className="max-w-xs truncate text-foreground/90 font-medium">
                          {inv.description || "General OPD Medical Services"}
                        </div>
                        {inv.line_items && inv.line_items.length > 0 && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {inv.line_items.length} item{inv.line_items.length > 1 ? "s" : ""}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-foreground">
                        {formatCurrency(Number(inv.amount))}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 text-muted-foreground font-mono text-[11px]">
                        {formatDate(inv.created_at)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            DUE
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(inv)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors cursor-pointer"
                              title="Mark invoice as settled"
                            >
                              {t("settleNow")}
                            </button>
                          )}

                          {/* Print A4 Invoice */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setReceiptMode("invoice");
                              setReceiptModalOpen(true);
                            }}
                            className="p-1 rounded-lg border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
                            title={t("printA4")}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* Print Thermal Slip */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setReceiptMode("thermal");
                              setReceiptModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg border border-border hover:bg-muted font-medium text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title={t("printThermal")}
                          >
                            Slip
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
      {/* CREATE OPD INVOICE MODAL (Doctor Panel Parity) */}
      {/* ============================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border/80 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-primary leading-tight">
                  Create OPD Patient Invoice
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Issue consultation & medical procedure bills for outpatient visits
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Doctor / Consultant Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-primary" /> Attending Doctor & Department:
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Select Attending Doctor (Optional) —</option>
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} {doc.specialty ? `· ${doc.specialty}` : ""} (Fee: ৳{doc.consultation_fee || 500})
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Selection Card */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> Patient Details:
                  </span>
                  <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPatientMode("registered")}
                      className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                        patientMode === "registered" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Registered Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatientMode("walkin")}
                      className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                        patientMode === "walkin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Walk-in
                    </button>
                  </div>
                </div>

                {patientMode === "registered" ? (
                  <div className="space-y-2">
                    <select
                      value={selectedPatientId}
                      onChange={(e) => handlePatientSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">— Select from Registered Patients —</option>
                      {registeredPatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} (MRN: #{p.mrn}) · {p.phone || "No phone"}
                        </option>
                      ))}
                    </select>

                    {/* Optional Appointment Linkage */}
                    <select
                      value={selectedAppointmentId}
                      onChange={(e) => handleAppointmentSelect(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-[11px] text-muted-foreground"
                    >
                      <option value="">— Link to OPD Appointment (Optional) —</option>
                      {appointmentsList.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.patients?.full_name || "Patient"} · {app.scheduled_date} {app.scheduled_time} ({app.doctors?.name || "Doctor"})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Patient Full Name:</label>
                      <input
                        type="text"
                        value={walkinName}
                        onChange={(e) => setWalkinName(e.target.value)}
                        placeholder="e.g. Mohammad Rahim"
                        className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Phone Number:</label>
                      <input
                        type="text"
                        value={walkinPhone}
                        onChange={(e) => setWalkinPhone(e.target.value)}
                        placeholder="01700-000000"
                        className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Add Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick Add OPD Services:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addPresetLine(preset)}
                      className="px-2 py-1 rounded-lg border border-border bg-card hover:bg-primary/5 hover:border-primary/50 text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3 text-primary" />
                      <span>{preset.label}</span>
                      <span className="font-mono text-muted-foreground">৳{preset.rate}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Itemized Lines Editor */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Service Items ({lineItems.length}):
                  </span>
                  <button
                    type="button"
                    onClick={addCustomLine}
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Custom Service
                  </button>
                </div>

                <div className="border border-border/70 rounded-xl overflow-hidden divide-y divide-border/50">
                  {lineItems.map((line, idx) => (
                    <div key={idx} className="p-3 bg-muted/10 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLineItem(idx, { description: e.target.value })}
                        className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium"
                        placeholder="Service description..."
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">Qty:</span>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLineItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                            className="w-14 px-1.5 py-1 text-center font-mono rounded-lg border border-border bg-background text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">৳:</span>
                          <input
                            type="number"
                            min={0}
                            value={line.rate}
                            onChange={(e) => updateLineItem(idx, { rate: Math.max(0, Number(e.target.value)) })}
                            className="w-20 px-1.5 py-1 text-right font-mono rounded-lg border border-border bg-background text-xs"
                          />
                        </div>
                        <span className="font-mono font-bold text-primary w-20 text-right">
                          ৳{line.amount}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Settlement Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Settlement options */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2.5">
                  <div className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Payment Status:
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={isPaidNow}
                      onChange={(e) => setIsPaidNow(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Collected & Paid Immediately</span>
                  </label>

                  {isPaidNow ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Payment Method:</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs"
                      >
                        <option value="cash">Cash Billing Counter</option>
                        <option value="bkash">bKash Merchant</option>
                        <option value="nagad">Nagad Merchant</option>
                        <option value="card">Card POS Machine</option>
                        <option value="bank">Bank Transfer</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Payment Due Date:</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Subtotal & Discount Calculation */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Discount (৳):</span>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                      className="w-24 px-2 py-0.5 text-right rounded-lg border border-border bg-background font-mono text-xs text-foreground"
                    />
                  </div>
                  <div className="border-t border-border/80 pt-2 flex justify-between items-baseline font-sans font-bold text-base text-primary">
                    <span>Net Payable:</span>
                    <span className="font-mono text-lg">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20 gap-2">
              <Btn variant="outline" onClick={() => setCreateModalOpen(false)}>
                {tc("cancel")}
              </Btn>

              <div className="flex items-center gap-2">
                <Btn
                  variant="outline"
                  onClick={() => handleCreateInvoice("thermal")}
                  disabled={submitting || lineItems.length === 0}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Save & Print Slip
                </Btn>
                <Btn
                  onClick={() => handleCreateInvoice("invoice")}
                  disabled={submitting || lineItems.length === 0}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Save & Print A4
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* OPD INVOICE & THERMAL SLIP PRINT MODAL (Doctor Panel Parity) */}
      {/* ============================================================== */}
      {receiptModalOpen && selectedInvoice && (
        <OpdInvoiceReceiptModal
          open={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          invoice={selectedInvoice}
          doctorName={selectedInvoice.doctor_name || "Consultant Physician"}
          initialMode={receiptMode}
          formatTk={formatTk}
        />
      )}
    </AdminLayout>
  );
};

export default OpdBilling;
