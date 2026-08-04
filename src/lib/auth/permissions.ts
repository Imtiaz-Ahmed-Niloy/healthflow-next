import type { Database } from "@/lib/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Action = "view" | "create" | "edit" | "delete" | "approve";

/**
 * UI-level permission matrix.
 *
 * This decides what a role can *see and press*. It is not the security
 * boundary — RLS is. Anything this lets through is still checked by the
 * database, and anything the database refuses stays refused however this
 * matrix is edited. Its job is to avoid showing people buttons that would
 * fail.
 *
 * "*" is the fallback for any resource not named explicitly.
 */
const ALL: Action[] = ["view", "create", "edit", "delete", "approve"];

const matrix: Record<AppRole, Record<string, Action[]>> = {
  super_admin: { "*": ALL },
  hospital_admin: { "*": ALL },

  hr_admin: {
    hr: ALL,
    staff: ALL,
    employees: ALL,
    attendance: ["view", "approve"],
    nurses: ["view", "edit"],
    doctors: ["view"],
    payroll: ["view"],
    "*": ["view"],
  },

  finance_admin: {
    finance: ALL,
    accounts: ALL,
    payroll: ALL,
    invoices: ALL,
    billing: ["view", "create", "edit"],
    procurement: ["view", "approve"],
    "*": ["view"],
  },

  lab_admin: { lab: ALL, "*": ["view"] },

  pharmacy_admin: { pharmacy: ALL, "*": ["view"] },

  doctor: {
    appointments: ["view", "edit"],
    prescriptions: ALL,
    patients: ["view"],
    medical_records: ["view", "create", "edit"],
    "*": ["view"],
  },

  patient: {
    appointments: ["view", "create"],
    prescriptions: ["view"],
    medical_records: ["view"],
    "*": ["view"],
  },
};

export const can = (
  action: Action,
  resource: string,
  role: AppRole | null | undefined,
): boolean => {
  if (!role) return false;

  const forRole = matrix[role] ?? {};
  const actions = forRole[resource] ?? forRole["*"] ?? [];

  return actions.includes(action);
};

/** Where a role lands after signing in. */
export const homePathForRole = (role: AppRole | null | undefined): string => {
  switch (role) {
    case "super_admin":
      return "/super/dashboard";
    case "hospital_admin":
    case "hr_admin":
    case "finance_admin":
    case "lab_admin":
    case "pharmacy_admin":
      return "/admin/dashboard";
    case "doctor":
      return "/portal/dashboard";
    case "patient":
      return "/patient/dashboard";
    default:
      return "/";
  }
};

/** Human label for a role, for headers and badges. */
export const roleLabel = (role: AppRole | null | undefined): string => {
  if (!role) return "Signed out";

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
