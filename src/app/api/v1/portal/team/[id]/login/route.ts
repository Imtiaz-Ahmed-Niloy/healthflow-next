import { NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { provisionUser } from "@/server/provisioning";
import { decryptSecret, encryptSecret, generatePassword } from "@/lib/credentials";

/**
 * /api/v1/portal/team/:id/login — a team member's login, made by their doctor
 * from /portal/team the way a hospital admin makes a doctor's
 * (/api/v1/doctors/:id/login, which this follows step for step).
 *
 *   POST  create it; answers with the email and password
 *   GET   read the password back, any time later
 *   PUT   replace the password
 *
 * The login is the doctor_staff role (0146) with no hospital, so its token
 * opens no tenant's data; what it reads is doctor_staff_queue (0147).
 *
 * The member is loaded through the doctor's own client, so RLS proves the
 * member is theirs — another doctor's member is a 404. Only then does the
 * service role touch auth, the profile link and the secret, none of which the
 * doctor can write themselves.
 */

type RouteContext = { params: Promise<{ id: string }> };

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number, code?: string) =>
  json({ error: { message, ...(code ? { code } : {}) } }, status);

type Admin = ReturnType<typeof createAdminSupabase>;

/** ilike without its wildcards — `john_doe@` must not match `johnXdoe@`. */
const likeLiteral = (value: string) => value.trim().replace(/[\\%_]/g, "\\$&");

const loadMember = async (id: string) => {
  const auth = await getAuthContext();
  if (!auth) return { refusal: fail("Not signed in", 401) };
  if (auth.role !== "doctor") return { refusal: fail("Only a doctor manages their team's logins", 403) };

  const supabase = await createServerSupabase();
  const { data: member, error } = await supabase
    .from("doctor_team_members")
    .select("id, owner_profile_id, name, email, phone, profile_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { refusal: fail(error.message, 400) };
  if (!member || member.owner_profile_id !== auth.userId) return { refusal: fail("Team member not found", 404) };

  return { member };
};

/**
 * Someone the doctor removed from the team and is adding back: their old
 * login was switched off (revoke_staff_access) and its email is taken, so
 * provisionUser can't make a new one. A switched-off team login that no member
 * row holds any more is theirs to reuse — anything else stays refused.
 */
const reuseRemovedLogin = async (admin: Admin, email: string, password: string) => {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .ilike("email", likeLiteral(email))
    .maybeSingle();
  if (!profile || profile.role !== "doctor_staff" || profile.is_active) return null;

  const { count } = await admin
    .from("doctor_team_members")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);
  if (count) return null;

  const { error: passwordError } = await admin.auth.admin.updateUserById(profile.id, { password, email_confirm: true });
  if (passwordError) return null;
  const { error: activeError } = await admin.from("profiles").update({ is_active: true }).eq("id", profile.id);
  if (activeError) return null;

  return profile.id;
};

export const POST = async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const loaded = await loadMember(id);
  if ("refusal" in loaded) return loaded.refusal;
  const { member } = loaded;

  if (member.profile_id) return fail("This member already has a login. Use the view button instead.", 409);
  if (!member.email) {
    return fail("Add an email for this member first. It is what they sign in with.", 422, "no_email");
  }

  const admin = createAdminSupabase();

  // Encrypted before anything is created: a missing key throws here, not
  // after a login exists that nobody can read the password of.
  const password = generatePassword(12);
  const passwordEnc = encryptSecret(password);

  let userId: string;
  const provisioned = await provisionUser({
    email: member.email,
    role: "doctor_staff",
    tenantId: null,
    fullName: member.name,
    phone: member.phone,
    password,
  });
  if (provisioned.ok) {
    userId = provisioned.userId;
  } else {
    const reused = provisioned.code === "email_taken" ? await reuseRemovedLogin(admin, member.email, password) : null;
    if (!reused) return fail(provisioned.message, provisioned.code === "email_taken" ? 409 : 400);
    userId = reused;
  }

  const { error: linkError } = await admin
    .from("doctor_team_members")
    .update({ profile_id: userId })
    .eq("id", id);
  if (linkError) {
    return fail(`The login was created, but linking it to ${member.name} failed: ${linkError.message}.`, 500);
  }

  // Last, so a failure here still leaves a working, linked login; the next GET
  // then offers a reset.
  const { error: secretError } = await admin
    .from("doctor_team_member_secrets")
    .upsert({ member_id: id, password_enc: passwordEnc }, { onConflict: "member_id" });
  if (secretError) {
    return fail(`The login was created, but the password couldn't be saved for later viewing: ${secretError.message}. Copy it now — it is ${password}.`, 500);
  }

  return json({ data: { email: member.email, password } }, 201);
};

export const GET = async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const loaded = await loadMember(id);
  if ("refusal" in loaded) return loaded.refusal;
  const { member } = loaded;

  if (!member.profile_id) return fail("This member has no login yet. Use the create button instead.", 404);

  const { data: secret, error } = await createAdminSupabase()
    .from("doctor_team_member_secrets")
    .select("password_enc")
    .eq("member_id", id)
    .maybeSingle();
  if (error) return fail(error.message, 400);
  if (!secret) {
    return fail("No password was saved for this login. It can't be recovered, but it can be reset.", 404, "no_saved_password");
  }

  return json({ data: { email: member.email, password: decryptSecret(secret.password_enc) } });
};

/** Replaces the password. Auth first, then the stored copy, so the two can't disagree. */
export const PUT = async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const loaded = await loadMember(id);
  if ("refusal" in loaded) return loaded.refusal;
  const { member } = loaded;

  if (!member.profile_id) return fail("This member has no login yet. Use the create button instead.", 404);

  const admin = createAdminSupabase();
  const password = generatePassword(12);
  const passwordEnc = encryptSecret(password);

  const { error: authError } = await admin.auth.admin.updateUserById(member.profile_id, { password });
  if (authError) return fail(`Could not reset the password: ${authError.message}`, 400);

  const { error: secretError } = await admin
    .from("doctor_team_member_secrets")
    .upsert({ member_id: id, password_enc: passwordEnc }, { onConflict: "member_id" });
  if (secretError) {
    return fail(`The password was reset, but saving it failed: ${secretError.message}. Copy it now — it is ${password}.`, 500);
  }

  return json({ data: { email: member.email, password } });
};
