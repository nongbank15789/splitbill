import type { Balances } from "@/lib/api";
import { formatMoney, satangFromApi } from "@/lib/money";

export default function BalanceList({ balances }: { balances: Balances }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Balances</h2>
      <ul className="space-y-1">
        {balances.balances.map((entry) => {
          const satang = satangFromApi(entry.balance);
          // Meaning is in the words and the sign, not only in the colour.
          const [text, color] =
            satang > 0
              ? [`is owed +${formatMoney(satang)}`, "text-green-400"]
              : satang < 0
                ? [`owes ${formatMoney(-satang)}`, "text-red-400"]
                : ["is settled up", "text-gray-400"];
          return (
            <li
              key={entry.username}
              className="flex items-center justify-between gap-3 rounded border border-gray-600 p-2"
            >
              <span className="font-medium">{entry.username}</span>
              <span className={`tabular-nums ${color}`}>{text}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-gray-400">
        Total of all balances: {formatMoney(satangFromApi(balances.total))}
      </p>
    </section>
  );
}