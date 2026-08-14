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

// The roles themselves live in `public.roles`, seeded with these same page
// grants by 0009_roles_management.sql. This file is only the catalogue the
// Role Management screen renders checkboxes from.
