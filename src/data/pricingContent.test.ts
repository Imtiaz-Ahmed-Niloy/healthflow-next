import { describe, expect, it } from "vitest";
import { blocksToPricingContent, type CompareRow } from "./pricingContent";

/**
 * The compare table is the one CMS block whose width is data, not markup: a
 * row has one cell per plan, so adding or removing a plan has to reshape every
 * row. These cover the two things that can silently go wrong — a row that
 * disagrees with the plan list about how many columns there are, and a legacy
 * row saved before the table went plan-driven.
 */

/** The shape stored in production today: basic/pro/enterprise, not values[]. */
const legacyBlocks = {
  plans: [
    { name: "Basic", price: "0", tag: "Starter", cta: "Start", featured: false, features: [] },
    { name: "Professional", price: "29", tag: "Popular", cta: "Go", featured: true, features: [] },
    { name: "Enterprise", price: "99", tag: "Scale", cta: "Talk", featured: false, features: [] },
  ],
  compareRows: [
    { label: "Consultations per Month", basic: "2 Sessions", pro: "Unlimited", enterprise: "Unlimited" },
    { label: "Health Record Storage", basic: "5 GB", pro: "20 GB", enterprise: "Unlimited", bold: [3] },
  ],
};

describe("blocksToPricingContent", () => {
  it("reads a legacy basic/pro/enterprise row as one cell per plan", () => {
    const { compareRows } = blocksToPricingContent(legacyBlocks);
    expect(compareRows[0].values).toEqual(["2 Sessions", "Unlimited", "Unlimited"]);
  });

  it("gives every row exactly one cell per plan, which is what the table renders", () => {
    const { plans, compareRows } = blocksToPricingContent(legacyBlocks);
    for (const row of compareRows) {
      expect([row.label, ...row.values]).toHaveLength(1 + plans.length);
    }
  });

  it("pads a row saved before a plan was added", () => {
    const { compareRows } = blocksToPricingContent({
      ...legacyBlocks,
      plans: [...legacyBlocks.plans, { name: "Clinic", price: "199", tag: "New", cta: "Go", featured: false, features: [] }],
    });
    expect(compareRows[0].values).toEqual(["2 Sessions", "Unlimited", "Unlimited", "—"]);
  });

  it("trims a row saved before a plan was removed", () => {
    const { compareRows } = blocksToPricingContent({
      ...legacyBlocks,
      plans: legacyBlocks.plans.slice(0, 2),
    });
    expect(compareRows[0].values).toEqual(["2 Sessions", "Unlimited"]);
  });
});

/**
 * The reindexing the CMS editor does when a plan is deleted. `bold` indexes
 * the rendered row — [label, ...values] — so plan i is cell i + 1.
 */
const removePlanFromRow = (row: CompareRow, i: number): CompareRow => {
  const bold = (row.bold ?? []).filter(n => n !== i + 1).map(n => (n > i + 1 ? n - 1 : n));
  return { ...row, values: row.values.filter((_, idx) => idx !== i), bold: bold.length ? bold : undefined };
};

describe("removing a plan moves the emphasis with the column", () => {
  const row: CompareRow = { label: "Storage", values: ["5 GB", "20 GB", "Unlimited"], bold: [3] };

  it("shifts a mark that sat to the right of the removed plan", () => {
    // Drop "Professional" (plan 1). Enterprise was cell 3, it is now cell 2.
    const out = removePlanFromRow(row, 1);
    expect(out.values).toEqual(["5 GB", "Unlimited"]);
    expect(out.bold).toEqual([2]);
    expect([out.label, ...out.values][out.bold![0]]).toBe("Unlimited");
  });

  it("drops a mark that sat on the removed plan", () => {
    const out = removePlanFromRow(row, 2);
    expect(out.values).toEqual(["5 GB", "20 GB"]);
    expect(out.bold).toBeUndefined();
  });

  it("leaves a mark to the left of the removed plan alone", () => {
    const out = removePlanFromRow({ ...row, bold: [1] }, 2);
    expect(out.bold).toEqual([1]);
    expect([out.label, ...out.values][1]).toBe("5 GB");
  });
});
