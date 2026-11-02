"use client";

import { useRef, useState } from "react";

import BalanceList from "@/components/BalanceList";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import {
  USERS,
  deleteExpense,
  getBalances,
  getGroup,
  listExpenses,
  listGroups,
  type Balances,
  type Expense,
  type Group,
  type GroupDetail,
} from "@/lib/api";
import { errorMessage } from "@/lib/errors";

export default function Home() {
  const [user, setUser] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Only the newest request may update the screen (guards against slow replies).
  const latest = useRef(0);

  function clearGroup() {
    setGroup(null);
    setExpenses([]);
    setBalances(null);
  }

  async function chooseUser(next: string) {
    const ticket = ++latest.current;
    setUser(next);
    setGroups([]);
    clearGroup();
    setError(null);
    setNotice(null);
    setLoading(false);
    if (!next) return;

    setLoading(true);
    try {
      const result = await listGroups(next);
      if (ticket === latest.current) setGroups(result);
    } catch (e) {
      if (ticket === latest.current) setError(errorMessage(e));
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }

  async function chooseGroup(groupId: number) {
    const ticket = ++latest.current;
    clearGroup();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const [detail, list, summary] = await Promise.all([
        getGroup(user, groupId),
        listExpenses(user, groupId),
        getBalances(user, groupId),
      ]);
      if (ticket === latest.current) {
        setGroup(detail);
        setExpenses(list);
        setBalances(summary);
      }
    } catch (e) {
      if (ticket === latest.current) setError(errorMessage(e));
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }

  /** Reload the expense list and the balances of the open group. */
  async function refresh() {
    if (!group) return;
    const ticket = ++latest.current;
    try {
      const [list, summary] = await Promise.all([
        listExpenses(user, group.id),
        getBalances(user, group.id),
      ]);
      if (ticket === latest.current) {
        setExpenses(list);
        setBalances(summary);
      }
    } catch (e) {
      if (ticket === latest.current) setError(errorMessage(e));
    }
  }

  async function afterCreate() {
    setError(null);
    setNotice("Expense added");
    await refresh();
  }

  async function removeExpense(expenseId: number) {
    if (!group) return;
    setError(null);
    setNotice(null);
    try {
      await deleteExpense(user, group.id, expenseId);
      setNotice("Expense deleted");
    } catch (e) {
      setError(errorMessage(e));
    }
    await refresh();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">SplitBill</h1>

      <section className="space-y-2">
        <label htmlFor="user" className="block text-sm font-medium">
          Who are you?
        </label>
        <select
          id="user"
          value={user}
          onChange={(e) => chooseUser(e.target.value)}
          className="w-full rounded border border-gray-400 bg-white p-2 text-black"
        >
          <option value="">Choose a user</option>
          {USERS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-400 bg-red-50 p-3 text-red-800"
        >
          {error}
        </p>
      )}

      {user && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Your groups</h2>
          {loading && groups.length === 0 && <p>Loading…</p>}
          {!loading && !error && groups.length === 0 && (
            <p>You are not in any group yet.</p>
          )}
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => chooseGroup(g.id)}
                  aria-pressed={group?.id === g.id}
                  className={`w-full rounded border p-3 text-left ${
                    group?.id === g.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-400"
                  }`}
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {group && (
        <>
          <section className="space-y-1">
            <h2 className="text-lg font-semibold">{group.name}</h2>
            <p>Members: {group.members.map((m) => m.username).join(", ")}</p>
          </section>

          {notice && (
            <p
              role="status"
              className="rounded border border-green-600 bg-green-50 p-3 text-green-800"
            >
              {notice}
            </p>
          )}

          {balances && <BalanceList balances={balances} />}

          <ExpenseForm
            key={`${user}-${group.id}`}
            user={user}
            group={group}
            onCreated={afterCreate}
          />

          <ExpenseList
            expenses={expenses}
            user={user}
            onDelete={removeExpense}
          />
        </>
      )}
    </main>
  );
}