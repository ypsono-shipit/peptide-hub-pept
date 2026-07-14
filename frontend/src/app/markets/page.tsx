import Link from "next/link";
import { MOCK_MARKETS } from "@/lib/markets";

export default function MarketsPage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Markets</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-secondary">
            <th className="px-3 py-2 font-medium">Market</th>
            <th className="px-3 py-2 font-medium">Price</th>
            <th className="px-3 py-2 font-medium">24h Change</th>
            <th className="px-3 py-2 font-medium">24h Volume</th>
            <th className="px-3 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {MOCK_MARKETS.map((m) => (
            <tr key={m.symbol} className="border-b border-border/50">
              <td className="px-3 py-3">
                <div className="font-medium">{m.symbol}</div>
                <div className="text-xs text-text-secondary">{m.name}</div>
              </td>
              <td className="px-3 py-3 tabular-nums">${m.price.toFixed(2)}</td>
              <td className={`px-3 py-3 tabular-nums ${m.change24h >= 0 ? "text-long" : "text-short"}`}>
                {m.change24h >= 0 ? "+" : ""}
                {m.change24h.toFixed(1)}%
              </td>
              <td className="px-3 py-3 tabular-nums text-text-secondary">
                ${m.volume24h.toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right">
                <Link
                  href="/trade"
                  className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-surface"
                >
                  Trade
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
