import { describe, it, expect } from "vitest";
import {
  DAYS, defaultWeek, parseWeek, serialiseWeek, summariseWeek, formatDay, formatTime,
  type WeekHours,
} from "./hours";

const week = (overrides: Partial<WeekHours> = {}): WeekHours => ({ ...defaultWeek(), ...overrides });

describe("DAYS", () => {
  it("runs Sunday to Saturday, the Bangladeshi week", () => {
    expect(DAYS.map(d => d.key)).toEqual(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
  });
});

describe("defaultWeek", () => {
  it("opens the working week and closes Friday and Saturday", () => {
    const w = defaultWeek();
    expect(w.sun).toEqual({ mode: "hours", open: "09:00", close: "17:00" });
    expect(w.thu.mode).toBe("hours");
    expect(w.fri.mode).toBe("closed");
    expect(w.sat.mode).toBe("closed");
  });
});

describe("parseWeek", () => {
  it("round-trips through serialiseWeek", () => {
    const w = defaultWeek();
    expect(parseWeek(serialiseWeek(w))).toEqual(w);
  });

  it("accepts an already-parsed object", () => {
    expect(parseWeek(defaultWeek())).toEqual(defaultWeek());
  });

  it("returns null for the free text already in the column", () => {
    // These are real values people have typed. None of them is a week, and
    // none should be destroyed by being misread as one.
    expect(parseWeek("24/7 Emergency")).toBeNull();
    expect(parseWeek("9am - 5pm")).toBeNull();
    expect(parseWeek("Open all week")).toBeNull();
  });

  it("returns null for empty, malformed and non-week values", () => {
    expect(parseWeek("")).toBeNull();
    expect(parseWeek(null)).toBeNull();
    expect(parseWeek(undefined)).toBeNull();
    expect(parseWeek("{ not json")).toBeNull();
    expect(parseWeek("{}")).toBeNull();
    expect(parseWeek('{"hello":"world"}')).toBeNull();
  });

  it("keeps the days it understands and closes the ones it does not", () => {
    const partial = parseWeek('{"sun":{"mode":"24h"},"mon":{"mode":"nonsense"}}');
    expect(partial?.sun).toEqual({ mode: "24h" });
    expect(partial?.mon).toEqual({ mode: "closed" });
  });

  it("rejects a time that is not a time", () => {
    const bad = parseWeek('{"sun":{"mode":"hours","open":"9am","close":"17:00"}}');
    expect(bad).toBeNull();
  });

  it("rejects an out-of-range time", () => {
    expect(parseWeek('{"sun":{"mode":"hours","open":"25:00","close":"17:00"}}')).toBeNull();
  });
});

describe("formatTime", () => {
  it("renders 24-hour values as 12-hour with a suffix", () => {
    expect(formatTime("09:00")).toBe("9:00 AM");
    expect(formatTime("17:30")).toBe("5:30 PM");
  });

  it("handles both ends of the clock", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("23:59")).toBe("11:59 PM");
  });
});

describe("formatDay", () => {
  it("names the two states that are not times", () => {
    expect(formatDay({ mode: "closed" })).toBe("Closed");
    expect(formatDay({ mode: "24h" })).toBe("Open 24 hours");
  });
});

describe("summariseWeek", () => {
  it("groups the default week into two rows", () => {
    expect(summariseWeek(defaultWeek())).toEqual([
      { days: "Sun – Thu", hours: "9:00 AM – 5:00 PM" },
      { days: "Fri – Sat", hours: "Closed" },
    ]);
  });

  it("splits out the one day that differs", () => {
    const w = week({ wed: { mode: "hours", open: "09:00", close: "13:00" } });
    expect(summariseWeek(w)).toEqual([
      { days: "Sun – Tue", hours: "9:00 AM – 5:00 PM" },
      { days: "Wednesday", hours: "9:00 AM – 1:00 PM" },
      { days: "Thursday", hours: "9:00 AM – 5:00 PM" },
      { days: "Fri – Sat", hours: "Closed" },
    ]);
  });

  it("collapses an identical week into a single row", () => {
    const allDay = DAYS.reduce((w, d) => ({ ...w, [d.key]: { mode: "24h" } }), {} as WeekHours);
    expect(summariseWeek(allDay)).toEqual([{ days: "Sun – Sat", hours: "Open 24 hours" }]);
  });

  it("names a single day in full rather than as a range", () => {
    const rows = summariseWeek(week({ fri: { mode: "24h" } }));
    expect(rows).toContainEqual({ days: "Friday", hours: "Open 24 hours" });
    expect(rows).toContainEqual({ days: "Saturday", hours: "Closed" });
  });

  it("does not group two days that merely share a mode but not the times", () => {
    const w = week({ mon: { mode: "hours", open: "10:00", close: "17:00" } });
    const rows = summariseWeek(w);
    expect(rows[0]).toEqual({ days: "Sunday", hours: "9:00 AM – 5:00 PM" });
    expect(rows[1]).toEqual({ days: "Monday", hours: "10:00 AM – 5:00 PM" });
  });
});

describe("summariseWeek — the week is a cycle", () => {
  it("joins Saturday to Sunday when only Friday differs", () => {
    // The case that started this: closed on Friday only. Saturday and Sunday
    // are adjacent, so this is one run — not "Sun – Thu" plus a stray
    // "Saturday" repeating the same hours.
    const w = week({ sat: { mode: "hours", open: "09:00", close: "17:00" } });
    expect(summariseWeek(w)).toEqual([
      { days: "Sat – Thu", hours: "9:00 AM – 5:00 PM" },
      { days: "Friday", hours: "Closed" },
    ]);
  });

  it("wraps a run that starts on Saturday and ends midweek", () => {
    const w = week({
      sat: { mode: "hours", open: "08:00", close: "14:00" },
      sun: { mode: "hours", open: "08:00", close: "14:00" },
      mon: { mode: "hours", open: "08:00", close: "14:00" },
    });
    expect(summariseWeek(w)).toEqual([
      { days: "Sat – Mon", hours: "8:00 AM – 2:00 PM" },
      { days: "Tue – Thu", hours: "9:00 AM – 5:00 PM" },
      { days: "Friday", hours: "Closed" },
    ]);
  });

  it("does not wrap when the two ends genuinely differ", () => {
    // Sunday open, Saturday closed — no run crosses the boundary, so the
    // ordering is the plain one.
    expect(summariseWeek(defaultWeek())).toEqual([
      { days: "Sun – Thu", hours: "9:00 AM – 5:00 PM" },
      { days: "Fri – Sat", hours: "Closed" },
    ]);
  });

  it("still collapses a uniform week to one row", () => {
    const allDay = DAYS.reduce((w, d) => ({ ...w, [d.key]: { mode: "24h" } }), {} as WeekHours);
    expect(summariseWeek(allDay)).toEqual([{ days: "Sun – Sat", hours: "Open 24 hours" }]);
  });

  it("names a lone wrapped day in full", () => {
    // Every day closed except Saturday: one day, not a range.
    const closed = DAYS.reduce((w, d) => ({ ...w, [d.key]: { mode: "closed" } }), {} as WeekHours);
    const w: WeekHours = { ...closed, sat: { mode: "24h" } };
    expect(summariseWeek(w)).toEqual([
      { days: "Sun – Fri", hours: "Closed" },
      { days: "Saturday", hours: "Open 24 hours" },
    ]);
  });
});
