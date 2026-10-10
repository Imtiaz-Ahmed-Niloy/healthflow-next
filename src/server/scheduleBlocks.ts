import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { displayTime } from "@/lib/availability";

/**
 * Why this doctor cannot be booked at this date and time — they blocked it on
 * /portal/schedule (0125): leave, an operation, a round, a class, busy. Null
 * when nothing stands in the way.
 *
 * The third rule a booking is held to, after "not in the past" and "inside
 * the doctor's days and hours", and asked in the same three places: a
 * patient's booking, a patient's reschedule, and the hospital desk's add
 * appointment.
 *
 * It asks the database's doctor_blocked(), which answers with the kind and
 * the span and nothing else — the rows are the doctor's alone, so any client
 * will do, a patient's included. A failed ask refuses nothing: the booking is
 * not held up by a rule that could not be read.
 */
type Client = Pick<SupabaseClient<Database>, "rpc">;

const day = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const blockedReason = async (
  client: Client,
  doctorId: string,
  date: string,
  time: string,
  doctorName?: string | null,
) => {
  const { data, error } = await client.rpc("doctor_blocked", {
    p_doctor_id: doctorId,
    p_date: date,
    p_time: time.slice(0, 5),
  });
  if (error) {
    console.error("doctor_blocked failed:", error);
    return null;
  }
  const block = data?.[0];
  if (!block) return null;

  const doctor = doctorName || "This doctor";
  // Part of a day: say the hours, so another time can be picked.
  if (block.start_time && block.end_time) {
    return `${doctor} is not seeing patients from ${displayTime(block.start_time.slice(0, 5))} to ${displayTime(block.end_time.slice(0, 5))} on ${day(date)}. Please pick another time.`;
  }
  // Whole days. Only leave is named: what else kept them away is their own.
  if (block.kind === "leave") {
    return block.end_date && block.end_date !== date
      ? `${doctor} is on leave until ${day(block.end_date)}. Please pick a later date.`
      : `${doctor} is on leave on ${day(date)}. Please pick another date.`;
  }
  return `${doctor} is not seeing patients on ${day(date)}. Please pick another date.`;
};
