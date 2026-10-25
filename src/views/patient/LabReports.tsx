"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  TestTube2,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  Stethoscope,
  Printer,
  X,
  FileCheck2,
  AlertCircle,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type LabReport = {
  id: string;
  reference: string;
  test_name: string;
  status: "pending" | "sample_collected" | "processing" | "reported";
  requested_at: string;
  reported_at: string | null;
  result: string | null;
  doctor: { name?: string; specialty?: string | null } | null;
  hospital: { name: string | null; address: string | null; phone: string | null } | null;
};

type FilterStatus = "all" | "reported" | "in_progress" | "pending";

const formatDate = (iso: string | null, locale: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(locale === "bn" ? "bn-BD-u-nu-latn" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const formatTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const statusMeta: Record<
  LabReport["status"],
  { label: string; bnLabel: string; badge: string; step: number }
> = {
  pending: {
    label: "Awaiting Sample",
    bnLabel: "স্যাম্পল অপেক্ষমাণ",
    badge: "bg-muted text-muted-foreground",
    step: 1,
  },
  sample_collected: {
    label: "Sample Collected",
    bnLabel: "স্যাম্পল সংগৃহীত",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    step: 2,
  },
  processing: {
    label: "In Laboratory Processing",
    bnLabel: "ল্যাবে টেস্ট চলমান",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
    step: 3,
  },
  reported: {
    label: "Report Ready",
    bnLabel: "রিপোর্ট প্রস্তুত",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    step: 4,
  },
};

const LabReports = () => {
  const t = useTranslations();
  const locale = useLocale();
  const isBn = locale === "bn";

  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [activeReport, setActiveReport] = useState<LabReport | null>(null);

  useEffect(() => {
    let active = true;
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/v1/patient/lab-reports");
        const body = await res.json().catch(() => null);
        if (active && res.ok) {
          setReports(body.data ?? []);
        }
      } catch {
        toast.error(isBn ? "ল্যাব রিপোর্ট লোড করতে সমস্যা হয়েছে" : "Could not load lab reports");
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchReports();
    return () => {
      active = false;
    };
  }, [isBn]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        !search.trim() ||
        r.test_name.toLowerCase().includes(search.toLowerCase()) ||
        r.reference.toLowerCase().includes(search.toLowerCase()) ||
        (r.hospital?.name && r.hospital.name.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (filter === "reported") return r.status === "reported";
      if (filter === "in_progress")
        return r.status === "processing" || r.status === "sample_collected";
      if (filter === "pending") return r.status === "pending";
      return true;
    });
  }, [reports, search, filter]);

  const counts = useMemo(
    () => ({
      all: reports.length,
      reported: reports.filter((r) => r.status === "reported").length,
      in_progress: reports.filter(
        (r) => r.status === "processing" || r.status === "sample_collected",
      ).length,
      pending: reports.filter((r) => r.status === "pending").length,
    }),
    [reports],
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <PatientPortalLayout>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl lg:text-5xl text-primary font-bold">
            {isBn ? "ডায়াগনস্টিক ল্যাব রিপোর্টস" : "Diagnostic Lab Reports"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isBn
              ? "আপনার সমস্ত প্যাথলজি, বায়োকেমিস্ট্রি ও রেডিওলজি টেস্টের রিপোর্ট ও বর্তমান স্ট্যাটাস"
              : "Track test orders, processing progress, and access verified clinical reports."}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="mt-8 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex gap-2 p-1 rounded-2xl bg-chip/40 border border-border/40 w-fit overflow-x-auto max-w-full">
          {[
            { key: "all", label: isBn ? "সকল টেস্ট" : "All Tests", count: counts.all },
            { key: "reported", label: isBn ? "রিপোর্ট প্রস্তুত" : "Ready to View", count: counts.reported },
            { key: "in_progress", label: isBn ? "প্রক্রিয়াধীন" : "In Progress", count: counts.in_progress },
            { key: "pending", label: isBn ? "স্যাম্পল অপেক্ষমাণ" : "Pending Sample", count: counts.pending },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as FilterStatus)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                filter === tab.key
                  ? "bg-card text-primary shadow-soft"
                  : "text-foreground/70 hover:bg-card/40"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  filter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? "টেস্ট বা রেফারেন্স দিয়ে খুঁজুন..." : "Search by test or reference..."}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center bg-card/40">
            <FlaskConical className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="font-display text-xl text-primary font-semibold">
              {isBn ? "কোনো ল্যাব রিপোর্ট পাওয়া যায়নি" : "No lab test orders found"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {isBn
                ? "ডাক্তারের পরামর্শ অনুযায়ী ল্যাব টেস্ট অর্ডার করা হলে তা এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।"
                : "Diagnostic tests ordered by doctors during your consultations will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map((report) => {
              const meta = statusMeta[report.status];
              const isReady = report.status === "reported";

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-card border border-border/60 p-6 shadow-soft flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-mono tracking-wider font-bold text-muted-foreground uppercase bg-muted/60 px-2 py-0.5 rounded-md">
                          {report.reference}
                        </span>
                        <h3 className="font-display text-xl text-primary font-bold mt-1.5">
                          {report.test_name}
                        </h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
                        {isBn ? meta.bnLabel : meta.label}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1 font-medium">
                        <span>{isBn ? "অর্ডার" : "Ordered"}</span>
                        <span>{isBn ? "স্যাম্পল" : "Sample"}</span>
                        <span>{isBn ? "ল্যাব টেস্ট" : "Testing"}</span>
                        <span>{isBn ? "রিপোর্ট" : "Report"}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isReady ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${(meta.step / 4) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                      {report.hospital?.name && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{report.hospital.name}</span>
                        </div>
                      )}
                      {report.doctor?.name && (
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">
                            {isBn ? "প্রেসক্রাইবকারী: " : "Ordered by: "}
                            {report.doctor.name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>
                          {isBn ? "অর্ডারের তারিখ: " : "Requested on: "}
                          {formatDate(report.requested_at, locale)}
                          {report.reported_at &&
                            ` · ${isBn ? "রিপোর্ট তারিখ: " : "Reported: "} ${formatDate(
                              report.reported_at,
                              locale,
                            )}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between gap-3">
                    {isReady ? (
                      <Button
                        onClick={() => setActiveReport(report)}
                        className="w-full rounded-2xl bg-gradient-dark text-surface-dark-foreground text-xs font-semibold shadow-glow hover:opacity-90 flex items-center justify-center gap-2"
                      >
                        <FileCheck2 className="h-4 w-4" />
                        {isBn ? "রিপোর্ট দেখুন ও ডাউনলোড করুন" : "View Verified Report"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setActiveReport(report)}
                        className="w-full rounded-2xl border-border text-xs font-semibold text-primary hover:bg-chip flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        {isBn ? "স্যাম্পল ও প্রগ্রেস তথ্য" : "View Order Details"}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <Dialog open={!!activeReport} onOpenChange={(open) => !open && setActiveReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-border">
          {activeReport && (
            <div className="p-6 md:p-8 space-y-6 print:p-0">
              {/* Printable Header */}
              <div className="border-b border-border/60 pb-5 flex items-start justify-between">
                <div>
                  <div className="font-display text-2xl font-bold text-primary">
                    {activeReport.hospital?.name || "HealthFlow Diagnostic Center"}
                  </div>
                  {activeReport.hospital?.address && (
                    <p className="text-xs text-muted-foreground mt-0.5">{activeReport.hospital.address}</p>
                  )}
                  {activeReport.hospital?.phone && (
                    <p className="text-xs text-muted-foreground">Phone: {activeReport.hospital.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-chip text-primary">
                    {activeReport.reference}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDate(activeReport.reported_at || activeReport.requested_at, locale)}
                  </p>
                </div>
              </div>

              {/* Test Summary Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-chip/30 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {isBn ? "টেস্টের নাম" : "TEST NAME"}
                  </p>
                  <p className="font-semibold text-primary text-sm mt-0.5">{activeReport.test_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {isBn ? "রেফারিং চিকিৎসক" : "REFERRED BY"}
                  </p>
                  <p className="font-semibold text-primary text-sm mt-0.5">
                    {activeReport.doctor?.name || "OPD / Walk-in"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {isBn ? "স্যাম্পল তারিখ" : "COLLECTED AT"}
                  </p>
                  <p className="font-medium text-foreground/80 mt-0.5">
                    {formatDate(activeReport.requested_at, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {isBn ? "বর্তমান স্ট্যাটাস" : "ORDER STATUS"}
                  </p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 capitalize">
                    {isBn
                      ? statusMeta[activeReport.status].bnLabel
                      : statusMeta[activeReport.status].label}
                  </p>
                </div>
              </div>

              {/* Clinical Results Section */}
              <div>
                <h4 className="font-display text-lg font-bold text-primary flex items-center gap-2">
                  <TestTube2 className="h-4 w-4" />
                  {isBn ? "ক্লিনিক্যাল ফলাফল ও পর্যবেক্ষণ" : "Diagnostic Findings & Results"}
                </h4>

                {activeReport.result ? (
                  <div className="mt-3 p-5 rounded-2xl bg-card border border-border/80 font-mono text-sm whitespace-pre-wrap leading-relaxed shadow-inner">
                    {activeReport.result}
                  </div>
                ) : (
                  <div className="mt-3 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <Clock className="h-6 w-6 text-amber-500 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm font-semibold text-primary">
                      {isBn ? "টেস্ট এখনও ল্যাবরেটরিতে প্রক্রিয়াধীন" : "Laboratory testing in progress"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      {isBn
                        ? "টেস্টের ফলাফল অনুমোদিত হওয়ার সাথে সাথে এখানে প্রদর্শিত হবে এবং আপনি প্রিন্ট করতে পারবেন।"
                        : "The laboratory pathologists are currently analyzing your specimen. The verified report will be published here upon completion."}
                    </p>
                  </div>
                )}
              </div>

              {/* Print & Close Actions */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3 print:hidden">
                <Button
                  variant="outline"
                  onClick={() => setActiveReport(null)}
                  className="rounded-2xl border-border text-xs font-semibold"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  {isBn ? "বন্ধ করুন" : "Close"}
                </Button>

                {activeReport.result && (
                  <Button
                    onClick={handlePrint}
                    className="rounded-2xl bg-gradient-dark text-surface-dark-foreground text-xs font-semibold shadow-glow flex items-center gap-2"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {isBn ? "রিপোর্ট প্রিন্ট বা সংরক্ষণ করুন" : "Print Official Report"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PatientPortalLayout>
  );
};

export default LabReports;
