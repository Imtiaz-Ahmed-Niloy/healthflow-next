import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import { myDoctorRows } from "@/server/portal/myDoctors";
import { BLOCK_KINDS, blockCoversSlot, type ScheduleBlock } from "@/lib/scheduleBlocks";

/**
 * /api/v1/portal/schedule-blocks — the time a doctor has blocked on their own
 * schedule (0125): leave, an operation, a hospital round, a class or meeting,
 * busy. /portal/schedule lists them, adds one and removes one.
 *
 *   GET     every block of theirs, and the places one can be narrowed to
 *   POST    add one; answers with the appointments already inside it
 *   DELETE  ?id= — remove one
 *
 * Outside createResourceRoute: the rows hang off the login, not a hospital,
 * and a POST has an answer of its own (`clashes`). Runs on the doctor's own
 * client throughout — RLS keeps the table to its owner (0125), and profile_id
 * is stamped from the session, never read from the body.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

const COLUMNS = "id, doctor_id, kind, start_date, end_date, start_time, end_time, repeat_days, blocks_booking, note";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Pick a time.");
const blank = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(v => (v === "" || v === undefined ? null : v), schema.nullable());

const blockSchema = z.object({
  kind: z.enum(BLOCK_KINDS),
  doctor_id: blank(z.string().uuid()),
  start_date: date,
  end_date: blank(date),
  start_time: blank(time),
  end_time: blank(time),
  repeat_days: blank(z.array(z.number().int().min(0).max(6)).min(1).max(7)),
  blocks_booking: z.boolean().default(true),
  note: blank(z.string().trim().max(500)),
}).superRefine((b, ctx) => {
  if (b.end_date && b.end_date < b.start_date) ctx.addIssue({ code: "custom", message: "The last day is before the first." });
  if (!b.start_time !== !b.end_time) ctx.addIssue({ code: "custom", message: "Give both a start and an end time, or neither for the whole day." });
  if (b.start_time && b.end_time && b.end_time.slice(0, 5) <= b.start_time.slice(0, 5)) ctx.addIssue({ code: "custom", message: "The end time is not after the start time." });
});

/** How far ahead an open-ended block is checked for appointments already inside it. */
const CLASH_DAYS = 180;

const doctorOnly = async () => {
  const auth = await getAuthContext();
  if (!auth) return { refusal: fail("Not signed in", 401) } as const;
  if (auth.role !== "doctor") return { refusal: fail("Only a doctor has a schedule to block", 403) } as const;
  return { auth, supabase: await createServerSupabase() } as const;
};

export const GET = async () => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;

  const [blocks, doctors] = await Promise.all([
    who.supabase.from("doctor_schedule_blocks").select(COLUMNS).order("start_date", { ascending: true }),
    myDoctorRows(who.supabase, who.auth.userId).catch(() => []),
  ]);
  if (blocks.error) return fail(blocks.error.message, 500);

  return json({
    data: blocks.data,
    // Where a block can be narrowed to: each hospital or chamber they sit at.
    places: doctors.map(d => ({ id: d.id, name: d.hospital_name })),
  });
};

export const POST = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;
  const { auth, supabase } = who;

  const parsed = blockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid schedule entry", 400);
  const values = parsed.data;

  let doctors;
  try {
    doctors = await myDoctorRows(supabase, auth.userId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load your doctor profile", 500);
  }
  if (doctors.length === 0) return fail("No doctor profile is linked to this login.", 404);
  // Only a place of their own: the foreign key would take any doctor's row.
  if (values.doctor_id && !doctors.some(d => d.id === values.doctor_id)) {
    return fail("That is not one of your hospitals or chambers.", 400);
  }

  // One that does not repeat ends: with no last day it is the one day.
  const end_date = values.end_date ?? (values.repeat_days ? null : values.start_date);

  const { data: block, error } = await supabase
    .from("doctor_schedule_blocks")
    .insert({ ...values, end_date, profile_id: auth.userId })
    .select(COLUMNS)
    .single();
  if (error) return fail(error.message, 400);

  // Appointments already booked inside it. Nothing is cancelled: the doctor
  // is told, and they or their assistant call those patients.
  let clashes: { id: string; scheduled_date: string; scheduled_time: string; patient: string | null }[] = [];
  if (block.blocks_booking) {
    const until = new Date(`${block.start_date}T00:00:00Z`);
    until.setUTCDate(until.getUTCDate() + CLASH_DAYS);
    const last = block.end_date ?? until.toISOString().slice(0, 10);
    const { data: booked } = await supabase
      .from("appointments")
      .select("id, scheduled_date, scheduled_time, patients(full_name)")
      .in("doctor_id", block.doctor_id ? [block.doctor_id] : doctors.map(d => d.id))
      .eq("status", "scheduled")
      .gte("scheduled_date", block.start_date)
      .lte("scheduled_date", last)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });
    clashes = (booked ?? [])
      .filter(a => blockCoversSlot(block as ScheduleBlock, a.scheduled_date, a.scheduled_time))
      .map(a => ({ id: a.id, scheduled_date: a.scheduled_date, scheduled_time: a.scheduled_time, patient: a.patients?.full_name ?? null }));
  }

  return json({ data: block, clashes }, 201);
};

export const DELETE = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return fail("Which entry?", 400);

  // RLS keeps this to their own rows; someone else's id removes nothing.
  const { data, error } = await who.supabase.from("doctor_schedule_blocks").delete().eq("id", id).select("id").maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail("Schedule entry not found", 404);
  return json({ data });
};
