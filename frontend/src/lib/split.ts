import type { ExpensePayload } from "./api";
import { formatMoney, parseMoney, splitEqual, sumSatang } from "./money";

export type SplitMode = "equal" | "exact";

export type SplitInput = {
  mode: SplitMode;
  amountText: string;
  /** Every group member, in the group's order. */
  members: string[];
  /** Members ticked for an equal split. */
  selected: string[];
  /** Text typed for each member in an exact split. */
  exactTexts: Record<string, string>;
};

export type ShareRow = {
  username: string;
  /** null while the input is empty or invalid */
  satang: number | null;
  error: string | null;
};

export type SplitPreview = {
  amountSatang: number | null;
  amountError: string | null;
  rows: ShareRow[];
  /** Exact mode only: total minus the shares typed so far (negative = over). */
  unallocated: number | null;
  /** Why the expense cannot be sent yet, or null when it can. */
  problem: string | null;
  canSubmit: boolean;
};

/** Plain decimal text for the API, no separators: 100000 -> "1000.00". */
export function toApiAmount(satang: number): string {
  const whole = Math.floor(satang / 100);
  const fraction = String(satang % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function equalRows(input: SplitInput, amountSatang: number | null): ShareRow[] {
  // Group order, like the backend: leftover satang go to the first people.
  const chosen = input.members.filter((m) => input.selected.includes(m));
  const shares =
    amountSatang !== null && chosen.length > 0
      ? splitEqual(amountSatang, chosen.length)
      : null;
  return chosen.map((username, i) => ({
    username,
    satang: shares ? shares[i] : null,
    error: null,
  }));
}

function exactRows(input: SplitInput): ShareRow[] {
  return input.members.map((username) => {
    const text = (input.exactTexts[username] ?? "").trim();
    if (text === "") return { username, satang: null, error: null };
    const parsed = parseMoney(text);
    return parsed.ok
      ? { username, satang: parsed.satang, error: null }
      : { username, satang: null, error: parsed.error };
  });
}

export function computePreview(input: SplitInput): SplitPreview {
  const amount = parseMoney(input.amountText);
  const amountSatang = amount.ok ? amount.satang : null;
  // Stay quiet while the field is still empty.
  const amountError =
    !amount.ok && input.amountText.trim() !== "" ? amount.error : null;

  const rows =
    input.mode === "equal" ? equalRows(input, amountSatang) : exactRows(input);

  let unallocated: number | null = null;
  let problem: string | null = null;

  if (amountSatang === null) {
    problem = "Enter a valid amount";
  } else if (input.mode === "equal") {
    if (rows.length === 0) problem = "Choose at least one member to split with";
  } else {
    const entered = rows.flatMap((r) => (r.satang === null ? [] : [r.satang]));
    unallocated = amountSatang - sumSatang(entered);
    if (rows.some((r) => r.error)) {
      problem = "Fix the highlighted shares";
    } else if (entered.length === 0) {
      problem = "Enter at least one share";
    } else if (unallocated > 0) {
      problem = `${formatMoney(unallocated)} still to allocate`;
    } else if (unallocated < 0) {
      problem = `Shares are ${formatMoney(-unallocated)} over the total`;
    }
  }

  return {
    amountSatang,
    amountError,
    rows,
    unallocated,
    problem,
    canSubmit: problem === null,
  };
}

/** The request body for the backend, or null while the form is not valid. */
export function buildPayload(
  input: SplitInput,
  description: string,
  paidBy: string,
): ExpensePayload | null {
  const preview = computePreview(input);
  if (!preview.canSubmit || preview.amountSatang === null) return null;

  const base = {
    description: description.trim(),
    paid_by: paidBy,
    amount: toApiAmount(preview.amountSatang),
  };

  if (input.mode === "equal") {
    return {
      ...base,
      split: { type: "equal", members: preview.rows.map((r) => r.username) },
    };
  }

  // Exact split: members left blank are simply not part of it.
  const shares: Record<string, string> = {};
  for (const row of preview.rows) {
    if (row.satang !== null) shares[row.username] = toApiAmount(row.satang);
  }
  return { ...base, split: { type: "exact", shares } };
}