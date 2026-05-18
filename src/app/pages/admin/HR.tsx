'use client';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";
import { statusTone } from "@/components/admin/crud";

type E = { id: string; empId: string; name: string; department: string; designation: string; doj: string; status: string };
const seed: E[] = [
  { id: "e1", empId: "EMP-1001", name: "Sara Khan", department: "Nursing", designation: "Senior Nurse", doj: "2020-06-15", status: "Active" },
  { id: "e2", empId: "EMP-1002", name: "Imran Hossain", department: "Cardiology", designation: "Consultant", doj: "2018-03-01", status: "Active" },
  { id: "e3", empId: "EMP-1003", name: "Ali Karim", department: "Maintenance", designation: "Technician", doj: "2022-11-20", status: "Onboarding" },
  { id: "e4", empId: "EMP-1004", name: "Lila Ahmed", department: "Finance", designation: "Accountant", doj: "2019-09-09", status: "Exit" },
];
const Page = () => (
  <AdminLayout title="HR Dashboard" subtitle="Employee lifecycle: onboard → active → exit">
    <ResourcePage<E> config={{
      storeKey: "hr-employees", seed, searchFields: ["empId", "name", "department"],
      statuses: ["Active", "Onboarding", "Exit"],
      columns: [
        { key: "empId", label: "Emp ID", accessor: r => r.empId, render: r => <span className="font-mono text-xs">{r.empId}</span> },
        { key: "name", label: "Name", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "department", label: "Department", sortable: true, accessor: r => r.department },
        { key: "designation", label: "Designation" },
        { key: "doj", label: "Date of Joining", sortable: true, accessor: r => r.doj },
        { key: "status", label: "Status", render: r => <Pill tone={statusTone(r.status)}>{r.status}</Pill> },
      ],
      fields: [
        { name: "empId", label: "Employee ID", type: "text", required: true },
        { name: "name", label: "Full name", type: "text", required: true },
        { name: "department", label: "Department", type: "select", options: ["Nursing", "Cardiology", "Neurology", "Maintenance", "Finance", "HR", "IT"] },
        { name: "designation", label: "Designation", type: "text" },
        { name: "doj", label: "Date of joining", type: "date" },
        { name: "status", label: "Status", type: "select", options: ["Active", "Onboarding", "Exit"] },
      ],
    }} />
  </AdminLayout>
);
export default Page;
