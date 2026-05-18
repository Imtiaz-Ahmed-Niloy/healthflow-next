'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  experience: string;
  status: string;
  // Profile fields (matching /doctors/:slug page)
  education: string;
  languages: string;
  rating: string;
  fee: string;
  patients: string;
  available: string;
  photo: string;
  hospital: string;
  consultationDuration: string;
  expertise: string;
  bio: string;
};

const seed: Doctor[] = [
  {
    id: "d1", name: "Dr. Imran Khan", specialty: "Cardiology",
    email: "imran@hf.pro", phone: "+1 555 0101", experience: "12",
    status: "Active", education: "MBBS, MD (Cardiology)",
    languages: "English, Bangla, Urdu", rating: "4.8", fee: "120",
    patients: "5400", available: "Mon–Fri", photo: "",
    hospital: "Atrium Health", consultationDuration: "30 min",
    expertise: "Interventional Cardiology, Preventive Care",
    bio: "Board-certified cardiologist with extensive experience.",
  },
  {
    id: "d2", name: "Dr. Sara Ahmed", specialty: "Neurology",
    email: "sara@hf.pro", phone: "+1 555 0102", experience: "9",
    status: "Active", education: "MBBS, FCPS (Neurology)",
    languages: "English, Bangla", rating: "4.7", fee: "150",
    patients: "3200", available: "Tue–Sat", photo: "",
    hospital: "Coastal Medical", consultationDuration: "30 min",
    expertise: "Stroke care, Epilepsy", bio: "",
  },
];

const Doctors = () => (
  <AdminLayout title="Doctor Management" subtitle="Onboard, edit, schedule and manage physicians">
    <ResourcePage<Doctor> config={{
      storeKey: "doctors",
      seed,
      searchFields: ["name", "specialty", "email"],
      statuses: ["Active", "On Leave", "Suspended"],
      columns: [
        { key: "name", label: "Name", accessor: r => r.name, sortable: true,
          render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "specialty", label: "Specialty", accessor: r => r.specialty, sortable: true },
        { key: "email", label: "Email", accessor: r => r.email },
        { key: "phone", label: "Phone", accessor: r => r.phone },
        { key: "experience", label: "Exp (yrs)", accessor: r => r.experience, sortable: true },
        { key: "fee", label: "Fee", accessor: r => r.fee },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "photo", label: "Doctor photo", type: "image" },
        { name: "name", label: "Full name", type: "text", required: true },
        { name: "specialty", label: "Specialty", type: "select", options: ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Oncology", "Dermatology", "Gynecology", "General"] },
        { name: "education", label: "Education / Qualifications", type: "text", required: true },
        { name: "experience", label: "Experience (years)", type: "number", required: true },
        { name: "rating", label: "Rating (0–5)", type: "number" },
        { name: "fee", label: "Consultation Fee (USD)", type: "number", required: true },
        { name: "patients", label: "Patients treated", type: "number" },
        { name: "consultationDuration", label: "Consultation duration", type: "text" },
        { name: "languages", label: "Languages (comma separated)", type: "text" },
        { name: "available", label: "Availability", type: "text" },
        { name: "hospital", label: "Practicing Hospital", type: "text" },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "status", label: "Status", type: "select", options: ["Active", "On Leave", "Suspended"] },
        { name: "expertise", label: "Areas of Expertise (comma separated)", type: "textarea" },
        { name: "bio", label: "About / Biography", type: "textarea" },
      ],
    }} />
  </AdminLayout>
);
export default Doctors;
