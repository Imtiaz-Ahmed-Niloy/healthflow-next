// Page catalog grouped by panel — used by Role Management to assign access.
export type PageEntry = { path: string; label: string };
export type Panel = { key: string; label: string; pages: PageEntry[] };

export const PANELS: Panel[] = [
  {
    key: "super",
    label: "Super Admin Panel",
    pages: [
      { path: "/super/dashboard", label: "Dashboard" },
      { path: "/super/hospitals", label: "Hospitals" },
      { path: "/super/roles", label: "Roles & Permissions" },
      { path: "/super/logs", label: "System Logs" },
      { path: "/super/packages", label: "Packages" },
      { path: "/super/global-settings", label: "Global Settings" },
      { path: "/super/whitelisting", label: "Whitelisting" },
      { path: "/super/cms", label: "CMS" },
      { path: "/super/billing", label: "Billing" },
      { path: "/super/integrations", label: "Integrations" },
      { path: "/super/settings", label: "Preferences" },
      { path: "/super/onboarding", label: "Onboarding" },
      
      { path: "/super/announcements", label: "Announcements" },
      { path: "/super/tickets", label: "Support Tickets" },
    ],
  },
  {
    key: "admin",
    label: "Hospital Admin Panel",
    pages: [
      { path: "/admin/dashboard", label: "Dashboard" },
      { path: "/admin/doctors", label: "Doctors" },
      { path: "/admin/doctor-assistants", label: "Doctor Assistants" },
      { path: "/admin/nurses", label: "Nurses" },
      { path: "/admin/support-staff", label: "Support Staff" },
      { path: "/admin/wards", label: "Wards & Cabins" },
      { path: "/admin/lab", label: "Laboratory" },
      { path: "/admin/pharmacy", label: "Pharmacy" },
      { path: "/admin/hospital-profile", label: "Hospital Profile" },
      { path: "/admin/reports", label: "Reports" },
      { path: "/admin/hr", label: "HR" },
      { path: "/admin/onboarding", label: "Onboarding" },
      { path: "/admin/payroll", label: "Payroll" },
      { path: "/admin/personal-files", label: "Personal Files" },
      { path: "/admin/attendance", label: "Attendance" },
      { path: "/admin/assets", label: "Assets" },
      { path: "/admin/procurement", label: "Procurement" },
      { path: "/admin/administration", label: "Administration" },
      { path: "/admin/finance", label: "Finance" },
      { path: "/admin/accounts", label: "Accounts" },
      { path: "/admin/vendors", label: "Vendors" },
      { path: "/admin/patients", label: "Patients" },
      { path: "/admin/appointments", label: "Appointments" },
      { path: "/admin/notifications", label: "Notifications" },
      { path: "/admin/settings", label: "Settings" },
    ],
  },
  {
    key: "portal",
    label: "Doctor Portal",
    pages: [
      { path: "/portal/schedule", label: "Schedule" },
      { path: "/portal/queue", label: "Patient Queue" },
      { path: "/portal/prescription", label: "Prescription" },
      { path: "/portal/directory", label: "Directory" },
    ],
  },
  {
    key: "patient",
    label: "Patient Portal",
    pages: [
      { path: "/patient/dashboard", label: "Dashboard" },
      { path: "/patient/appointments", label: "Appointments" },
      { path: "/patient/find-doctors", label: "Find Doctors" },
      { path: "/patient/medical-records", label: "Medical Records" },
      { path: "/patient/billing", label: "Billing" },
      { path: "/patient/profile", label: "Profile" },
      { path: "/patient/tutorial", label: "Tutorial" },
    ],
  },
];

export type RoleDef = {
  id: string;
  name: string;
  scope: "Platform" | "Tenant" | "Clinical" | "Self";
  users: number;
  pages: string[]; // allowed paths
};

export const DEFAULT_ROLES: RoleDef[] = [
  { id: "super_admin", name: "Super Admin", scope: "Platform", users: 4,
    pages: PANELS.find(p => p.key === "super")!.pages.map(p => p.path) },
  { id: "hospital_admin", name: "Hospital Admin", scope: "Tenant", users: 48,
    pages: PANELS.find(p => p.key === "admin")!.pages.map(p => p.path) },
  { id: "hr_admin", name: "HR Admin", scope: "Tenant", users: 38,
    pages: ["/admin/dashboard","/admin/hr","/admin/onboarding","/admin/personal-files","/admin/attendance","/admin/payroll","/admin/nurses","/admin/support-staff","/admin/doctor-assistants"] },
  { id: "finance_admin", name: "Finance Admin", scope: "Tenant", users: 32,
    pages: ["/admin/dashboard","/admin/finance","/admin/accounts","/admin/payroll","/admin/procurement","/admin/vendors","/admin/reports"] },
  { id: "lab_admin", name: "Lab Admin", scope: "Tenant", users: 21,
    pages: ["/admin/dashboard","/admin/lab","/admin/reports"] },
  { id: "pharmacy_admin", name: "Pharmacy Admin", scope: "Tenant", users: 19,
    pages: ["/admin/dashboard","/admin/pharmacy","/admin/procurement","/admin/vendors"] },
  { id: "doctor", name: "Doctor", scope: "Clinical", users: 612,
    pages: PANELS.find(p => p.key === "portal")!.pages.map(p => p.path) },
  { id: "patient", name: "Patient", scope: "Self", users: 11873,
    pages: PANELS.find(p => p.key === "patient")!.pages.map(p => p.path) },
];
