import { describe, expect, it } from "vitest";

import {
  buildPayload,
  computePreview,
  toApiAmount,
  type SplitInput,
} from "./split";

const members = ["alice", "bob", "carol"];

function equal(amountText: string, selected = members): SplitInput {
  return { mode: "equal", amountText, members, selected, exactTexts: {} };
}

function exact(
  amountText: string,
  exactTexts: Record<string, string>,
): SplitInput {
  return { mode: "exact", amountText, members, selected: [], exactTexts };
}

describe("computePreview: equal split", () => {
  it("shows 33.34, 33.33, 33.33 for 100.00 among three", () => {
    const preview = computePreview(equal("100.00"));
    expect(preview.rows.map((r) => r.satang)).toEqual([3334, 3333, 3333]);
    expect(preview.canSubmit).toBe(true);
  });

  it("follows the group's order, not the order members were ticked", () => {
    const preview = computePreview(equal("100.01", ["carol", "alice"]));
    expect(preview.rows.map((r) => r.username)).toEqual(["alice", "carol"]);
    expect(preview.rows.map((r) => r.satang)).toEqual([5001, 5000]);
  });

  it("cannot be sent without members or with a bad amount", () => {
    expect(computePreview(equal("100.00", [])).canSubmit).toBe(false);
    expect(computePreview(equal("10.005")).canSubmit).toBe(false);
    expect(computePreview(equal("10.005")).amountError).toContain("2 decimal");
    expect(computePreview(equal("")).amountError).toBeNull();
  });
});

describe("computePreview: exact split", () => {
  it("reports the unallocated amount and blocks sending", () => {
    const preview = computePreview(
      exact("100.00", { alice: "50.00", bob: "30.00" }),
    );
    expect(preview.unallocated).toBe(2000);
    expect(preview.problem).toBe("20.00 still to allocate");
    expect(preview.canSubmit).toBe(false);
  });

  it("allows sending once the shares equal the total", () => {
    const preview = computePreview(
      exact("100.00", { alice: "50.00", bob: "30.00", carol: "20.00" }),
    );
    expect(preview.unallocated).toBe(0);
    expect(preview.canSubmit).toBe(true);
  });

  it("blocks sending when the shares exceed the total", () => {
    const preview = computePreview(
      exact("100.00", { alice: "60.00", bob: "50.00" }),
    );
    expect(preview.unallocated).toBe(-1000);
    expect(preview.problem).toBe("Shares are 10.00 over the total");
    expect(preview.canSubmit).toBe(false);
  });

  it("flags an invalid share", () => {
    const preview = computePreview(exact("100.00", { alice: "50.005" }));
    expect(preview.rows[0].error).not.toBeNull();
    expect(preview.canSubmit).toBe(false);
  });

  it("has no floating-point error: 0.10 + 0.20 matches 0.30", () => {
    const preview = computePreview(
      exact("0.30", { alice: "0.10", bob: "0.20" }),
    );
    expect(preview.unallocated).toBe(0);
    expect(preview.canSubmit).toBe(true);
  });
});

describe("buildPayload", () => {
  it("builds the equal payload the backend expects", () => {
    expect(buildPayload(equal("1000"), " Dinner ", "alice")).toEqual({
      description: "Dinner",
      paid_by: "alice",
      amount: "1000.00",
      split: { type: "equal", members: ["alice", "bob", "carol"] },
    });
  });

  it("sends only members who have a share in an exact split", () => {
    const payload = buildPayload(
      exact("100", { alice: "60", carol: "40" }),
      "Taxi",
      "bob",
    );
    expect(payload).toEqual({
      description: "Taxi",
      paid_by: "bob",
      amount: "100.00",
      split: { type: "exact", shares: { alice: "60.00", carol: "40.00" } },
    });
  });

  it("returns null while the form is not valid", () => {
    expect(buildPayload(exact("100", { alice: "10" }), "x", "alice")).toBeNull();
  });
});

describe("toApiAmount", () => {
  it("writes plain decimals with no separators", () => {
    expect(toApiAmount(100000)).toBe("1000.00");
    expect(toApiAmount(33334)).toBe("333.34");
    expect(toApiAmount(5)).toBe("0.05");
  });
});