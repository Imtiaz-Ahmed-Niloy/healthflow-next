"use client";

import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { DataTable, Toolbar, Modal, Chips, RowActions, exportCSV, type Column } from "@/components/admin/crud";
import { useResourceCrud } from "@/components/admin/useResourceCrud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { useFormatters } from "@/lib/appSettings";
import {
  Scissors, Stethoscope, Clock, CheckCircle2, AlertTriangle,
  Calendar, Plus, User, BedDouble, ShieldCheck, Printer,
} from "lucide-react";
import { doctorsApi, patientsApi } from "@/redux/api/resources";

type OperationTheatre = {
  id: string;
  name: string;
  code: string;
  status: "available" | "in_use" | "cleaning" | "maintenance";
  floor?: string | null;
  charges_per_hour: number;
  notes?: string | null;
};

type OtSchedule = {
  id: string;
  ot_id: string;
  patient_id: string;
  doctor_id?: string | null;
  anesthesiologist_id?: string | null;
  surgery_name: string;
  start_time: string;
  end_time?: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "delayed";
  anesthesia_type: string;
  pre_op_notes?: string | null;
  post_op_notes?: string | null;
  patients?: { full_name: string; mrn: string } | null;
  doctors?: { name: string; specialty: string } | null;
  operation_theatres?: { name: string; code: string } | null;
};

export default function OperationTheatreView() {
  const { formatCurrency, formatDateTime } = useFormatters();
  const { push } = useNotifications();

  const otCrud = useResourceCrud<OperationTheatre>("operation-theatres");
  const scheduleCrud = useResourceCrud<OtSchedule>("ot-schedules");

  const { data: doctorsData } = doctorsApi.useList({ limit: 100 });
  const doctors = doctorsData?.data || [];

  const { data: patientsData } = patientsApi.useList({ limit: 100 });
  const patients = patientsData?.data || [];

  const [activeTab, setActiveTab] = useState<"schedules" | "theatres">("schedules");
  const [q, setQ] = useState("");
  const [addSchedule, setAddSchedule] = useState(false);
  const [addTheatre, setAddTheatre] = useState(false);

  // Form draft for schedule
  const [surgeryName, setSurgeryName] = useState("");
  const [selectedOt, setSelectedOt] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedAnesth, setSelectedAnesth] = useState("");
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [anesthesiaType, setAnesthesiaType] = useState("General");
  const [preOpNotes, setPreOpNotes] = useState("Pre-op fasting complete. Blood cross-matched. Consent signed.");

  // Form draft for theatre
  const [otName, setOtName] = useState("");
  const [otCode, setOtCode] = useState("");
  const [floor, setFloor] = useState("3rd Floor");
  const [chargesPerHour, setChargesPerHour] = useState("3500");

  const theatres = otCrud.items;
  const schedules = scheduleCrud.items;

  // KPIs
  const activeSurgeries = schedules.filter((s) => s.status === "in_progress").length;
  const scheduledToday = schedules.filter((s) => s.status === "scheduled").length;
  const availableOTs = theatres.filter((t) => t.status === "available").length;

  const filteredSchedules = useMemo(() => {
    if (!q) return schedules;
    const term = q.toLowerCase();
    return schedules.filter(
      (s) =>
        s.surgery_name.toLowerCase().includes(term) ||
        (s.patients?.full_name || "").toLowerCase().includes(term)
    );
  }, [schedules, q]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOt || !selectedPatient || !surgeryName) return;

    const ok = await scheduleCrud.create({
      ot_id: selectedOt,
      patient_id: selectedPatient,
      doctor_id: selectedDoctor || null,
      anesthesiologist_id: selectedAnesth || null,
      surgery_name: surgeryName.trim(),
      start_time: new Date(startTime).toISOString(),
      status: "scheduled",
      anesthesia_type: anesthesiaType,
      pre_op_notes: preOpNotes,
    } as any);

    if (ok) {
      push({ title: "Surgical Case Scheduled", tone: "ok" });
      setAddSchedule(false);
      setSurgeryName("");
    }
  };

  const handleCreateTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otName || !otCode) return;

    const ok = await otCrud.create({
      name: otName.trim(),
      code: otCode.trim().toUpperCase(),
      status: "available",
      floor: floor.trim(),
      charges_per_hour: Number(chargesPerHour || 0),
    } as any);

    if (ok) {
      push({ title: `OT ${otCode} Added to Registry`, tone: "ok" });
      setAddTheatre(false);
      setOtName("");
      setOtCode("");
    }
  };

  const handleStatusChange = async (scheduleId: string, otId: string, nextStatus: OtSchedule["status"]) => {
    await scheduleCrud.update(scheduleId, { status: nextStatus } as any);

    // Sync OT room status
    if (nextStatus === "in_progress") {
      await otCrud.update(otId, { status: "in_use" } as any);
    } else if (nextStatus === "completed") {
      await otCrud.update(otId, { status: "cleaning" } as any);
    }

    push({ title: `Surgery status updated to ${nextStatus}`, tone: "info" });
  };

  const scheduleCols: Column<OtSchedule>[] = [
    {
      key: "surgery_name",
      label: "Surgery Name",
      sortable: true,
      accessor: (r) => r.surgery_name,
      render: (r) => (
        <div>
          <span className="font-bold text-foreground">{r.surgery_name}</span>
          <p className="text-[11px] text-muted-foreground font-mono">
            {r.anesthesia_type} Anesthesia
          </p>
        </div>
      ),
    },
    {
      key: "patient",
      label: "Patient",
      render: (r) => {
        const pt = patients.find((p) => p.id === r.patient_id);
        return (
          <div>
            <span className="font-semibold text-primary">{pt?.full_name || "Patient"}</span>
            <p className="text-[10px] font-mono text-muted-foreground">{pt?.mrn || ""}</p>
          </div>
        );
      },
    },
    {
      key: "theatre",
      label: "OT Room",
      render: (r) => {
        const room = theatres.find((t) => t.id === r.ot_id);
        return <span className="font-semibold text-xs text-foreground">{room?.name || "OT Room"}</span>;
      },
    },
    {
      key: "surgeon",
      label: "Lead Surgeon",
      render: (r) => {
        const doc = doctors.find((d) => d.id === r.doctor_id);
        return <span className="text-xs text-foreground">Dr. {doc?.name || "Assigned Surgeon"}</span>;
      },
    },
    {
      key: "start_time",
      label: "Scheduled Time",
      sortable: true,
      accessor: (r) => r.start_time,
      render: (r) => <span className="text-xs font-mono text-muted-foreground">{formatDateTime(r.start_time)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Pill tone={r.status === "in_progress" ? "bad" : r.status === "completed" ? "ok" : "warn"}>
          {r.status.replace(/_/g, " ")}
        </Pill>
      ),
    },
  ];

  return (
    <AdminLayout title="Operation Theatre (OT)" subtitle="Surgical Suite Management & Real-time Scheduling">
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Kpi icon={Scissors} label="Surgeries In Progress" value={activeSurgeries.toString()} tone="destructive" />
          <Kpi icon={Calendar} label="Scheduled Cases Today" value={scheduledToday.toString()} tone="accent" />
          <Kpi icon={BedDouble} label="Vacant OT Rooms" value={`${availableOTs} / ${theatres.length}`} tone="ok" />
          <Kpi icon={CheckCircle2} label="Completed Surgeries" value={schedules.filter((s) => s.status === "completed").length.toString()} tone="chip" />
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-border/70 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "schedules" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Surgical Schedule Board ({schedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("theatres")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "theatres" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            OT Rooms & Suites ({theatres.length})
          </button>
        </div>

        {activeTab === "schedules" && (
          <Card className="p-5">
            <Toolbar
              search={q}
              onSearch={setQ}
              onAdd={() => setAddSchedule(true)}
              addLabel="Schedule New Surgery"
              onExport={() => exportCSV(filteredSchedules as never, "ot-schedules.csv")}
            />

            <DataTable<OtSchedule>
              rows={filteredSchedules}
              columns={scheduleCols}
              empty="No surgical cases scheduled yet."
              actions={(r) => (
                <RowActions
                  extra={
                    <div className="flex items-center gap-1.5">
                      {r.status === "scheduled" && (
                        <Btn variant="outline" onClick={() => handleStatusChange(r.id, r.ot_id, "in_progress")} className="text-xs py-1 px-2.5">
                          Start Surgery
                        </Btn>
                      )}
                      {r.status === "in_progress" && (
                        <Btn variant="primary" onClick={() => handleStatusChange(r.id, r.ot_id, "completed")} className="text-xs py-1 px-2.5">
                          Mark Completed
                        </Btn>
                      )}
                    </div>
                  }
                />
              )}
            />
          </Card>
        )}

        {activeTab === "theatres" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <SectionTitle title="Operating Rooms" />
              <Btn onClick={() => setAddTheatre(true)} variant="primary" className="text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add OT Suite
              </Btn>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {theatres.map((ot) => (
                <Card key={ot.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{ot.name}</h4>
                      <p className="font-mono text-xs text-muted-foreground">{ot.code} • {ot.floor || "Main Wing"}</p>
                    </div>
                    <Pill tone={ot.status === "available" ? "ok" : ot.status === "in_use" ? "bad" : "warn"}>
                      {ot.status.replace(/_/g, " ")}
                    </Pill>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border/60 flex items-center justify-between">
                    <span>Base Hourly Charge:</span>
                    <span className="font-bold font-mono text-foreground">{formatCurrency(ot.charges_per_hour)}/hr</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Surgery Modal */}
        <Modal open={addSchedule} onClose={() => setAddSchedule(false)} title="Schedule New Surgical Procedure" size="lg">
          <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Surgery / Procedure Name *</label>
                <input
                  type="text"
                  value={surgeryName}
                  onChange={(e) => setSurgeryName(e.target.value)}
                  placeholder="e.g. Laparoscopic Cholecystectomy"
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Operation Theatre *</label>
                <select
                  value={selectedOt}
                  onChange={(e) => setSelectedOt(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-medium"
                  required
                >
                  <option value="">-- Choose OT Suite --</option>
                  {theatres.map((ot) => (
                    <option key={ot.id} value={ot.id}>
                      {ot.name} ({ot.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Patient *</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-medium"
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Lead Surgeon</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                >
                  <option value="">-- Choose Surgeon --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} {d.specialty ? `(${d.specialty})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Anesthesiologist</label>
                <select
                  value={selectedAnesth}
                  onChange={(e) => setSelectedAnesth(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                >
                  <option value="">-- Optional Consultant --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Scheduled Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Anesthesia Type</label>
                <select
                  value={anesthesiaType}
                  onChange={(e) => setAnesthesiaType(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                >
                  <option value="General">General</option>
                  <option value="Spinal">Spinal</option>
                  <option value="Local">Local</option>
                  <option value="Sedation">Sedation</option>
                  <option value="Epidural">Epidural</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Pre-Operative Checklist & Notes</label>
              <textarea
                rows={2}
                value={preOpNotes}
                onChange={(e) => setPreOpNotes(e.target.value)}
                className="w-full bg-card border border-border/70 rounded-lg p-2"
              />
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end gap-2">
              <Btn type="button" variant="outline" onClick={() => setAddSchedule(false)} className="text-xs">
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" className="text-xs">
                Schedule Case
              </Btn>
            </div>
          </form>
        </Modal>

        {/* Add Theatre Modal */}
        <Modal open={addTheatre} onClose={() => setAddTheatre(false)} title="Register Operating Theatre Room" size="md">
          <form onSubmit={handleCreateTheatre} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Room Name *</label>
              <input
                type="text"
                value={otName}
                onChange={(e) => setOtName(e.target.value)}
                placeholder="e.g. Operation Theatre 1 (Cardiac)"
                className="w-full bg-card border border-border/70 rounded-lg p-2 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Room Code *</label>
              <input
                type="text"
                value={otCode}
                onChange={(e) => setOtCode(e.target.value)}
                placeholder="OT-1"
                className="w-full bg-card border border-border/70 rounded-lg p-2 font-mono uppercase"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Floor / Wing</label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Charge Per Hour</label>
                <input
                  type="number"
                  value={chargesPerHour}
                  onChange={(e) => setChargesPerHour(e.target.value)}
                  className="w-full bg-card border border-border/70 rounded-lg p-2 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex justify-end gap-2">
              <Btn type="button" variant="outline" onClick={() => setAddTheatre(false)} className="text-xs">
                Cancel
              </Btn>
              <Btn type="submit" variant="primary" className="text-xs">
                Save OT Room
              </Btn>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
