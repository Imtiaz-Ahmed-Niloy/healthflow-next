import { describe, it, expect } from "vitest";
import { hospitalUpdateSchema } from "./hospitals";
import { defaultWeek, serialiseWeek } from "@/lib/hours";

/**
 * The operating-hours half of the hospitals schema.
 *
 * This is the layer between a form post and a jsonb column. The form sends one
 * hidden input, so the week arrives as a STRING; the column is jsonb with a
 * check constraint (0054). Getting the conversion wrong stores a JSON string
 * inside jsonb — valid JSON, wrong shape, and the check constraint rejects it
 * with a message nobody can act on. Hence these.
 */

const parse = (opening_hours: unknown) => hospitalUpdateSchema.safeParse({ opening_hours });

describe("opening_hours on the hospitals schema", () => {
  it("parses the JSON string the form posts into an object", () => {
    const result = parse(serialiseWeek(defaultWeek()));
    expect(result.success).toBe(true);
    // An object, not the string it arrived as — otherwise it lands in jsonb as
    // a quoted string and the check constraint refuses it.
    expect(result.success && typeof result.data.opening_hours).toBe("object");
    expect(result.success && result.data.opening_hours).toEqual(defaultWeek());
  });

  it("accepts an object sent directly by an API client", () => {
    const week = { fri: { mode: "closed" as const } };
    const result = parse(week);
    expect(result.success).toBe(true);
    expect(result.success && result.data.opening_hours).toEqual(week);
  });

  it("accepts all three day modes", () => {
    const result = parse({
      sun: { mode: "hours", open: "08:30", close: "20:00" },
      fri: { mode: "closed" },
      sat: { mode: "24h" },
    });
    expect(result.success).toBe(true);
  });

  it("treats an empty field as absent rather than as a value", () => {
    // A blank hidden input must not clear the column by writing nonsense.
    const result = parse("");
    expect(result.success).toBe(true);
    expect(result.success && result.data.opening_hours).toBeUndefined();
  });

  it("allows null to clear the hours", () => {
    const result = parse(null);
    expect(result.success).toBe(true);
  });

  it("rejects a time that is not HH:MM", () => {
    expect(parse({ sun: { mode: "hours", open: "9am", close: "17:00" } }).success).toBe(false);
  });

  it("rejects an out-of-range time", () => {
    expect(parse({ sun: { mode: "hours", open: "25:00", close: "17:00" } }).success).toBe(false);
    expect(parse({ sun: { mode: "hours", open: "09:00", close: "17:60" } }).success).toBe(false);
  });

  it("rejects hours missing one end", () => {
    expect(parse({ sun: { mode: "hours", open: "09:00" } }).success).toBe(false);
  });

  it("rejects a mode it does not know", () => {
    expect(parse({ sun: { mode: "sometimes" } }).success).toBe(false);
  });

  it("rejects a day key that is not a day", () => {
    // .strict() — a typo must not be stored silently and then never read back.
    expect(parse({ funday: { mode: "24h" } }).success).toBe(false);
    expect(parse({ sun: { mode: "24h" }, Sunday: { mode: "24h" } }).success).toBe(false);
  });

  it("rejects an empty week", () => {
    expect(parse({}).success).toBe(false);
  });

  it("rejects text that is not JSON at all", () => {
    // The free text this column used to hold. It is a 422 now, not a cast error
    // from Postgres.
    expect(parse("24/7 Emergency").success).toBe(false);
    expect(parse("Mon - Fri 9:00 AM - 9:00 PM").success).toBe(false);
  });

  it("rejects JSON that parses but is not a week", () => {
    expect(parse("[1,2,3]").success).toBe(false);
    expect(parse('"just a string"').success).toBe(false);
    expect(parse("42").success).toBe(false);
  });
});
