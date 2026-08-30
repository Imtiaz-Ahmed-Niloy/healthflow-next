import { describe, it, expect } from "vitest";
import {
  breakdown,
  computePayslip,
  computeRunPayslips,
  defaultSettings,
  getEligibleEmployees,
  toSettings,
  type Employee,
} from "@/lib/payroll";

/**
 * These are the numbers a hospital pays people, so they get a test rather than
 * a click-through. Every case here is one the engine used to get wrong, or one
 * a future change could plausibly break.
 */

const employee = (over: Partial<Employee> = {}): Employee =>
  ({
    id: "00000000-0000-0000-0000-000000000001",
    emp_id: "E-001",
    name: "Test Employee",
    department: "Nursing",
    designation: "Nurse",
    gross_salary: 50000,
    job_status: "active",
    tenant_id: "t",
    status: "active",
    documents_status: "pending",
    orientation_status: "pending",
    created_at: "",
    updated_at: "",
    blood_group: null, email: null, employment_type: null, end_date: null,
    father_name: null, marital_status: null, mother_name: null, nid: null,
    permanent_address: null, phone: null, present_address: null, religion: null,
    start_date: null,
    ...over,
  }) as Employee;

describe("breakdown", () => {
  it("splits gross across the four earnings components", () => {
    const b = breakdown(50000, defaultSettings);
    expect(b).toMatchObject({ basic: 25000, houseRent: 15000, medical: 5000, transport: 5000 });
  });

  it("always sums the four components back to gross exactly", () => {
    // 33333 is chosen to make every percentage round: the point of transport
    // absorbing the remainder is that a hospital's totals never drift by a taka.
    for (const gross of [33333, 12345, 7, 99999]) {
      const b = breakdown(gross, defaultSettings);
      expect(b.basic + b.houseRent + b.medical + b.transport).toBe(gross);
    }
  });

  it("charges no tax at or below the threshold, and tax above it", () => {
    expect(breakdown(25000, defaultSettings).tax).toBe(0);
    expect(breakdown(25001, defaultSettings).tax).toBe(1250);
  });

  it("takes provident fund off basic, not gross", () => {
    // 8% of basic (25000) is 2000. 8% of gross would be 4000.
    expect(breakdown(50000, defaultSettings).pf).toBe(2000);
  });
});

describe("computePayslip", () => {
  it("nets gross minus every deduction", () => {
    const slip = computePayslip(employee(), "2026-08", defaultSettings, 1000);
    expect(slip.gross).toBe(50000);
    expect(slip.pf).toBe(2000);
    expect(slip.tax).toBe(2500);
    expect(slip.loan).toBe(1000);
    expect(slip.total_deductions).toBe(5500);
    expect(slip.net).toBe(44500);
  });

  it("treats a missing salary as zero rather than NaN", () => {
    const slip = computePayslip(employee({ gross_salary: null }), "2026-08", defaultSettings);
    expect(slip.gross).toBe(0);
    expect(slip.net).toBe(0);
  });

  it("snapshots who the payslip was for", () => {
    const slip = computePayslip(employee({ name: "Rina", department: "ICU" }), "2026-08", defaultSettings);
    expect(slip).toMatchObject({ name: "Rina", department: "ICU", emp_id: "E-001", period: "2026-08" });
  });
});

describe("getEligibleEmployees", () => {
  it("drops the people who have left and keeps everyone else", () => {
    const staff = [
      employee({ id: "1", job_status: "active" }),
      employee({ id: "2", job_status: "probation" }),
      employee({ id: "3", job_status: "suspended" }),
      employee({ id: "4", job_status: "terminated" }),
      employee({ id: "5", job_status: "resigned" }),
    ];
    expect(getEligibleEmployees(staff).map(e => e.id)).toEqual(["1", "2", "3"]);
  });
});

describe("computeRunPayslips", () => {
  const staff = [
    employee({ id: "1", emp_id: "E-1", department: "ICU", gross_salary: 40000 }),
    employee({ id: "2", emp_id: "E-2", department: "Nursing", gross_salary: 30000 }),
    employee({ id: "3", emp_id: "E-3", department: "ICU", gross_salary: 20000, job_status: "resigned" }),
  ];

  it("totals the whole hospital when no department is given", () => {
    const result = computeRunPayslips("2026-08", staff, defaultSettings);
    expect(result.headcount).toBe(2);
    expect(result.gross).toBe(70000);
  });

  it("limits the run to one department", () => {
    const result = computeRunPayslips("2026-08", staff, defaultSettings, "ICU");
    expect(result.headcount).toBe(1);
    expect(result.payslips[0].emp_id).toBe("E-1");
  });

  it('treats "All" as the whole hospital, not a department named All', () => {
    expect(computeRunPayslips("2026-08", staff, defaultSettings, "All").headcount).toBe(2);
  });

  it("leaves out the people who have left", () => {
    const result = computeRunPayslips("2026-08", staff, defaultSettings);
    expect(result.payslips.map(p => p.emp_id)).not.toContain("E-3");
  });
});

describe("toSettings", () => {
  it("coerces the strings Postgres sends for numeric columns", () => {
    // This is the one that turns every amount on the page into "৳NaN" when it
    // is missed: numeric arrives over the wire as a string.
    const settings = toSettings({ basic_pct: "60.00", house_rent_pct: "20.00", tax_threshold: "30000.00" });
    expect(settings.basic_pct).toBe(60);
    expect(settings.house_rent_pct).toBe(20);
    expect(settings.tax_threshold).toBe(30000);
  });

  it("falls back to the defaults for anything missing or unusable", () => {
    expect(toSettings(null)).toEqual(defaultSettings);
    expect(toSettings({ basic_pct: "not a number" }).basic_pct).toBe(defaultSettings.basic_pct);
  });
});
