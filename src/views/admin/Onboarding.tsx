"use client";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type O = {
  id: string;
  empId: string;
  name: string;
  department: string;
  designation: string;
  startDate: string;
  documents: string;
  orientation: string;
  status: string;
  fatherName?: string;
  motherName?: string;
  maritalStatus?: string;
  religion?: string;
  bloodGroup?: string;
  nid?: string;
  phone?: string;
  email?: string;
  employmentType?: string;
  jobStatus?: string;
  grossSalary?: string;
  endDate?: string;
  presentAddress?: string;
  permanentAddress?: string;
};

const seed: O[] = [
  { id: "o1", empId: "EMP-1101", name: "Nadia Rahman", department: "Nursing", designation: "Staff Nurse", startDate: "2026-05-20", documents: "Pending", orientation: "Scheduled", status: "In Progress",
    fatherName: "Abdul Rahman", motherName: "Ayesha Rahman", maritalStatus: "Single", religion: "Islam", bloodGroup: "B+",
    nid: "1990123456789", phone: "+8801711000111", email: "nadia.rahman@example.com",
    employmentType: "Full-time", jobStatus: "Probation", grossSalary: "55000", endDate: "", presentAddress: "Dhanmondi, Dhaka", permanentAddress: "Sylhet" },
  { id: "o2", empId: "EMP-1102", name: "Tanvir Ahmed", department: "IT", designation: "Systems Engineer", startDate: "2026-05-15", documents: "Verified", orientation: "Completed", status: "Completed",
    fatherName: "Mahbub Ahmed", motherName: "Rina Ahmed", maritalStatus: "Married", religion: "Islam", bloodGroup: "O+",
    nid: "1988123456789", phone: "+8801711000222", email: "tanvir.ahmed@example.com",
    employmentType: "Full-time", jobStatus: "Active", grossSalary: "85000", endDate: "", presentAddress: "Gulshan, Dhaka", permanentAddress: "Chittagong" },
  { id: "o3", empId: "EMP-1103", name: "Mariam Chowdhury", department: "Finance", designation: "Junior Accountant", startDate: "2026-06-01", documents: "Pending", orientation: "Pending", status: "Pending",
    fatherName: "Kamrul Chowdhury", motherName: "Salma Chowdhury", maritalStatus: "Single", religion: "Islam", bloodGroup: "A+",
    nid: "1995123456789", phone: "+8801711000333", email: "mariam.c@example.com",
    employmentType: "Contract", jobStatus: "Active", grossSalary: "45000", endDate: "2027-06-01", presentAddress: "Uttara, Dhaka", permanentAddress: "Comilla" },
];

const Page = () => (
  <AdminLayout title="Employees" subtitle="Onboard new employees: documents → orientation → activation">
    <ResourcePage<O>
      config={{
        storeKey: "hr-onboarding-v2",
        addLabel: "Onboard New Employee",
        seed,
        searchFields: ["empId", "name", "department", "designation", "phone", "email", "nid"],
        statuses: ["Pending", "In Progress", "Completed"],
        columns: [
          { key: "empId", label: "Emp ID", accessor: r => r.empId, render: r => <span className="font-mono text-xs">{r.empId}</span> },
          { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "department", label: "Department", sortable: true, accessor: r => r.department },
          { key: "designation", label: "Designation" },
          { key: "phone", label: "Phone", render: r => <span className="font-mono text-xs">{r.phone || "—"}</span> },
          { key: "email", label: "Email", render: r => <span className="text-xs">{r.email || "—"}</span> },
          { key: "employmentType", label: "Type", render: r => r.employmentType ? <Pill tone="info">{r.employmentType}</Pill> : <span className="text-muted-foreground">—</span> },
          { key: "jobStatus", label: "Job", render: r => r.jobStatus ? <Pill tone={statusTone(r.jobStatus)}>{r.jobStatus}</Pill> : <span className="text-muted-foreground">—</span> },
          { key: "grossSalary", label: "Salary", render: r => <span className="font-mono text-xs">{r.grossSalary ? `৳${Number(r.grossSalary).toLocaleString()}` : "—"}</span> },
          { key: "startDate", label: "Start", sortable: true, accessor: r => r.startDate },
          { key: "documents", label: "Docs", render: r => <Pill tone={statusTone(r.documents)}>{r.documents}</Pill> },
          { key: "orientation", label: "Orientation", render: r => <Pill tone={statusTone(r.orientation)}>{r.orientation}</Pill> },
          { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
        ],
        fields: [
          { name: "empId", label: "Employee ID", type: "text", required: true },
          { name: "name", label: "Full name", type: "text", required: true },
          { name: "fatherName", label: "Father's name", type: "text" },
          { name: "motherName", label: "Mother's name", type: "text" },
          { name: "maritalStatus", label: "Marital status", type: "select", options: ["Single", "Married", "Divorced", "Widowed"] },
          { name: "religion", label: "Religion", type: "select", options: ["Islam", "Hinduism", "Christianity", "Buddhism", "Other"] },
          { name: "bloodGroup", label: "Blood group", type: "select", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
          { name: "nid", label: "NID number", type: "text" },
          { name: "phone", label: "Phone number", type: "tel" },
          { name: "email", label: "Email", type: "email" },
          { name: "department", label: "Department", type: "select", options: ["Nursing", "Cardiology", "Neurology", "Maintenance", "Finance", "HR", "IT"] },
          { name: "designation", label: "Designation", type: "text" },
          { name: "employmentType", label: "Employment type", type: "select", options: ["Full-time", "Part-time", "Contract", "Intern", "Consultant"] },
          { name: "jobStatus", label: "Job status", type: "select", options: ["Active", "Probation", "Suspended", "Terminated", "Resigned"] },
          { name: "grossSalary", label: "Gross salary", type: "number", min: 0, numberStep: 0.01 },
          { name: "startDate", label: "Start date", type: "date" },
          { name: "endDate", label: "End date", type: "date" },
          { name: "presentAddress", label: "Present address", type: "textarea", fullWidth: true },
          { name: "permanentAddress", label: "Permanent address", type: "textarea", fullWidth: true },
          { name: "documents", label: "Documents", type: "select", options: ["Pending", "Verified", "Rejected"] },
          { name: "orientation", label: "Orientation", type: "select", options: ["Pending", "Scheduled", "Completed"] },
          { name: "status", label: "Status", type: "select", options: ["Pending", "In Progress", "Completed"] },
        ],
      }}
    />
  </AdminLayout>
);

export default Page;

