import { describe, expect, it } from "vitest";
import {
  availabilityLabel, describeSchedule, hoursOn, outsideAvailabilityReason, parseAvailability, weekFromAvailability,
} from "./availability";
import { defaultWeek, serialiseWeek, type WeekHours } from "./hours";

const sunToThu9to5 = { start: "09:00", end: "17:00" };

/** Every shape doctors.availability was typed in before the weekly editor, from production. */
describe("parseAvailability — free text", () => {
  it("reads the en-dash, compact form", () => {
    expect(parseAvailability("Sun–Thu, 9am–5pm")).toEqual({
      days: ["Sun", "Mon", "Tue", "Wed", "Thu"],
      hours: { Sun: sunToThu9to5, Mon: sunToThu9to5, Tue: sunToThu9to5, Wed: sunToThu9to5, Thu: sunToThu9to5 },
    });
  });

  it("reads the spaced form with minutes and AM/PM", () => {
    const s = parseAvailability("Sat - Wed, 9:00 AM - 3:00 PM");
    expect(s?.days).toEqual(["Sun", "Mon", "Tue", "Wed", "Sat"]);
    expect(s?.hours.Sat).toEqual({ start: "09:00", end: "15:00" });
  });

  it("reads an evening chamber", () => {
    expect(parseAvailability("Sun - Thu, 4:00 PM - 9:00 PM")?.hours.Sun).toEqual({ start: "16:00", end: "21:00" });
  });

  it("wraps a range across the week and handles a missing meridiem", () => {
    const s = parseAvailability("Fri–Sun, 9–1pm");
    expect(s?.days).toEqual(["Sun", "Fri", "Sat"]);
    expect(s?.hours.Fri).toEqual({ start: "09:00", end: "13:00" });
  });

  it("gives up on text it can't read rather than guessing", () => {
    expect(parseAvailability(null)).toBeNull();
    expect(parseAvailability("Mon-Fri")).toBeNull();
    expect(parseAvailability("By appointment")).toBeNull();
  });
});

const week = (overrides: Partial<WeekHours> = {}) => serialiseWeek({ ...defaultWeek(), ...overrides });

describe("parseAvailability — a week from the editor", () => {
  it("gives each day its own hours and leaves closed days out", () => {
    const s = parseAvailability(week({ sat: { mode: "hours", open: "10:00", close: "14:00" } }));
    expect(s?.days).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"]);
    expect(s?.hours.Sun).toEqual(sunToThu9to5);
    expect(s?.hours.Sat).toEqual({ start: "10:00", end: "14:00" });
    expect(s?.hours.Fri).toBeUndefined();
  });

  it("reads 24 hours as the whole day, and a close before the open as running to midnight", () => {
    const s = parseAvailability(week({ fri: { mode: "24h" }, sat: { mode: "hours", open: "18:00", close: "02:00" } }));
    expect(s?.hours.Fri).toEqual({ start: "00:00", end: "24:00" });
    expect(s?.hours.Sat).toEqual({ start: "18:00", end: "24:00" });
  });
});

describe("outsideAvailabilityReason", () => {
  const sunToThu = parseAvailability("Sun–Thu, 9am–5pm");

  it("refuses a day off", () => {
    // 2026-09-11 is a Friday.
    expect(outsideAvailabilityReason(sunToThu, "2026-09-11", "10:00", "Dr. Smith"))
      .toBe("Dr. Smith doesn't see patients on Fridays. Available Sun–Thu.");
  });

  it("refuses outside hours, with the end exclusive", () => {
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "08:30")).toMatch(/between 9:00 AM and 5:00 PM\.$/);
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "17:00")).toMatch(/between 9:00 AM and 5:00 PM/);
  });

  it("allows a slot inside the hours", () => {
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "09:00")).toBeNull();
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "16:59:00")).toBeNull();
  });

  it("checks only the day while no time is picked", () => {
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "")).toBeNull();
    expect(outsideAvailabilityReason(sunToThu, "2026-09-11", "")).toMatch(/Fridays/);
  });

  it("holds each day of a week to its own hours, and names the day when they differ", () => {
    const s = parseAvailability(week({ sat: { mode: "hours", open: "10:00", close: "14:00" } }));
    // 2026-09-12 is a Saturday.
    expect(outsideAvailabilityReason(s, "2026-09-12", "15:00", "Dr. Rahman"))
      .toBe("Dr. Rahman sees patients between 10:00 AM and 2:00 PM on Saturdays.");
    expect(outsideAvailabilityReason(s, "2026-09-12", "11:00")).toBeNull();
    expect(outsideAvailabilityReason(s, "2026-09-11", "11:00")).toMatch(/Available Sat–Thu\./);
  });

  it("refuses every day when the week is closed throughout", () => {
    const closed = serialiseWeek(Object.fromEntries(
      Object.keys(defaultWeek()).map(k => [k, { mode: "closed" }]),
    ) as WeekHours);
    expect(outsideAvailabilityReason(parseAvailability(closed), "2026-09-13", "10:00")).toMatch(/isn't taking appointments/);
  });

  it("never refuses when the schedule could not be read", () => {
    expect(outsideAvailabilityReason(null, "2026-09-11", "03:00")).toBeNull();
  });
});

describe("describing a schedule", () => {
  it("collapses days that share hours, and wraps the week", () => {
    expect(describeSchedule(parseAvailability("Sat - Wed, 9:00 AM - 3:00 PM")!)).toBe("Sat–Wed 9:00 AM–3:00 PM");
    expect(describeSchedule(parseAvailability(week({ sat: { mode: "hours", open: "10:00", close: "14:00" } }))!))
      .toBe("Sun–Thu 9:00 AM–5:00 PM · Sat 10:00 AM–2:00 PM");
  });

  it("says every day and all day", () => {
    const allDay = serialiseWeek(Object.fromEntries(
      Object.keys(defaultWeek()).map(k => [k, { mode: "24h" }]),
    ) as WeekHours);
    expect(describeSchedule(parseAvailability(allDay)!)).toBe("every day all day");
  });

  it("shows free text as typed, and a week described", () => {
    expect(availabilityLabel("By appointment")).toBe("By appointment");
    expect(availabilityLabel(week())).toBe("Sun–Thu 9:00 AM–5:00 PM");
    expect(availabilityLabel(null)).toBeNull();
  });

  it("bounds a time picker by the date's own hours", () => {
    const s = parseAvailability(week({ sat: { mode: "hours", open: "10:00", close: "14:00" } }));
    expect(hoursOn(s, "2026-09-12")).toEqual({ start: "10:00", end: "14:00" });
    expect(hoursOn(s, "2026-09-11")).toBeNull();
  });
});

describe("weekFromAvailability", () => {
  it("keeps old text when the editor opens, rather than the default", () => {
    const w = weekFromAvailability("Sat - Wed, 9:00 AM - 3:00 PM");
    expect(w.sat).toEqual({ mode: "hours", open: "09:00", close: "15:00" });
    expect(w.thu).toEqual({ mode: "closed" });
  });

  it("opens a stored week as it is, and a blank as the default", () => {
    const stored = { ...defaultWeek(), fri: { mode: "24h" as const } };
    expect(weekFromAvailability(serialiseWeek(stored))).toEqual(stored);
    expect(weekFromAvailability("")).toEqual(defaultWeek());
  });
});
