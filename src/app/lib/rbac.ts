export type Role =
  | "super_admin" | "hospital_admin" | "hr_admin" | "finance_admin"
  | "lab_admin" | "pharmacy_admin" | "root";

export type Action = "view" | "create" | "edit" | "delete" | "approve";

const matrix: Record<Role, Record<string, Action[]>> = {
  root: { "*": ["view", "create", "edit", "delete", "approve"] },
  super_admin: { "*": ["view", "create", "edit", "delete", "approve"] },
  hospital_admin: { "*": ["view", "create", "edit", "delete", "approve"] },
  hr_admin: {
    doctors: ["view"], nurses: ["view", "edit"], staff: ["view", "create", "edit", "delete"],
    hr: ["view", "create", "edit", "delete", "approve"], payroll: ["view"],
    attendance: ["view", "approve"], "*": ["view"],
  },
  finance_admin: {
    finance: ["view", "create", "edit", "delete", "approve"],
    payroll: ["view", "create", "edit", "delete", "approve"],
    procurement: ["view", "approve"], billing: ["view", "create", "edit"], "*": ["view"],
  },
  lab_admin: { lab: ["view", "create", "edit", "delete", "approve"], "*": ["view"] },
  pharmacy_admin: { pharmacy: ["view", "create", "edit", "delete", "approve"], "*": ["view"] },
};

const ROLE_KEY = "hf:role";
export const getRole = (): Role =>
  (localStorage.getItem(ROLE_KEY) as Role) || "hospital_admin";
export const setRole = (r: Role) => { localStorage.setItem(ROLE_KEY, r); window.dispatchEvent(new Event("hf:role")); };

export const can = (action: Action, resource: string, role: Role = getRole()): boolean => {
  const m = matrix[role] || {};
  const acts = m[resource] || m["*"] || [];
  return acts.includes(action);
};
