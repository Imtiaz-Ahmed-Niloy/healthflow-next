"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  FileSpreadsheet,
  Building2,
  Store,
  Coins,
  ArrowUpRight,
  Sparkles,
  Phone,
  Eye,
  Check,
  TrendingUp,
  AlertCircle,
  Users,
  FileText,
  Calendar,
  X,
  ChevronDown,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useFormatters } from "@/lib/appSettings";
import { OpdInvoiceModal, type WorkplaceFacility } from "@/components/portal/OpdInvoiceModal";
import { OpdInvoiceReceiptModal, type OpdInvoiceData } from "@/components/portal/OpdInvoiceReceiptModal";
import { DateRangeFilterPopover, type DateFilterPreset } from "@/components/portal/DateRangeFilterPopover";
import { FacilityFilterPopover } from "@/components/portal/FacilityFilterPopover";

interface InvoicesSummary {
  total_billed: number;
  total_collected: number;
  total_due: number;
  count: number;
}

export function Invoices() {
  const { formatCurrency } = useFormatters();
  const formatTk = (amount: number) => formatCurrency(amount);

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<OpdInvoiceData[]>([]);
  const [summary, setSummary] = useState<InvoicesSummary | null>(null);
  const [workplaces, setWorkplaces] = useState<WorkplaceFacility[]>([]);
  const [doctorName, setDoctorName] = useState<string>("Doctor");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "DUE">("ALL");
  const [facilityFilter, setFacilityFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getInvDate = (created_at: string) => {
    try {
      const d = new Date(created_at);
      if (!isNaN(d.getTime())) {
        return toLocalDateStr(d);
      }
    } catch {}
    return created_at.slice(0, 10);
  };

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OpdInvoiceData | null>(null);
  const [receiptMode, setReceiptMode] = useState<"invoice" | "thermal">("invoice");

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/portal/invoices");
      const body = await res.json().catch(() => null);
      if (res.ok && body?.data) {
        setInvoices(body.data.invoices ?? []);
        setSummary(body.data.summary ?? null);
        setWorkplaces(body.data.workplaces ?? []);
      }
    } catch (err) {
      console.error("Failed to load OPD invoices:", err);
      toast.error("Failed to load OPD invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();

    // Fetch doctor name
    fetch("/api/v1/portal/me")
      .then((res) => res.json())
      .then((body) => {
        if (body?.data?.name) {
          setDoctorName(body.data.name);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleMarkAsPaid = async (inv: OpdInvoiceData) => {
    try {
      const res = await fetch("/api/v1/portal/invoices", {
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

  const handleOpenReceipt = (inv: OpdInvoiceData, mode: "invoice" | "thermal" = "invoice") => {
    setSelectedInvoice(inv);
    setReceiptMode(mode);
    setReceiptModalOpen(true);
  };

  const handleInvoiceCreated = (
    createdInv: OpdInvoiceData,
    shouldPrint?: boolean,
    printMode: "invoice" | "thermal" = "invoice"
  ) => {
    void loadInvoices();
    if (shouldPrint) {
      setSelectedInvoice(createdInv);
      setReceiptMode(printMode);
      setReceiptModalOpen(true);
    }
  };

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const yesterdayStr = toLocalDateStr(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    );
    const sevenDaysAgoStr = toLocalDateStr(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    );
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    return invoices.filter((inv) => {
      const isPaid = Boolean(inv.paid_at || inv.is_paid);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PAID" && isPaid) ||
        (statusFilter === "DUE" && !isPaid);

      const matchesFacility =
        facilityFilter === "ALL" || inv.facility_name === facilityFilter;

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

      return matchesStatus && matchesFacility && matchesSearch && matchesDate;
    });
  }, [invoices, statusFilter, facilityFilter, searchQuery, dateFilter, startDate, endDate]);

  const filteredTotals = useMemo(() => {
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

  const exportCSV = () => {
    if (!filteredInvoices.length) {
      toast.error("No invoices found to export");
      return;
    }
    const headers = ["Invoice Ref,Date,Patient Name,MRN,Facility,Amount,Status,Description"];
    const rows = filteredInvoices.map((inv) => {
      const isPaid = Boolean(inv.paid_at || inv.is_paid);
      return `"${inv.reference}","${getInvDate(inv.created_at)}","${inv.party}","${
        inv.patient?.mrn || ""
      }","${inv.facility_name || ""}",${inv.amount},"${isPaid ? "PAID" : "DUE"}","${(
        inv.description || ""
      ).replace(/"/g, '""')}"`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `doctor_opd_invoices_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Invoices downloaded (CSV)");
  };

  const collectionRate =
    summary?.total_billed && summary.total_billed > 0
      ? Math.round((summary.total_collected / summary.total_billed) * 100)
      : 0;

  return (
    <PortalLayout>
      <div className="space-y-8 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-xs">
                <Receipt className="h-4 w-4" />
              </span>
              <h1 className="font-display text-2xl font-bold text-primary">
                OPD Billing & Patient Invoices
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Create outpatient invoices, record clinical procedural fees, and issue print receipts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New OPD Invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="gap-1.5 text-xs border-border"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs border-border"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              Print
            </Button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Invoiced */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-6 shadow-md relative overflow-hidden"
          >
            <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
              <Receipt className="h-32 w-32" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
              Total OPD Billed
            </p>
            <h3 className="font-display text-3xl font-extrabold mt-2 tracking-tight">
              {formatTk(summary?.total_billed ?? 0)}
            </h3>
            <p className="text-xs text-emerald-100/80 mt-3 pt-3 border-t border-white/20">
              {summary?.count ?? 0} Invoices Raised
            </p>
          </motion.div>

          {/* Total Collected */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Collected Amount
                </p>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-emerald-700 mt-2">
                {formatTk(summary?.total_collected ?? 0)}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
              Paid in Cash & Digital MFS
            </p>
          </motion.div>

          {/* Outstanding Due */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Outstanding Due
                </p>
                <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-amber-700 mt-2">
                {formatTk(summary?.total_due ?? 0)}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
              Pending patient collection
            </p>
          </motion.div>

          {/* Collection Rate */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Collection Ratio
                </p>
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mt-2">
                {collectionRate}%
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
              Settlement compliance
            </p>
          </motion.div>
        </div>

        {/* Invoices List Section */}
        <div className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                Patient OPD Invoices
              </h2>
              <p className="text-xs text-muted-foreground">
                All raised consultation slips and outpatient bills
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search invoice, patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              {/* Status filter */}
              <div className="flex rounded-xl border border-border overflow-hidden bg-background p-0.5 text-xs">
                {(["ALL", "PAID", "DUE"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      statusFilter === st
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "ALL" ? "All" : st === "PAID" ? "Paid" : "Due"}
                  </button>
                ))}
              </div>

              {/* Modern Facility Filter Popover */}
              {workplaces.length > 1 && (
                <FacilityFilterPopover
                  value={facilityFilter}
                  onChange={setFacilityFilter}
                  facilities={workplaces.map((w) => ({
                    id: w.id,
                    name: w.name,
                    kind: w.kind,
                  }))}
                  allLabel="All Facilities"
                />
              )}

              {/* Modern Date Filter Popover */}
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
          </div>

          {/* Active Filter & Totals Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Showing <strong className="text-foreground font-semibold">{filteredInvoices.length}</strong> of{" "}
                {invoices.length} invoices
              </span>
              {dateFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                  <Calendar className="h-3 w-3 text-emerald-600" />
                  {dateFilter === "today"
                    ? "Today"
                    : dateFilter === "yesterday"
                    ? "Yesterday"
                    : dateFilter === "last7days"
                    ? "Last 7 Days"
                    : dateFilter === "thisMonth"
                    ? "This Month"
                    : `${startDate || "Start"} → ${endDate || "Now"}`}
                </span>
              )}
              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium">
                  Status: {statusFilter}
                </span>
              )}
              {facilityFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium">
                  {facilityFilter}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3.5 text-xs font-medium">
              <span>
                Total:{" "}
                <strong className="text-foreground font-mono font-bold">{formatTk(filteredTotals.total)}</strong>
              </span>
              <span>
                Collected:{" "}
                <strong className="text-emerald-700 font-mono font-bold">{formatTk(filteredTotals.collected)}</strong>
              </span>
              {filteredTotals.due > 0 && (
                <span>
                  Due:{" "}
                  <strong className="text-amber-700 font-mono font-bold">{formatTk(filteredTotals.due)}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Invoice Ref</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Patient Details</th>
                    <th className="px-4 py-3">Facility</th>
                    <th className="px-4 py-3">Clinical Services</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground italic">
                        {loading ? "Loading invoices..." : "No OPD invoices found matching your criteria"}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isPaid = Boolean(inv.paid_at || inv.is_paid);
                      const isChamber = inv.facility_kind === "chamber";
                      return (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {inv.reference}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono">
                            {getInvDate(inv.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-primary">{inv.party}</p>
                            {inv.patient?.mrn && (
                              <p className="text-[10px] text-muted-foreground font-mono">
                                #{inv.patient.mrn}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-foreground/80 font-medium">
                            <span className="flex items-center gap-1">
                              {isChamber ? (
                                <Store className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                              )}
                              {inv.facility_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                            {inv.description || "OPD Consultation"}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900 text-sm font-mono">
                            {formatTk(inv.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="h-3 w-3" /> Due
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReceipt(inv)}
                                className="h-7 px-2.5 text-xs gap-1.5 text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 border-slate-200"
                                title="View & Print Receipt (A4 & Thermal POS)"
                              >
                                <Printer className="h-3.5 w-3.5 text-emerald-700" />
                                <span>Receipt</span>
                              </Button>
                              {!isPaid && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(inv)}
                                  className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1 font-semibold"
                                >
                                  <Check className="h-3 w-3" /> Collect
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create OPD Invoice Modal */}
      <OpdInvoiceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workplaces={workplaces}
        onInvoiceCreated={handleInvoiceCreated}
        formatTk={formatTk}
      />

      {/* Receipt Printable Slip Modal */}
      <OpdInvoiceReceiptModal
        open={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        doctorName={doctorName}
        initialMode={receiptMode}
        formatTk={formatTk}
      />
    </PortalLayout>
  );
}

export default Invoices;
