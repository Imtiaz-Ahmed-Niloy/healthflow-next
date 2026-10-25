import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthContext, isSuperAdmin } from "@/lib/supabase/server";
import { generatePassword } from "@/lib/credentials";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

export const GET = async (_req: Request, context: RouteContext) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const { id } = await context.params;

  return json({
    email: `lab.admin@${id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "hospital"}.com`,
    facility: "Laboratory Facility",
  });
};

export const POST = async (_req: Request, context: RouteContext) => {
  const auth = await getAuthContext();
  if (!auth) return fail("Not signed in", 401);
  if (!isSuperAdmin(auth)) return fail("Not allowed", 403);

  const { id } = await context.params;
  const admin = createAdminSupabase();

  const newPassword = generatePassword(12);

  // Look for users with role 'lab_admin' associated with this tenant if tenant ID
  const tenantId = id.replace(/^lab-/, "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("role", "lab_admin")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (profile?.id) {
    await admin.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });
  }

  return json({
    email: `lab.admin@healthflowbd.com`,
    password: newPassword,
    facility: "Diagnostic Laboratory",
  });
};
