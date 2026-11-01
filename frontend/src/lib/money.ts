export const MAX_SATANG = 999_999_999_999;

export type ParsedMoney =
  | { ok: true; satang: number }
  | { ok: false; error: string };

export function parseMoney(text: string): ParsedMoney {
  const value = text.trim();
  if (value === "") {
    return { ok: false, error: "Enter an amount" };
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) {
    return { ok: false, error: "Amount is not a valid number" };
  }

  const whole = match[1];
  const fraction = match[2] ?? "";
  if (fraction.length > 2) {
    return { ok: false, error: "Amount must have at most 2 decimal places" };
  }
  if (whole.length > 10) {
    return { ok: false, error: "Amount is too large" };
  }

  const satang = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (satang <= 0) {
    return { ok: false, error: "Amount must be greater than zero" };
  }
  if (satang > MAX_SATANG) {
    return { ok: false, error: "Amount is too large" };
  }
  return { ok: true, satang };
}

const wholeFormatter = new Intl.NumberFormat("th-TH-u-nu-latn");

export function formatMoney(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const absolute = Math.abs(satang);
  const fraction = String(absolute % 100).padStart(2, "0");
  const whole = (absolute - (absolute % 100)) / 100;
  return `${sign}${wholeFormatter.format(whole)}.${fraction}`;
}

export function splitEqual(totalSatang: number, count: number): number[] {
  if (!Number.isInteger(totalSatang) || totalSatang < 0) {
    throw new Error("total must be a non-negative whole number of satang");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("count must be at least 1");
  }
  const base = Math.floor(totalSatang / count);
  const remainder = totalSatang - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function sumSatang(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}