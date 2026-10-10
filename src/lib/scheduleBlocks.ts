/**
 * A doctor's blocked time (0125, public.doctor_schedule_blocks): leave, an
 * operation, a hospital round, a class or meeting, or simply busy. Added on
 * /portal/schedule; booking is refused inside one (src/server/scheduleBlocks.ts).
 *
 * What is here is shared by the page and the API: the kinds, the shape of a
 * row, and which dates and times a row covers — the same reading the
 * database's doctor_blocked() makes.
 */

export const BLOCK_KINDS = ["leave", "surgery", "round", "teaching", "busy"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export type ScheduleBlock = {
  id: string;
  /** One of the doctor's places, or null for all of them. */
  doctor_id: string | null;
  kind: BlockKind;
  /** "YYYY-MM-DD". No end_date: until it is removed (a repeating one only). */
  start_date: string;
  end_date: string | null;
  /** "HH:mm:ss" as the database returns it. Both null: the whole day. */
  start_time: string | null;
  end_time: string | null;
  /** Weekdays it holds on, 0 = Sunday. Null: every day in the span. */
  repeat_days: number[] | null;
  /** False: written down, but patients can still book into it. */
  blocks_booking: boolean;
  note: string | null;
};

/** 0 = Sunday, read off the date itself, whatever the machine's timezone. */
export const weekdayOfDate = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** Whether the block holds on this date ("YYYY-MM-DD"), at any hour. */
export const blockCoversDate = (b: ScheduleBlock, date: string) =>
  date >= b.start_date
  && (!b.end_date || date <= b.end_date)
  && (!b.repeat_days || b.repeat_days.includes(weekdayOfDate(date)));

/** Whether the block holds at this time ("HH:mm") of this date. The end is exclusive, as a doctor's hours are. */
export const blockCoversSlot = (b: ScheduleBlock, date: string, time: string) => {
  if (!blockCoversDate(b, date)) return false;
  if (!b.start_time || !b.end_time) return true;
  const t = time.slice(0, 5);
  return t >= b.start_time.slice(0, 5) && t < b.end_time.slice(0, 5);
};
