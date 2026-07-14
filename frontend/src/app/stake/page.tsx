"use client";

import { useState } from "react";
import { StakePanel } from "@/components/StakePanel";
import { TESTNET_CONTRACTS } from "@/lib/deployments";
import { cn } from "@/lib/cn";

export default function StakePage() {
  const [tab, setTab] = useState<"stake" | "bond">("stake");

  return (
    <div className="mx-auto max-w-2xl p-2">
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-ink">Stake & Bond</h1>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-white/30 p-1">
        <button
          onClick={() => setTab("stake")}
          className={cn("rounded-xl py-2 text-sm font-semibold", tab === "stake" ? "bg-white/50 text-ink" : "text-ink-soft")}
        >
          Stake $PEPT
        </button>
        <button
          onClick={() => setTab("bond")}
          className={cn("rounded-xl py-2 text-sm font-semibold", tab === "bond" ? "bg-white/50 text-ink" : "text-ink-soft")}
        >
          Bond
        </button>
      </div>

      {tab === "stake" ? (
        <StakePanel />
      ) : (
        <div className="glass-panel space-y-4 p-5">
          <p className="text-sm text-ink-soft">
            Deposit whitelisted Robinhood Chain Stock Tokens or stables to receive discounted $PEPT,
            vesting linearly to the Treasury.
          </p>
          <div className="rounded-2xl bg-white/30 p-3 text-xs text-ink-soft">
            No bond markets are configured yet on testnet — <code>BondDepository</code> is deployed
            at{" "}
            <a
              href={`https://explorer.testnet.chain.robinhood.com/address/${TESTNET_CONTRACTS.BondDepository}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {TESTNET_CONTRACTS.BondDepository}
            </a>{" "}
            but needs a whitelisted reserve token before a market can be opened. Robinhood Chain
            has no biotech Stock Tokens yet, so nothing real to whitelist for now.
          </div>
        </div>
      )}
    </div>
  );
}
