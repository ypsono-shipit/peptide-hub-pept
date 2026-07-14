import { PositionsTable, type Position } from "@/components/PositionsTable";

const MOCK_POSITIONS: Position[] = [];
const PAPER_STARTING_BALANCE = 10_000;

export default function PortfolioPage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Portfolio</h1>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-panel p-4">
          <div className="text-xs text-text-secondary">Paper Balance</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            ${PAPER_STARTING_BALANCE.toLocaleString()}
          </div>
        </div>
        <div className="rounded-md border border-border bg-panel p-4">
          <div className="text-xs text-text-secondary">Staked $PEPT</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">0</div>
        </div>
        <div className="rounded-md border border-border bg-panel p-4">
          <div className="text-xs text-text-secondary">Bonded Stock Tokens</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">$0</div>
        </div>
      </div>
      <PositionsTable positions={MOCK_POSITIONS} />
    </div>
  );
}
