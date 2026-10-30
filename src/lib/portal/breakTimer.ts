/**
 * The doctor's queue break — the button on Queue and Prescription that pauses
 * the line and puts a countdown on the lounge TV. The doctor picks its length
 * each time they press it (BreakButton), starting from 10.
 */
export const DEFAULT_BREAK_MINUTES = 10;
export const MIN_BREAK_MINUTES = 1;
export const MAX_BREAK_MINUTES = 120;

/**
 * The running break's length, next to `healthflow_queue_break_ends_at`. Only
 * the lounge TV reads it, to say "15-minute break" again after a reload; it is
 * read only while that end time is still ahead, and every start writes both.
 */
export const BREAK_MINUTES_KEY = "healthflow_queue_break_minutes";

/** A whole number of minutes the break may run, or null for anything else. */
export const validBreakMinutes = (value: unknown) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= MIN_BREAK_MINUTES && n <= MAX_BREAK_MINUTES ? n : null;
};

/** "১০" in Bangla, "10" otherwise — the break copy is spoken and shown in both. */
const num = (n: number, bn: boolean) => (bn ? n.toLocaleString("bn-BD") : String(n));

/** Every sentence the break shows or speaks, for a break of `minutes`. */
export const breakCopy = (minutes: number, bn: boolean) => {
  const m = num(minutes, bn);
  return {
    button: bn ? `${m} মিনিট বিরতি` : `${minutes}m Break`,
    start: bn ? `${m} মিনিটের বিরতি শুরু করুন` : `Start ${minutes}-minute break`,
    announcement: bn
      ? `সম্মানিত রোগীগণ, ডাক্তার ${m} মিনিটের সংক্ষিপ্ত বিরতিতে আছেন। অনুগ্রহ করে অপেক্ষা করুন।`
      : `Attention patients, the doctor is on a brief ${minutes}-minute break. Consultation will resume shortly.`,
    started: bn ? `টিভি বোর্ডে ${m} মিনিটের বিরতি কাউন্টডাউন শুরু হয়েছে` : `${minutes}-minute break countdown active on TV board`,
    startedOffline: bn ? `${m} মিনিটের বিরতি সক্রিয় করা হয়েছে` : `${minutes}-minute break started`,
    tvBadge: bn ? `${m} মিনিটের বিরতি চলমান` : "SHORT BREAK IN PROGRESS",
    tvNotice: bn
      ? `সম্মানিত রোগীগণ, ডাক্তার ${m} মিনিটের সংক্ষিপ্ত বিরতিতে আছেন। বিরতির পর সিরিয়াল অনুযায়ী রোগী দেখা শুরু হবে।`
      : `Dear patients, the doctor is taking a ${minutes}-minute intermission. Consultations will resume promptly in token order.`,
    tvHeading: bn ? `— ${m} মিনিট চা-বিরতি —` : `— ${minutes}-MIN BREAK —`,
  };
};
