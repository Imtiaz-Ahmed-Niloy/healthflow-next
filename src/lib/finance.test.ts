import { describe, it, expect } from "vitest";
import { financeTotals, invoiceStatus, suggestReference, type Invoice } from "@/lib/finance";

const invoice = (over: Partial<Invoice> = {}): Invoice =>
  ({
    id: "00000000-0000-0000-0000-000000000001",
    tenant_id: "t",
    reference: "INV-202608-001",
    party: "MetLife",
    kind: "receivable",
    amount: 1000,
    due_date: "2026-08-20",
    paid_at: null,
    created_at: "",
    updated_at: "",
    ...over,
  }) as Invoice;

// Fixed "today" so these never start failing on a particular date.
const TODAY = new Date(2026, 7, 30); // 30 Aug 2026

describe("invoiceStatus", () => {
  it("is paid the moment paid_at is set, however late it was", () => {
    expect(invoiceStatus(invoice({ paid_at: "2026-09-01T10:00:00Z", due_date: "2026-01-01" }), TODAY))
      .toBe("paid");
  });

  it("is overdue when unpaid and past its due date", () => {
    expect(invoiceStatus(invoice({ due_date: "2026-08-29" }), TODAY)).toBe("overdue");
  });

  it("is not overdue on the due date itself", () => {
    // The bug this guards: comparing a date against `new Date()` rather than
    // the start of today marks an invoice due today as late from 00:00:01.
    expect(invoiceStatus(invoice({ due_date: "2026-08-30" }), TODAY)).toBe("pending");
  });

  it("is pending when it is not yet due", () => {
    expect(invoiceStatus(invoice({ due_date: "2026-09-15" }), TODAY)).toBe("pending");
  });
});

describe("financeTotals", () => {
  const invoices = [
    invoice({ id: "1", kind: "receivable", amount: 12000, due_date: "2026-09-10" }),          // pending in
    invoice({ id: "2", kind: "payable", amount: 9800, due_date: "2026-09-05" }),              // pending out
    invoice({ id: "3", kind: "receivable", amount: 6500, due_date: "2026-08-01" }),           // overdue in
    invoice({ id: "4", kind: "payable", amount: 4500, due_date: "2026-08-02" }),              // overdue out
    invoice({ id: "5", kind: "receivable", amount: 7000, paid_at: "2026-08-14T09:00:00Z" }),  // paid this month
    invoice({ id: "6", kind: "receivable", amount: 3000, paid_at: "2026-07-14T09:00:00Z" }),  // paid last month
    invoice({ id: "7", kind: "payable", amount: 5000, paid_at: "2026-08-15T09:00:00Z" }),     // paid, outgoing
  ];

  it("counts only unsettled invoices toward receivables and payables", () => {
    const totals = financeTotals(invoices, TODAY);
    expect(totals.receivables).toBe(12000 + 6500);
    expect(totals.payables).toBe(9800 + 4500);
  });

  it("counts overdue in both directions", () => {
    expect(financeTotals(invoices, TODAY).overdue).toBe(6500 + 4500);
  });

  it("counts only receivables settled this month as revenue", () => {
    // Not the 3000 settled in July, and not the 5000 that went out.
    expect(financeTotals(invoices, TODAY).revenueThisMonth).toBe(7000);
  });

  it("handles the numeric-as-string values Postgres sends", () => {
    const totals = financeTotals([invoice({ amount: "2500.50" as unknown as number, due_date: "2026-09-10" })], TODAY);
    expect(totals.receivables).toBe(2500.5);
  });

  it("is all zeroes for a hospital with no invoices", () => {
    expect(financeTotals([], TODAY)).toEqual({
      receivables: 0, payables: 0, overdue: 0, revenueThisMonth: 0,
    });
  });
});

describe("suggestReference", () => {
  it("starts at 001 in a month with nothing in it", () => {
    expect(suggestReference([], TODAY)).toBe("INV-202608-001");
  });

  it("continues from the highest number already used this month", () => {
    const existing = [
      invoice({ reference: "INV-202608-001" }),
      invoice({ reference: "INV-202608-004" }),
      invoice({ reference: "INV-202607-009" }),  // last month, ignored
      invoice({ reference: "ad-hoc reference" }), // hand-typed, ignored
    ];
    expect(suggestReference(existing, TODAY)).toBe("INV-202608-005");
  });

  it("ignores case when matching this month's references", () => {
    expect(suggestReference([invoice({ reference: "inv-202608-007" })], TODAY)).toBe("INV-202608-008");
  });
});
