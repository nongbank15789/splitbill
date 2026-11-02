"use client";

import { useState } from "react";

import type { Expense } from "@/lib/api";
import { formatMoney, satangFromApi } from "@/lib/money";

type Props = {
  expenses: Expense[];
  user: string;
  onDelete: (expenseId: number) => Promise<void>;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export default function ExpenseList({ expenses, user, onDelete }: Props) {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function remove(expenseId: number) {
    setBusyId(expenseId);
    try {
      await onDelete(expenseId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Expenses</h2>
      {expenses.length === 0 && <p>No expenses yet.</p>}
      <ul className="space-y-3">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="space-y-2 rounded border border-gray-600 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{expense.description}</p>
                <p className="text-sm text-gray-400">
                  Paid by {expense.paid_by} on{" "}
                  {dateFormat.format(new Date(expense.created_at))}
                </p>
              </div>
              <p className="font-semibold tabular-nums">
                {formatMoney(satangFromApi(expense.amount))}
              </p>
            </div>

            <ul className="text-sm text-gray-300">
              {expense.shares.map((share) => (
                <li key={share.username} className="flex justify-between">
                  <span>{share.username}</span>
                  <span className="tabular-nums">
                    {formatMoney(satangFromApi(share.amount))}
                  </span>
                </li>
              ))}
            </ul>

            {expense.paid_by === user && (
              <button
                type="button"
                onClick={() => remove(expense.id)}
                disabled={busyId === expense.id}
                className="rounded border border-red-400 px-3 py-1 text-sm text-red-400 disabled:opacity-40"
              >
                {busyId === expense.id ? "Deleting…" : "Delete"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}