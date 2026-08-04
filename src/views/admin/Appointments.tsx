"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type Appt = { id: string; patient: string; doctor: string; department: string; date: string; time: string; status: string };
const seed: Appt[] = [
  { id: "AP-9001", patient: "Aisha B.", doctor: "Dr. Imran", department: "Cardiology", date: "2026-05-07", time: "09:00", status: "Scheduled" },
  { id: "AP-9002", patient: "John D.", doctor: "Dr. Sara", department: "Neurology", date: "2026-05-07", time: "10:30", status: "Scheduled" },
  { id: "AP-9003", patient: "Maria K.", doctor: "Dr. Ayesha", department: "Pediatrics", date: "2026-05-06", time: "11:15", status: "Completed" },
  { id: "AP-9004", patient: "Robert L.", doctor: "Dr. Tanvir", department: "Orthopedics", date: "2026-05-06", time: "14:00", status: "Cancelled" },
];
const Appointments = () => (
  <AdminLayout title="Appointment Management" subtitle="Hospital-wide booking queue">
    <ResourcePage<Appt> config={{
      storeKey: "appointments-admin", seed, searchFields: ["patient", "doctor", "department"],
      statuses: ["Scheduled", "Completed", "Cancelled"],
      columns: [
        { key: "id", label: "ID", accessor: r => r.id, render: r => <span className="font-mono text-xs">{r.id}</span> },
        { key: "patient", label: "Patient", sortable: true, accessor: r => r.patient, render: r => <span className="font-semibold text-primary">{r.patient}</span> },
        { key: "doctor", label: "Doctor", sortable: true, accessor: r => r.doctor },
        { key: "department", label: "Department" },
        { key: "date", label: "Date", sortable: true, accessor: r => r.date },
        { key: "time", label: "Time" },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "patient", label: "Patient", type: "text", required: true },
        { name: "doctor", label: "Doctor", type: "text", required: true },
        { name: "department", label: "Department", type: "select", options: ["Cardiology", "Neurology", "Pediatrics", "Orthopedics", "General"] },
        { name: "date", label: "Date", type: "date" },
        { name: "time", label: "Time", type: "text" },
        { name: "status", label: "Status", type: "select", options: ["Scheduled", "Completed", "Cancelled"] },
      ],
    }} />
  </AdminLayout>
);
export default Appointments;

