import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { provisionUser } from "@/server/provisioning";
import { encryptSecret, generatePassword } from "@/lib/credentials";

/**
 * GET /api/v1/super/pharmacies — every pharmacy branch and facility across the platform.
 * PATCH /api/v1/super/pharmacies — update branch status, compliance and regulatory details.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const patchSchema = z.object({
  id: z.string().uuid("Invalid branch ID"),
  status: z.enum(["active", "maintenance", "inactive"]).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().min(1).max(20).optional(),
  license_no: z.string().trim().max(100).nullable().optional(),
  vat_no: z.string().trim().max(100).nullable().optional(),
  pharmacist_in_charge: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  opening_hours: z.string().trim().max(200).nullable().optional(),
});

const postSchema = z.object({
  name: z.string().trim().min(1, "Pharmacy name is required").max(200),
  code: z.string().trim().min(1, "Branch code is required").max(20).optional().default("MAIN"),
  is_main: z.boolean().optional().default(true),
  status: z.enum(["active", "maintenance", "inactive"]).optional().default("active"),
  license_no: z.string().trim().max(100).nullable().optional(),
  vat_no: z.string().trim().max(100).nullable().optional(),
  pharmacist_in_charge: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  opening_hours: z.string().trim().max(200).nullable().optional(),
});

type TenantJoined = {
  id: string;
  name: string;
  slug: string;
  status: string;
  location: string | null;
  division: string | null;
  district: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at?: string | null;
};

type BranchRow = {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  is_main: boolean;
  status: "active" | "maintenance" | "inactive";
  address: string | null;
  phone: string | null;
  email: string | null;
  license_no: string | null;
  vat_no: string | null;
  pharmacist_in_charge: string | null;
  opening_hours: string | null;
  created_at: string;
  tenant?: TenantJoined | null;
};

export const GET = async () => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [
    branchesRes,
    pharmacyTenantsRes,
    itemsCount,
    staffCount,
  ] = await Promise.all([
    db
      .from("pharmacy_branches")
      .select(`
        id,
        tenant_id,
        name,
        code,
        is_main,
        status,
        address,
        phone,
        email,
        license_no,
        vat_no,
        pharmacist_in_charge,
        opening_hours,
        created_at,
        tenant:tenants(id, name, slug, status, location, division, district, address, contact_phone, contact_email)
      `)
      .order("created_at", { ascending: false }),
    db
      .from("tenants")
      .select("id, name, slug, status, location, division, district, address, contact_email, contact_phone, created_at")
      .eq("kind", "pharmacy")
      .order("created_at", { ascending: false }),
    db.from("pharmacy_items").select("id", { count: "exact", head: true }),
    db.from("pharmacy_staff").select("id", { count: "exact", head: true }),
  ]);

  if (branchesRes.error) {
    return fail(branchesRes.error.message, 500);
  }

  const existingBranches: BranchRow[] = (branchesRes.data || []) as BranchRow[];
  const existingTenantIds = new Set(existingBranches.map((b) => b.tenant_id));

  // Any standalone pharmacy tenant without an explicit branch row yet
  const standaloneTenants = (pharmacyTenantsRes.data || []) as TenantJoined[];
  const missingBranches: BranchRow[] = standaloneTenants
    .filter((t) => !existingTenantIds.has(t.id))
    .map((t) => ({
      id: `pharmacy-${t.id}`,
      tenant_id: t.id,
      name: t.name,
      code: "MAIN",
      is_main: true,
      status: (t.status === "approved" ? "active" : "inactive") as "active" | "inactive",
      address: t.address || t.location || null,
      phone: t.contact_phone || null,
      email: t.contact_email || null,
      license_no: null,
      vat_no: null,
      pharmacist_in_charge: null,
      opening_hours: "24/7",
      created_at: t.created_at || new Date().toISOString(),
      tenant: t,
    }));

  const allPharmacies: BranchRow[] = [...existingBranches, ...missingBranches];

  const totalPharmacies = allPharmacies.length;
  const activeCount = allPharmacies.filter((p) => p.status === "active").length;

  return json({
    data: {
      pharmacies: allPharmacies,
      stats: {
        total: totalPharmacies,
        active: activeCount,
        products: itemsCount.count ?? 0,
        staff: staffCount.count ?? 0,
      },
    },
  });
};

export const PATCH = async (req: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message || "Invalid payload", 400);
  }

  const { id, ...updates } = parsed.data;
  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from("pharmacy_branches")
    .update(updates)
    .eq("id", id)
    .select(`
      id,
      tenant_id,
      name,
      code,
      is_main,
      status,
      address,
      phone,
      email,
      license_no,
      vat_no,
      pharmacist_in_charge,
      opening_hours,
      created_at,
      tenant:tenants(id, name, slug, status, location, division, district)
    `)
    .single();

  if (error) {
    return fail(error.message, 500);
  }

  return json({ data });
};

export const POST = async (req: Request) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message || "Invalid payload", 400);
  }

  const {
    name,
    code = "MAIN",
    is_main = true,
    status = "active",
    license_no,
    vat_no,
    pharmacist_in_charge,
    phone,
    email,
    address,
    opening_hours,
  } = parsed.data;

  const supabase = await createServerSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Create standalone tenant for this pharmacy
  const { data: tenant, error: tenantErr } = await db
    .from("tenants")
    .insert({
      name: name.trim(),
      kind: "pharmacy",
      status: "approved",
      address: address || null,
      location: address || null,
      contact_phone: phone || null,
      contact_email: email || null,
      listing_only: false,
    })
    .select("id, name, slug, status, location, division, district, address, contact_phone, contact_email")
    .single();

  if (tenantErr || !tenant) {
    return fail(tenantErr?.message || "Failed to create pharmacy organization", 500);
  }

  // 2. Insert main branch in pharmacy_branches
  const { data: branch, error: branchErr } = await db
    .from("pharmacy_branches")
    .insert({
      tenant_id: tenant.id,
      name: name.trim(),
      code: code ? code.trim() : "MAIN",
      is_main,
      status,
      address,
      phone,
      email,
      license_no,
      vat_no,
      pharmacist_in_charge,
      opening_hours,
    })
    .select(`
      id,
      tenant_id,
      name,
      code,
      is_main,
      status,
      address,
      phone,
      email,
      license_no,
      vat_no,
      pharmacist_in_charge,
      opening_hours,
      created_at
    `)
    .single();

  if (branchErr || !branch) {
    return fail(branchErr?.message || "Failed to create pharmacy outlet", 500);
  }

  // 3. Ensure default pharmacy_settings exists for this new pharmacy
  await db
    .from("pharmacy_settings")
    .upsert({
      tenant_id: tenant.id,
      pharmacy_name: name.trim(),
      phone: phone || null,
      email: email || null,
      address: address || null,
      license_no: license_no || null,
    }, { onConflict: "tenant_id" });

  // 4. If email is provided, create admin login right away
  let creds: { email: string; password?: string } | null = null;
  if (email) {
    const password = generatePassword(12);
    const provisioned = await provisionUser({
      email,
      role: "pharmacy_admin",
      tenantId: tenant.id,
      fullName: `${name.trim()} Admin`,
      phone,
      password,
    });

    if (provisioned.ok) {
      await db
        .from("pharmacy_staff")
        .upsert(
          {
            tenant_id: tenant.id,
            profile_id: provisioned.userId,
            staff_role: "manager",
            branch_id: branch.id,
            can_discount: true,
            can_approve_returns: true,
            can_manage_cash: true,
            can_manage_stock: true,
            can_see_reports: true,
            can_administer: true,
          },
          { onConflict: "profile_id" },
        );

      const passwordEnc = encryptSecret(password);
      await db
        .from("pharmacy_admin_secrets")
        .upsert(
          { tenant_id: tenant.id, email: provisioned.email, password_enc: passwordEnc },
          { onConflict: "tenant_id" },
        );

      creds = { email: provisioned.email, password };
    }
  }

  return json({
    data: {
      ...branch,
      tenant,
      ...(creds ? { creds } : {}),
    },
  }, 201);
};

