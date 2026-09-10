import { describe, expect, it } from "vitest";
import { outsideAvailabilityReason, parseAvailability } from "./availability";

/** Every shape doctors.availability is actually written in, from production. */
describe("parseAvailability", () => {
  it("reads the en-dash, compact form", () => {
    expect(parseAvailability("Sun–Thu, 9am–5pm")).toEqual({
      days: ["Sun", "Mon", "Tue", "Wed", "Thu"], start: "09:00", end: "17:00",
    });
  });

  it("reads the spaced form with minutes and AM/PM", () => {
    expect(parseAvailability("Sat - Wed, 9:00 AM - 3:00 PM")).toEqual({
      days: ["Sat", "Sun", "Mon", "Tue", "Wed"], start: "09:00", end: "15:00",
    });
  });

  it("reads an evening chamber", () => {
    expect(parseAvailability("Sun - Thu, 4:00 PM - 9:00 PM")).toEqual({
      days: ["Sun", "Mon", "Tue", "Wed", "Thu"], start: "16:00", end: "21:00",
    });
  });

  it("wraps a range across the week and handles a missing meridiem", () => {
    expect(parseAvailability("Fri–Sun, 9–1pm")).toEqual({
      days: ["Fri", "Sat", "Sun"], start: "09:00", end: "13:00",
    });
  });

  it("gives up on text it can't read rather than guessing", () => {
    expect(parseAvailability(null)).toBeNull();
    expect(parseAvailability("Mon-Fri")).toBeNull();
    expect(parseAvailability("By appointment")).toBeNull();
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
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "08:30")).toMatch(/between 9:00 AM and 5:00 PM/);
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "17:00")).toMatch(/between 9:00 AM and 5:00 PM/);
  });

  it("allows a slot inside the hours", () => {
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "09:00")).toBeNull();
    expect(outsideAvailabilityReason(sunToThu, "2026-09-13", "16:59:00")).toBeNull();
  });

  it("never refuses when the schedule could not be read", () => {
    expect(outsideAvailabilityReason(null, "2026-09-11", "03:00")).toBeNull();
  });
});
