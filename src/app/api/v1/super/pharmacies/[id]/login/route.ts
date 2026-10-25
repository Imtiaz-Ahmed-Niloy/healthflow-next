import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { provisionUser } from "@/server/provisioning";
import { encryptSecret, decryptSecret, generatePassword } from "@/lib/credentials";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number, code?: string) =>
  json({ error: { message, ...(code ? { code } : {}) } }, status);

const requireSuperAdmin = async () => {
  const auth = await getAuthContext();
  if (!auth) return { ok: false as const, res: fail("Not signed in", 401) };
  if (!isSuperAdmin(auth)) return { ok: false as const, res: fail("Not allowed", 403) };
  return { ok: true as const };
};

const resolvePharmacyAndTenant = async (id: string) => {
  const admin = createAdminSupabase();

  // 1. Try branch ID lookup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: branch } = await (admin as any)
    .from("pharmacy_branches")
    .select("id, tenant_id, name, email, phone, tenant:tenants(id, name, slug, status, contact_email, contact_phone)")
    .eq("id", id)
    .maybeSingle();

  if (branch) {
    const tenant = branch.tenant as { id: string; name: string; slug: string; status: string; contact_email: string | null; contact_phone: string | null } | null;
    return {
      branchId: branch.id,
      tenantId: branch.tenant_id,
      name: branch.name || tenant?.name || "Pharmacy",
      email: branch.email || tenant?.contact_email || null,
      phone: branch.phone || tenant?.contact_phone || null,
      slug: tenant?.slug || null,
    };
  }

  // 2. Try direct tenant ID lookup
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, slug, status, contact_email, contact_phone")
    .eq("id", id)
    .maybeSingle();

  if (tenant) {
    return {
      branchId: null,
      tenantId: tenant.id,
      name: tenant.name,
      email: tenant.contact_email,
      phone: tenant.contact_phone,
      slug: tenant.slug,
    };
  }

  return null;
};

export const GET = async (_request: Request, context: RouteContext) => {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;

  const { id } = await context.params;
  if (!id) return fail("Pharmacy ID is required", 400);

  const pharmacy = await resolvePharmacyAndTenant(id);
  if (!pharmacy) return fail("Pharmacy not found", 404);

  const admin = createAdminSupabase();

  // 1. Check for stored credentials in pharmacy_admin_secrets
  const { data: secret, error: secretError } = await admin
    .from("pharmacy_admin_secrets")
    .select("email, password_enc")
    .eq("tenant_id", pharmacy.tenantId)
    .maybeSingle();

  if (secretError) return fail(secretError.message, 400);

  if (secret) {
    return json({
      data: {
        pharmacy: pharmacy.name,
        hospital: pharmacy.name,
        email: secret.email,
        password: decryptSecret(secret.password_enc),
      },
    });
  }

  // 2. Check if an admin profile already exists
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("tenant_id", pharmacy.tenantId)
    .eq("role", "pharmacy_admin")
    .limit(1)
    .maybeSingle();

  if (adminProfile) {
    return fail(
      "No password was saved for this login. It can't be recovered, but it can be reset.",
      404,
      "no_saved_password",
    );
  }

  // 3. No admin login exists yet — auto-provision one on demand
  const safeSlug = (pharmacy.slug || pharmacy.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pharmacy";
  const email = pharmacy.email || `admin@${safeSlug}.healthflowbd.com`;
  const password = generatePassword(12);

  const provisioned = await provisionUser({
    email,
    role: "pharmacy_admin",
    tenantId: pharmacy.tenantId,
    fullName: `${pharmacy.name} Admin`,
    phone: pharmacy.phone,
    password,
  });

  if (!provisioned.ok) {
    return fail(provisioned.message, provisioned.code === "email_taken" ? 409 : 500);
  }

  // Assign full manager permissions in pharmacy_staff
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("pharmacy_staff")
    .upsert(
      {
        tenant_id: pharmacy.tenantId,
        profile_id: provisioned.userId,
        staff_role: "manager",
        branch_id: pharmacy.branchId,
        can_discount: true,
        can_approve_returns: true,
        can_manage_cash: true,
        can_manage_stock: true,
        can_see_reports: true,
        can_administer: true,
      },
      { onConflict: "profile_id" },
    );

  // Store encrypted password
  const passwordEnc = encryptSecret(password);
  await admin
    .from("pharmacy_admin_secrets")
    .upsert(
      { tenant_id: pharmacy.tenantId, email: provisioned.email, password_enc: passwordEnc },
      { onConflict: "tenant_id" },
    );

  return json({
    data: {
      pharmacy: pharmacy.name,
      hospital: pharmacy.name,
      email: provisioned.email,
      password,
      saved: true,
    },
  });
};

export const PUT = async (_request: Request, context: RouteContext) => {
  const gate = await requireSuperAdmin();
  if (!gate.ok) return gate.res;

  const { id } = await context.params;
  if (!id) return fail("Pharmacy ID is required", 400);

  const pharmacy = await resolvePharmacyAndTenant(id);
  if (!pharmacy) return fail("Pharmacy not found", 404);

  const admin = createAdminSupabase();

  // Find existing admin profile
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("tenant_id", pharmacy.tenantId)
    .eq("role", "pharmacy_admin")
    .limit(1)
    .maybeSingle();

  const password = generatePassword(12);
  const passwordEnc = encryptSecret(password);

  if (!adminProfile) {
    // If no profile exists, provision new one
    const safeSlug = (pharmacy.slug || pharmacy.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pharmacy";
    const email = pharmacy.email || `admin@${safeSlug}.healthflowbd.com`;

    const provisioned = await provisionUser({
      email,
      role: "pharmacy_admin",
      tenantId: pharmacy.tenantId,
      fullName: `${pharmacy.name} Admin`,
      phone: pharmacy.phone,
      password,
    });

    if (!provisioned.ok) {
      return fail(provisioned.message, provisioned.code === "email_taken" ? 409 : 500);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("pharmacy_staff")
      .upsert(
        {
          tenant_id: pharmacy.tenantId,
          profile_id: provisioned.userId,
          staff_role: "manager",
          branch_id: pharmacy.branchId,
          can_discount: true,
          can_approve_returns: true,
          can_manage_cash: true,
          can_manage_stock: true,
          can_see_reports: true,
          can_administer: true,
        },
        { onConflict: "profile_id" },
      );

    await admin
      .from("pharmacy_admin_secrets")
      .upsert(
        { tenant_id: pharmacy.tenantId, email: provisioned.email, password_enc: passwordEnc },
        { onConflict: "tenant_id" },
      );

    return json({
      data: {
        pharmacy: pharmacy.name,
        email: provisioned.email,
        password,
      },
    });
  }

  // Profile exists: update password in auth
  const email = adminProfile.email;
  if (!email) return fail("Pharmacy admin profile has no email address", 400);

  const { error: authError } = await admin.auth.admin.updateUserById(adminProfile.id, { password });
  if (authError) return fail(`Could not reset password: ${authError.message}`, 400);

  const { error: secretError } = await admin
    .from("pharmacy_admin_secrets")
    .upsert(
      { tenant_id: pharmacy.tenantId, email, password_enc: passwordEnc },
      { onConflict: "tenant_id" },
    );

  if (secretError) {
    return fail(`Password updated in auth, but saving failed: ${secretError.message}`, 500);
  }

  return json({
    data: {
      pharmacy: pharmacy.name,
      hospital: pharmacy.name,
      email: adminProfile.email,
      password,
      saved: true,
    },
  });
};
