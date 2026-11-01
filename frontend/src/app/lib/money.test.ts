import { describe, expect, it } from "vitest";

import { formatMoney, parseMoney, splitEqual, sumSatang } from "./money";

function satangOf(text: string): number {
  const result = parseMoney(text);
  if (!result.ok) throw new Error(result.error);
  return result.satang;
}

describe("parseMoney", () => {
  it("reads amounts as whole satang", () => {
    expect(satangOf("1000.00")).toBe(100000);
    expect(satangOf("1000.5")).toBe(100050);
    expect(satangOf("0.05")).toBe(5);
    expect(satangOf("25")).toBe(2500);
  });

  it("rejects more than 2 decimal places", () => {
    const result = parseMoney("10.005");
    expect(result.ok).toBe(false);
  });

  it("rejects zero, negatives and junk", () => {
    for (const bad of ["0", "0.00", "-5", "abc", "", "1e3", "10."]) {
      expect(parseMoney(bad).ok).toBe(false);
    }
  });

  it("rejects amounts above the database limit", () => {
    expect(parseMoney("10000000000.00").ok).toBe(false);
    expect(parseMoney("9999999999.99").ok).toBe(true);
  });
});

describe("splitEqual", () => {
  it("gives leftover satang to the first members, like the backend", () => {
    expect(splitEqual(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitEqual(100000, 3)).toEqual([33334, 33333, 33333]);
    expect(splitEqual(10002, 3)).toEqual([3334, 3334, 3334]);
  });

  it("always adds back up to the total", () => {
    for (const total of [1, 2, 99, 10000, 123457]) {
      for (const count of [1, 2, 3, 7]) {
        expect(sumSatang(splitEqual(total, count))).toBe(total);
      }
    }
  });
});

describe("formatMoney", () => {
  it("uses Thai grouping with two decimals", () => {
    expect(formatMoney(100000)).toBe("1,000.00");
    expect(formatMoney(123456789)).toBe("1,234,567.89");
    expect(formatMoney(5)).toBe("0.05");
    expect(formatMoney(0)).toBe("0.00");
    expect(formatMoney(-33333)).toBe("-333.33");
  });

  it("has no floating-point error: 0.1 + 0.2 displays 0.30", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // plain JavaScript gets this wrong
    const total = sumSatang([satangOf("0.1"), satangOf("0.2")]);
    expect(formatMoney(total)).toBe("0.30");
  });
});