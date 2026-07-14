import { MOCK_MARKETS } from "@/lib/markets";
import { MarketRow } from "@/components/MarketRow";
import { GlassCard } from "@/components/ui/GlassCard";

export default function MarketsPage() {
  return (
    <div className="p-2">
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-ink">Markets</h1>
      <GlassCard className="overflow-hidden p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-glass-border text-left text-xs text-ink-soft">
              <th className="px-3 py-2 font-medium">Market</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">24h Change</th>
              <th className="px-3 py-2 font-medium">24h Volume</th>
              <th className="px-3 py-2 font-medium"></th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {MOCK_MARKETS.map((m) => (
              <MarketRow key={m.symbol} market={m} />
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
