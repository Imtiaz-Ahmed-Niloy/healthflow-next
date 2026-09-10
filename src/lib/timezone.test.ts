import { describe, expect, it } from "vitest";
import { nowTimeIn, pastSlotReason, todayIn } from "./timezone";

/**
 * The case that broke booking: 01:30 on 11 September in Dhaka is still the
 * 10th in UTC, and a form built on toISOString() offered the 10th.
 */
const at = new Date("2026-09-10T19:30:00Z"); // 01:30, 11 Sep, Asia/Dhaka

describe("hospital clock", () => {
  it("reads the date as the hospital's timezone does, not UTC", () => {
    expect(todayIn("Asia/Dhaka", at)).toBe("2026-09-11");
    expect(todayIn("UTC", at)).toBe("2026-09-10");
  });

  it("reads the time in that timezone, 24-hour", () => {
    expect(nowTimeIn("Asia/Dhaka", at)).toBe("01:30");
  });

  it("refuses yesterday, and earlier today", () => {
    expect(pastSlotReason("2026-09-10", "10:00", "Asia/Dhaka", at)).toMatch(/date has already passed/);
    expect(pastSlotReason("2026-09-11", "01:00", "Asia/Dhaka", at)).toMatch(/time has already passed/);
    expect(pastSlotReason("2026-09-11", "01:30:00", "Asia/Dhaka", at)).toMatch(/time has already passed/);
  });

  it("allows later today and any later date", () => {
    expect(pastSlotReason("2026-09-11", "09:00", "Asia/Dhaka", at)).toBeNull();
    expect(pastSlotReason("2026-09-12", "00:15", "Asia/Dhaka", at)).toBeNull();
  });
});
