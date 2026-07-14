"use client";

import { useState } from "react";
import { StakePanel } from "@/components/StakePanel";
import { TESTNET_CONTRACTS } from "@/lib/deployments";

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
        <StakePanel />
      ) : (
        <div className="space-y-4 rounded-md border border-border bg-panel p-4">
          <p className="text-sm text-text-secondary">
            Deposit whitelisted Robinhood Chain Stock Tokens or stables to receive discounted $PEPT,
            vesting linearly to the Treasury.
          </p>
          <div className="rounded-md bg-surface p-3 text-xs text-text-secondary">
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
            but needs a whitelisted reserve token (a real testnet Stock Token address) before a
            market can be opened.
          </div>
        </div>
      )}
    </div>
  );
}
