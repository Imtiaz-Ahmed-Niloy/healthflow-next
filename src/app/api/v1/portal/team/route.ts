import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase, createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { myDoctorRows } from "@/server/portal/myDoctors";
import { TEAM_ROLES, TEAM_STATUSES, type TeamMember, type TeamRole } from "@/lib/doctorTeam";

/**
 * /api/v1/portal/team — the doctor's team.
 *
 *   GET     their own members (doctor_team_members, 0147), and the assistants
 *           their hospitals assign them (doctor_assistants, 0013), read-only
 *   POST    add a member
 *   PATCH   change one: `{ id, ...fields }`, the role included
 *   DELETE  `?id=` remove one, and switch off their login if they had one
 *
 * Runs on the doctor's own client: RLS (0147) keeps every write to their own
 * team and to places they practise at. Only the login switch-off on DELETE
 * needs the service role. The member's login itself is
 * /api/v1/portal/team/[id]/login.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** 42501 not theirs, 22023 the email guard, 23514 a check constraint. */
const statusOf = (code: string | undefined) => (code === "42501" ? 403 : code === "22023" || code === "23514" ? 422 : 500);

const doctorOnly = async () => {
  const auth = await getAuthContext();
  if (!auth) return { refusal: fail("Not signed in", 401) };
  if (auth.role !== "doctor") return { refusal: fail("Only a doctor has a team", 403) };
  return { auth, supabase: await createServerSupabase() };
};

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);
const nullableText = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());

const fieldsSchema = z.object({
  role: z.enum(TEAM_ROLES),
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: nullableText(40),
  email: z.preprocess(blankToNull, z.string().trim().toLowerCase().email("Enter a valid email").max(200).nullable().optional()),
  place_tenant_id: z.preprocess(blankToNull, z.string().uuid().nullable().optional()),
  status: z.enum(TEAM_STATUSES).optional(),
  notes: nullableText(2000),
});

export const GET = async () => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;
  const { auth, supabase } = who;

  let doctors;
  try {
    doctors = await myDoctorRows(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  const placeOf = new Map(doctors.map(d => [d.tenant_id, d.hospital_name]));
  const place = (id: string | null) => (id ? { id, name: placeOf.get(id) ?? "Hospital" } : null);

  const { data: own, error: ownError } = await supabase
    .from("doctor_team_members")
    .select("id, role, name, phone, email, status, notes, place_tenant_id, profile_id")
    .eq("owner_profile_id", auth.userId)
    .order("created_at", { ascending: true });
  if (ownError) return fail(ownError.message, 500);

  // The hospitals' assistants for them. RLS lets a doctor read their
  // hospitals' staff; the doctor_id filter narrows it to theirs.
  const { data: assigned, error: assignedError } = doctors.length
    ? await supabase
        .from("doctor_assistants")
        .select("id, tenant_id, name, phone, email, shift, status, notes")
        .in("doctor_id", doctors.map(d => d.id))
        .order("name", { ascending: true })
    : { data: [], error: null };
  if (assignedError) return fail(assignedError.message, 500);

  const members: TeamMember[] = [
    ...(own ?? []).map(m => ({
      id: m.id,
      source: "team" as const,
      role: m.role as TeamRole,
      name: m.name,
      phone: m.phone,
      email: m.email,
      shift: null,
      status: m.status,
      notes: m.notes,
      has_login: m.profile_id !== null,
      place: place(m.place_tenant_id),
    })),
    ...(assigned ?? []).map(a => ({
      id: a.id,
      source: "hospital" as const,
      role: "assistant" as const,
      name: a.name,
      phone: a.phone,
      email: a.email,
      shift: a.shift,
      status: a.status,
      notes: a.notes,
      has_login: false,
      place: place(a.tenant_id),
    })),
  ];

  return json({
    data: members,
    // Every place they practise, for the filter and the form — even one with no one yet.
    places: [...placeOf].map(([id, name]) => ({ id, name })),
  });
};

export const POST = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;

  const parsed = fieldsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  // owner_profile_id defaults to the caller in the table, and RLS holds it there.
  const { data, error } = await who.supabase
    .from("doctor_team_members")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) return fail(error.message, statusOf(error.code));

  return json({ data }, 201);
};

export const PATCH = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;

  const parsed = fieldsSchema.partial().extend({ id: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);

  const { id, ...fields } = parsed.data;
  const { data, error } = await who.supabase
    .from("doctor_team_members")
    .update(fields)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(error.message, statusOf(error.code));
  // Not theirs, or not there: the same answer, deliberately.
  if (!data) return fail("Team member not found", 404);

  return json({ data });
};

export const DELETE = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return fail("Which member?", 422);

  const { data: removed, error } = await who.supabase
    .from("doctor_team_members")
    .delete()
    .eq("id", id)
    .select("profile_id")
    .maybeSingle();
  if (error) return fail(error.message, statusOf(error.code));
  if (!removed) return fail("Team member not found", 404);

  // Their login opens nothing without the row, but it is switched off and
  // signed out too, so it can't sign in at all.
  if (removed.profile_id) {
    const { error: revokeError } = await createAdminSupabase()
      .rpc("revoke_staff_access", { p_profile_id: removed.profile_id });
    if (revokeError) {
      return json({ data: { id }, warning: { message: `Removed, but switching off their login failed: ${revokeError.message}` } });
    }
  }

  return json({ data: { id } });
};
