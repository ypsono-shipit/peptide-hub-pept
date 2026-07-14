"use client";

import { useState } from "react";

const WHITELISTED_BOND_ASSETS = ["LLY", "TSHA", "USDC"];

export default function StakePage() {
  const [tab, setTab] = useState<"stake" | "bond">("stake");

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Stake & Bond</h1>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-md bg-panel p-1">
        <button
          onClick={() => setTab("stake")}
          className={`rounded py-2 text-sm font-semibold ${tab === "stake" ? "bg-surface" : "text-text-secondary"}`}
        >
          Stake $PEPT
        </button>
        <button
          onClick={() => setTab("bond")}
          className={`rounded py-2 text-sm font-semibold ${tab === "bond" ? "bg-surface" : "text-text-secondary"}`}
        >
          Bond
        </button>
      </div>

      {tab === "stake" ? (
        <div className="space-y-4 rounded-md border border-border bg-panel p-4">
          <p className="text-sm text-text-secondary">
            Earn real yield from perps trading fees and Treasury returns. No lockup.
          </p>
          <input
            placeholder="Amount of PEPT"
            className="w-full rounded-md bg-surface px-3 py-2 text-sm outline-none"
          />
          <button className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-surface">
            Stake
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-md border border-border bg-panel p-4">
          <p className="text-sm text-text-secondary">
            Deposit whitelisted Robinhood Chain Stock Tokens or stables to receive discounted $PEPT,
            vesting linearly to the Treasury.
          </p>
          <select className="w-full rounded-md bg-surface px-3 py-2 text-sm outline-none">
            {WHITELISTED_BOND_ASSETS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <input
            placeholder="Amount"
            className="w-full rounded-md bg-surface px-3 py-2 text-sm outline-none"
          />
          <button className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-surface">
            Bond
          </button>
        </div>
      )}
    </div>
  );
}
