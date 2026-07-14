export type Position = {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  funding: number;
};

export function PositionsTable({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div className="border-t border-border bg-panel px-4 py-6 text-center text-sm text-text-secondary">
        No open positions. Paper trades will appear here.
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-panel">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-secondary">
            <th className="px-4 py-2 font-medium">Market</th>
            <th className="px-4 py-2 font-medium">Side</th>
            <th className="px-4 py-2 font-medium">Size</th>
            <th className="px-4 py-2 font-medium">Entry</th>
            <th className="px-4 py-2 font-medium">Mark</th>
            <th className="px-4 py-2 font-medium">Funding</th>
            <th className="px-4 py-2 font-medium">PnL</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="px-4 py-2 font-medium">{p.symbol}</td>
              <td className={`px-4 py-2 ${p.side === "long" ? "text-long" : "text-short"}`}>
                {p.side.toUpperCase()}
              </td>
              <td className="px-4 py-2 tabular-nums">${p.size.toLocaleString()}</td>
              <td className="px-4 py-2 tabular-nums">${p.entryPrice.toFixed(2)}</td>
              <td className="px-4 py-2 tabular-nums">${p.markPrice.toFixed(2)}</td>
              <td className="px-4 py-2 tabular-nums text-text-secondary">${p.funding.toFixed(2)}</td>
              <td className={`px-4 py-2 tabular-nums ${p.pnl >= 0 ? "text-long" : "text-short"}`}>
                {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-right">
                <button className="rounded bg-surface px-2 py-1 text-xs hover:bg-border">Close</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
