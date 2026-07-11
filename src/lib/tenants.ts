// Tenant provisioning + lightweight auth for hospital admin panels.
import { load, save, uid } from "@/lib/storage";
import { slugify } from "@/lib/slug";

export type Tenant = {
  id: string;
  hospitalId?: string;
  hospital: string;
  slug: string;
  username: string;
  password: string;
  plan: string;
  contact: string;
  status: "Active" | "Suspended";
  whitelisted: boolean;
  createdAt: string;
};

export type Session = {
  tenantId: string;
  username: string;
  hospital: string;
  role: "hospital_admin";
  signedInAt: string;
};

export type WhitelistEntry = {
  v: string;
  type: string;
  note: string;
  status: "active" | "pending";
};

const TENANTS_KEY = "tenants";
const SESSION_KEY = "session";
const WHITELIST_KEY = "whitelist";

export const getTenants = () => load<Tenant[]>(TENANTS_KEY, []);
export const setTenants = (list: Tenant[]) => save(TENANTS_KEY, list);

export const getWhitelist = (seed: WhitelistEntry[] = []) =>
  load<WhitelistEntry[]>(WHITELIST_KEY, seed);
export const setWhitelist = (list: WhitelistEntry[]) => save(WHITELIST_KEY, list);

/** Create a tenant admin account + add whitelist entry. Idempotent by username. */
export const provisionTenant = (input: {
  hospital: string;
  username: string;
  password: string;
  plan?: string;
  contact?: string;
  hospitalId?: string;
}): Tenant => {
  const list = getTenants();
  const existing = list.find(t => t.username === input.username);
  if (existing) {
    if (!existing.whitelisted) {
      existing.whitelisted = true;
      existing.status = "Active";
      setTenants(list);
    }
    ensureWhitelisted(existing);
    return existing;
  }
  const tenant: Tenant = {
    id: uid(),
    hospitalId: input.hospitalId,
    hospital: input.hospital,
    slug: slugify(input.hospital),
    username: input.username,
    password: input.password,
    plan: input.plan || "Starter",
    contact: input.contact || "",
    status: "Active",
    whitelisted: true,
    createdAt: new Date().toISOString(),
  };
  setTenants([tenant, ...list]);
  ensureWhitelisted(tenant);
  return tenant;
};

const ensureWhitelisted = (t: Tenant) => {
  const list = getWhitelist();
  if (list.some(w => w.v === t.username)) return;
  const entry: WhitelistEntry = {
    v: t.username,
    type: "Tenant Admin",
    note: `${t.hospital} · auto-provisioned`,
    status: "active",
  };
  setWhitelist([entry, ...list]);
};

/** Authenticate via username/email + password. Returns tenant if valid + active + whitelisted. */
export const authenticateTenant = (identifier: string, password: string): Tenant | null => {
  const list = getTenants();
  const id = identifier.trim().toLowerCase();
  const match = list.find(
    t =>
      (t.username.toLowerCase() === id || t.contact.toLowerCase() === id) &&
      t.password === password,
  );
  if (!match) return null;
  if (match.status !== "Active" || !match.whitelisted) return null;
  return match;
};

export const startSession = (t: Tenant) => {
  const s: Session = {
    tenantId: t.id,
    username: t.username,
    hospital: t.hospital,
    role: "hospital_admin",
    signedInAt: new Date().toISOString(),
  };
  save(SESSION_KEY, s);
  try { localStorage.setItem("hf:role", "hospital_admin"); } catch { /* noop */ }
  return s;
};

export const getSession = () => load<Session | null>(SESSION_KEY, null);
export const clearSession = () => save<Session | null>(SESSION_KEY, null);
