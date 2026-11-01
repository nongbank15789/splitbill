"use client";

import { useRef, useState, type FormEvent } from "react";

import { createExpense, type Expense, type GroupDetail } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { buildPayload, computePreview, type SplitMode } from "@/lib/split";

type Props = {
  user: string;
  group: GroupDetail;
  onCreated: (expense: Expense) => void;
};

const inputClass = "rounded border border-gray-400 bg-white p-2 text-black";

export default function ExpenseForm({ user, group, onCreated }: Props) {
  const members = group.members.map((m) => m.username);

  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [paidBy, setPaidBy] = useState(
    members.includes(user) ? user : members[0],
  );
  const [mode, setMode] = useState<SplitMode>("equal");
  const [selected, setSelected] = useState<string[]>(members);
  const [exactTexts, setExactTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One idempotency key per attempt. If the network drops and the user presses
  // the button again, the same key is sent, so the backend cannot record the
  // expense twice. Any edit to the form starts a new attempt.
  const attemptKey = useRef<string | null>(null);
  function edited() {
    attemptKey.current = null;
    setError(null);
  }

  const input = { mode, amountText, members, selected, exactTexts };
  const preview = computePreview(input);
  const hint =
    preview.problem ??
    (description.trim() === "" ? "Add a description" : null);
  const ready = hint === null && !submitting;

  function toggle(name: string) {
    edited();
    setSelected((current) =>
      current.includes(name)
        ? current.filter((n) => n !== name)
        : [...current, name],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildPayload(input, description, paidBy);
    if (!payload || submitting) return;

    attemptKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    setError(null);
    try {
      const expense = await createExpense(
        user,
        group.id,
        payload,
        attemptKey.current,
      );
      attemptKey.current = null;
      setDescription("");
      setAmountText("");
      setExactTexts({});
      onCreated(expense);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded border border-gray-400 p-4"
    >
      <h2 className="text-lg font-semibold">Add an expense</h2>

      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <input
          id="description"
          value={description}
          maxLength={255}
          onChange={(e) => {
            edited();
            setDescription(e.target.value);
          }}
          className={`w-full ${inputClass}`}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="amount" className="block text-sm font-medium">
          Amount (THB)
        </label>
        <input
          id="amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amountText}
          onChange={(e) => {
            edited();
            setAmountText(e.target.value);
          }}
          aria-invalid={preview.amountError !== null}
          className={`w-full ${inputClass}`}
        />
        {preview.amountError && (
          <p className="text-sm text-red-400">{preview.amountError}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="paid-by" className="block text-sm font-medium">
          Paid by
        </label>
        <select
          id="paid-by"
          value={paidBy}
          onChange={(e) => {
            edited();
            setPaidBy(e.target.value);
          }}
          className={`w-full ${inputClass}`}
        >
          {members.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Split</legend>
        <div className="flex gap-4">
          {(["equal", "exact"] as const).map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="split-mode"
                value={value}
                checked={mode === value}
                onChange={() => {
                  edited();
                  setMode(value);
                }}
              />
              {value === "equal" ? "Equally" : "Exact amounts"}
            </label>
          ))}
        </div>
      </fieldset>

      <ul className="space-y-2" aria-label="Share of each member">
        {members.map((name) => {
          const row = preview.rows.find((r) => r.username === name);
          if (mode === "equal") {
            return (
              <li key={name} className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(name)}
                    onChange={() => toggle(name)}
                  />
                  {name}
                </label>
                <span className="tabular-nums">
                  {row && row.satang !== null ? formatMoney(row.satang) : "-"}
                </span>
              </li>
            );
          }
          return (
            <li key={name} className="space-y-1">
              <label className="flex items-center justify-between gap-3">
                <span>{name}</span>
                <input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={exactTexts[name] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    edited();
                    setExactTexts((current) => ({ ...current, [name]: value }));
                  }}
                  aria-invalid={Boolean(row?.error)}
                  className={`w-40 text-right ${inputClass}`}
                />
              </label>
              {row?.error && (
                <p className="text-right text-sm text-red-400">{row.error}</p>
              )}
            </li>
          );
        })}
      </ul>

      {mode === "exact" && preview.unallocated !== null && (
        <p className="font-medium">
          Unallocated: {formatMoney(preview.unallocated)}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded border border-red-400 bg-red-50 p-3 text-red-800"
        >
          {error}
        </p>
      )}

      {hint && <p className="text-sm text-gray-400">{hint}</p>}

      <button
        type="submit"
        disabled={!ready}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Saving…" : "Add expense"}
      </button>
    </form>
  );
}