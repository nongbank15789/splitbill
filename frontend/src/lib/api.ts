import { friendlyMessage } from "./errors";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// The seeded users. The brief has no "list users" endpoint, so they are fixed here.
export const USERS = ["alice", "bob", "carol", "dan"] as const;

export type Member = { id: number; username: string };
export type Group = { id: number; name: string };
export type GroupDetail = Group & { members: Member[] };
export type Share = { username: string; amount: string };

export type Expense = {
  id: number;
  group_id: number;
  description: string;
  paid_by: string;
  amount: string;
  split_type: "equal" | "exact";
  created_at: string;
  shares: Share[];
};

export type Balance = { username: string; balance: string };
export type Balances = { group_id: number; balances: Balance[]; total: string };

export type ExpensePayload = {
  description: string;
  paid_by: string;
  amount: string;
  split:
    | { type: "equal"; members: string[] }
    | { type: "exact"; shares: Record<string, string> };
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  user: string,
  options: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { "X-User": user };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  if (!response.ok) {
    let message = "Something went wrong";
    let code: string | undefined;
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
      code = body?.error?.code;
    } catch {
      // the response had no JSON body; keep the generic message
    }
    throw new ApiError(friendlyMessage(message, code), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const listGroups = (user: string) => request<Group[]>("/groups", user);

export const getGroup = (user: string, groupId: number) =>
  request<GroupDetail>(`/groups/${groupId}`, user);

export const listExpenses = (user: string, groupId: number) =>
  request<Expense[]>(`/groups/${groupId}/expenses`, user);

export const getBalances = (user: string, groupId: number) =>
  request<Balances>(`/groups/${groupId}/balances`, user);

export const createExpense = (
  user: string,
  groupId: number,
  payload: ExpensePayload,
  idempotencyKey: string,
) =>
  request<Expense>(`/groups/${groupId}/expenses`, user, {
    method: "POST",
    body: payload,
    idempotencyKey,
  });

export const deleteExpense = (user: string, groupId: number, expenseId: number) =>
  request<void>(`/groups/${groupId}/expenses/${expenseId}`, user, {
    method: "DELETE",
  });