"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Btn, Pill } from "@/components/admin/ui";
import {
  Search, Users, CalendarDays, Stethoscope, Building2, Download,
  Phone, Eye, ChevronDown, Activity, ClipboardList,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format, subDays, isAfter } from "date-fns";

type OpdStatus = "Waiting" | "In Consultation" | "Completed" | "No-show";
type Department =
  | "Cardiology" | "Pediatrics" | "Surgery" | "Endocrinology"
  | "Gastroenterology" | "Oncology" | "Dentistry" | "General Medicine";

type OpdVisit = {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: "M" | "F";
  phone: string;
  doctor: string;
  department: Department;
  visitAt: string; // ISO datetime
  token: string;
  fee: number;
  status: OpdStatus;
  complaint: string;
};

const DEPARTMENTS: Department[] = [
  "Cardiology", "Pediatrics", "Surgery", "Endocrinology",
  "Gastroenterology", "Oncology", "Dentistry", "General Medicine",
];

const DOCTORS: { name: string; department: Department }[] = [
  { name: "Dr. Imran Hossain", department: "Cardiology" },
  { name: "Dr. Sara Ahmed", department: "Pediatrics" },
  { name: "Dr. Ayesha Khan", department: "General Medicine" },
  { name: "Dr. Kazi Saiful", department: "Cardiology" },
  { name: "Dr. Shakil Muhammad", department: "Pediatrics" },
  { name: "Dr. Ishrat Jahan", department: "Surgery" },
  { name: "Dr. Md. Ashiqur Rahman", department: "Endocrinology" },
  { name: "Dr. Golam Mahmud", department: "Gastroenterology" },
  { name: "Dr. Md. Khademul Bashar", department: "Oncology" },
  { name: "Dr. Mohammad Shoyeb", department: "Dentistry" },
];

const isoDaysAgo = (d: number, h = 9, m = 0) => {
  const dt = subDays(new Date(), d);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
};

const seed: OpdVisit[] = [
  { id: "v1", mrn: "MRN-10234", name: "Aisha Begum", age: 34, gender: "F", phone: "+880 1711 700111", doctor: "Dr. Imran Hossain", department: "Cardiology", visitAt: isoDaysAgo(0, 9, 15), token: "A-12", fee: 1200, status: "Completed", complaint: "Chest pain on exertion" },
  { id: "v2", mrn: "MRN-10235", name: "John Doe", age: 45, gender: "M", phone: "+880 1711 700222", doctor: "Dr. Kazi Saiful", department: "Cardiology", visitAt: isoDaysAgo(0, 10, 30), token: "A-13", fee: 1500, status: "In Consultation", complaint: "Hypertension follow-up" },
  { id: "v3", mrn: "MRN-10236", name: "Maria Karim", age: 6, gender: "F", phone: "+880 1711 700333", doctor: "Dr. Sara Ahmed", department: "Pediatrics", visitAt: isoDaysAgo(0, 11, 0), token: "P-04", fee: 800, status: "Waiting", complaint: "Persistent cough, fever" },
  { id: "v4", mrn: "MRN-10237", name: "Rakib Hasan", age: 28, gender: "M", phone: "+880 1711 700444", doctor: "Dr. Ayesha Khan", department: "General Medicine", visitAt: isoDaysAgo(0, 12, 15), token: "G-21", fee: 700, status: "Completed", complaint: "General check-up" },
  { id: "v5", mrn: "MRN-10238", name: "Nadia Islam", age: 52, gender: "F", phone: "+880 1711 700555", doctor: "Dr. Md. Ashiqur Rahman", department: "Endocrinology", visitAt: isoDaysAgo(1, 9, 30), token: "E-07", fee: 1300, status: "Completed", complaint: "Type 2 diabetes review" },
  { id: "v6", mrn: "MRN-10239", name: "Tanvir Ahmed", age: 12, gender: "M", phone: "+880 1711 700666", doctor: "Dr. Shakil Muhammad", department: "Pediatrics", visitAt: isoDaysAgo(2, 10, 0), token: "P-09", fee: 800, status: "Completed", complaint: "Skin rash" },
  { id: "v7", mrn: "MRN-10240", name: "Salma Akter", age: 38, gender: "F", phone: "+880 1711 700777", doctor: "Dr. Ishrat Jahan", department: "Surgery", visitAt: isoDaysAgo(3, 14, 0), token: "S-03", fee: 1800, status: "Completed", complaint: "Pre-op consultation" },
  { id: "v8", mrn: "MRN-10241", name: "Hasan Mahmud", age: 60, gender: "M", phone: "+880 1711 700888", doctor: "Dr. Golam Mahmud", department: "Gastroenterology", visitAt: isoDaysAgo(4, 11, 0), token: "GA-05", fee: 1400, status: "No-show", complaint: "Abdominal pain" },
  { id: "v9", mrn: "MRN-10242", name: "Fariha Sultana", age: 41, gender: "F", phone: "+880 1711 700999", doctor: "Dr. Md. Khademul Bashar", department: "Oncology", visitAt: isoDaysAgo(5, 10, 30), token: "O-02", fee: 2200, status: "Completed", complaint: "Post-chemo follow-up" },
  { id: "v10", mrn: "MRN-10243", name: "Imtiaz Khan", age: 22, gender: "M", phone: "+880 1711 701000", doctor: "Dr. Mohammad Shoyeb", department: "Dentistry", visitAt: isoDaysAgo(6, 12, 30), token: "D-11", fee: 600, status: "Completed", complaint: "Toothache" },
  { id: "v11", mrn: "MRN-10244", name: "Rumi Akhter", age: 33, gender: "F", phone: "+880 1711 701111", doctor: "Dr. Ayesha Khan", department: "General Medicine", visitAt: isoDaysAgo(9, 9, 0), token: "G-44", fee: 700, status: "Completed", complaint: "Migraine" },
  { id: "v12", mrn: "MRN-10245", name: "Shahed Mia", age: 49, gender: "M", phone: "+880 1711 701222", doctor: "Dr. Imran Hossain", department: "Cardiology", visitAt: isoDaysAgo(12, 11, 30), token: "A-31", fee: 1200, status: "Completed", complaint: "Palpitations" },
  { id: "v13", mrn: "MRN-10246", name: "Lima Khatun", age: 27, gender: "F", phone: "+880 1711 701333", doctor: "Dr. Sara Ahmed", department: "Pediatrics", visitAt: isoDaysAgo(15, 10, 0), token: "P-22", fee: 800, status: "Completed", complaint: "Child vaccination" },
  { id: "v14", mrn: "MRN-10247", name: "Mahin Chowdhury", age: 55, gender: "M", phone: "+880 1711 701444", doctor: "Dr. Md. Ashiqur Rahman", department: "Endocrinology", visitAt: isoDaysAgo(20, 14, 30), token: "E-18", fee: 1300, status: "Completed", complaint: "Thyroid review" },
  { id: "v15", mrn: "MRN-10248", name: "Sumi Begum", age: 40, gender: "F", phone: "+880 1711 701555", doctor: "Dr. Golam Mahmud", department: "Gastroenterology", visitAt: isoDaysAgo(25, 11, 0), token: "GA-15", fee: 1400, status: "Completed", complaint: "GERD follow-up" },
];

const RANGES = ["Today", "Week", "Month"] as const;
type Range = (typeof RANGES)[number];

const statusTone = (s: OpdStatus) =>
  s === "Completed" ? "ok"
    : s === "In Consultation" ? "info"
    : s === "Waiting" ? "warn"
    : "bad" as const;

const Stat = ({ icon: Icon, label, value, accent }: {
  icon: typeof Users; label: string; value: string | number; accent: string;
}) => (
  <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-5 flex items-start justify-between">
    <div>
      <p className="text-[11px] tracking-widest font-bold text-muted-foreground">{label.toUpperCase()}</p>
      <p className="font-display text-3xl text-primary mt-1.5">{value}</p>
    </div>
    <div className={`h-10 w-10 rounded-xl grid place-items-center ${accent}`}>
      <Icon className="h-5 w-5" />
    </div>
  </div>
);

const Patients = () => {
  const [range, setRange] = useState<Range>("Today");
  const [department, setDepartment] = useState<"All" | Department>("All");
  const [doctor, setDoctor] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<OpdVisit | null>(null);

  const doctorOptions = useMemo(() => {
    if (department === "All") return DOCTORS;
    return DOCTORS.filter(d => d.department === department);
  }, [department]);

  const filtered = useMemo(() => {
    const cutoff =
      range === "Today" ? subDays(new Date(), 1)
      : range === "Week" ? subDays(new Date(), 7)
      : subDays(new Date(), 30);

    return seed.filter(v => {
      const inRange = isAfter(new Date(v.visitAt), cutoff);
      const matchesDept = department === "All" || v.department === department;
      const matchesDoc = doctor === "All" || v.doctor === doctor;
      const q = query.toLowerCase();
      const matchesQ = !q ||
        v.name.toLowerCase().includes(q) ||
        v.mrn.toLowerCase().includes(q) ||
        v.phone.toLowerCase().includes(q) ||
        v.complaint.toLowerCase().includes(q);
      return inRange && matchesDept && matchesDoc && matchesQ;
    });
  }, [range, department, doctor, query]);

  const stats = useMemo(() => ({
    total: filtered.length,
    completed: filtered.filter(v => v.status === "Completed").length,
    waiting: filtered.filter(v => v.status === "Waiting" || v.status === "In Consultation").length,
    revenue: filtered.filter(v => v.status === "Completed").reduce((s, v) => s + v.fee, 0),
  }), [filtered]);

  const departmentBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach(v => counts.set(v.department, (counts.get(v.department) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const exportCsv = () => {
    const rows = [
      ["MRN", "Name", "Age", "Gender", "Phone", "Doctor", "Department", "Visit", "Token", "Fee", "Status", "Complaint"],
      ...filtered.map(v => [
        v.mrn, v.name, v.age, v.gender, v.phone, v.doctor, v.department,
        format(new Date(v.visitAt), "yyyy-MM-dd HH:mm"), v.token, v.fee, v.status, v.complaint,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `opd-${range.toLowerCase()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="OPD Patients" subtitle="Outpatient consultations across all departments">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Users} label={`OPD ${range}`} value={stats.total} accent="bg-primary/10 text-primary" />
          <Stat icon={Activity} label="In Queue" value={stats.waiting} accent="bg-chip text-chip-foreground" />
          <Stat icon={ClipboardList} label="Completed" value={stats.completed} accent="bg-accent/40 text-accent-foreground" />
          <Stat icon={CalendarDays} label="Revenue (BDT)" value={`৳${stats.revenue.toLocaleString()}`} accent="bg-muted text-foreground/70" />
        </div>

        {/* Filter bar */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Range */}
            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    range === r ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {r === "Today" ? "Daily" : r === "Week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>

            {/* Department */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={department}
                onChange={e => { setDepartment(e.target.value as Department | "All"); setDoctor("All"); }}
                className="appearance-none pl-9 pr-9 py-2 rounded-full bg-muted/40 border border-border/60 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Doctor */}
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={doctor}
                onChange={e => setDoctor(e.target.value)}
                className="appearance-none pl-9 pr-9 py-2 rounded-full bg-muted/40 border border-border/60 text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="All">All Doctors</option>
                {doctorOptions.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Btn variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4" /> Export
              </Btn>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, MRN, phone or complaint…"
              className="pl-9 bg-muted/40 border-border/60"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Table */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] tracking-widest font-bold text-muted-foreground bg-muted/30">
                    <th className="px-5 py-3.5">PATIENT</th>
                    <th className="px-5 py-3.5 hidden md:table-cell">DOCTOR / DEPT</th>
                    <th className="px-5 py-3.5 hidden lg:table-cell">VISIT</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map(v => (
                    <tr key={v.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/40 grid place-items-center text-xs font-bold text-primary">
                            {v.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-primary truncate">{v.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {v.mrn} · {v.gender} · {v.age}y
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <p className="text-sm font-semibold text-primary">{v.doctor}</p>
                        <p className="text-[11px] text-muted-foreground">{v.department}</p>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-sm text-foreground/80">{format(new Date(v.visitAt), "MMM d, yyyy")}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(v.visitAt), "HH:mm")} · Token {v.token}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Pill tone={statusTone(v.status)}>{v.status}</Pill>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`tel:${v.phone.replace(/\s/g, "")}`}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title={`Call ${v.phone}`}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => setView(v)}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-primary">No OPD visits in this range</p>
                        <p className="text-xs text-muted-foreground mt-1">Try a wider time range or clear filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing <span className="font-bold text-primary">{filtered.length}</span> visits</span>
              <span>Range: {range === "Today" ? "Last 24 hours" : range === "Week" ? "Last 7 days" : "Last 30 days"}</span>
            </div>
          </div>

          {/* Side panel: department breakdown */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-5">
            <p className="text-[10px] tracking-widest font-bold text-muted-foreground mb-3">
              TOP DEPARTMENTS · {range.toUpperCase()}
            </p>
            <div className="space-y-3">
              {departmentBreakdown.length === 0 && (
                <p className="text-xs text-muted-foreground">No data for the selected range.</p>
              )}
              {departmentBreakdown.map(([dept, count]) => {
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={dept}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold text-primary truncate">{dept}</span>
                      <span className="text-xs text-muted-foreground">{count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-glow"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!view} onOpenChange={o => !o && setView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{view?.name}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["MRN", view.mrn],
                  ["Age / Gender", `${view.age}y · ${view.gender}`],
                  ["Phone", view.phone],
                  ["Token", view.token],
                  ["Doctor", view.doctor],
                  ["Department", view.department],
                  ["Visit", format(new Date(view.visitAt), "MMM d, yyyy · HH:mm")],
                  ["Fee", `৳${view.fee.toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-[10px] tracking-widest font-bold text-muted-foreground">{k}</p>
                    <p className="text-sm font-semibold text-primary mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-muted/40 px-3 py-2">
                <p className="text-[10px] tracking-widest font-bold text-muted-foreground">CHIEF COMPLAINT</p>
                <p className="text-sm text-foreground/80 mt-0.5">{view.complaint}</p>
              </div>
              <div>
                <Pill tone={statusTone(view.status)}>{view.status}</Pill>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Patients;

