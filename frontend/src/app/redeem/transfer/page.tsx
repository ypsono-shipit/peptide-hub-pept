"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useConnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/cn";
import { useOraclePrice } from "@/lib/useOraclePrice";
import { useNetworkConfig } from "@/lib/useAppContracts";
import { SPOT_MAINNET, SPOT_TESTNET, MONTHLY_KIT_CAP } from "@/lib/spot";
import { MOCK_MARKETS } from "@/lib/markets";
import {
  kitsToSema,
  MAX_KITS,
  MIN_KITS,
  SEMA_PER_KIT,
  VIALS_PER_KIT,
} from "@/lib/redeem/constants";
import { ERC20_ABI } from "@/lib/uniswap-v2";
import { saveRedeemSession } from "@/lib/redeem/session";

const ZERO = "0x0000000000000000000000000000000000000000";

export default function RedeemTransferPage() {
  const router = useRouter();
  const network = useNetworkConfig();
  const pair = network.testnet ? SPOT_TESTNET : SPOT_MAINNET;
  const seMarket = MOCK_MARKETS.find((m) => m.symbol === "SEMA-PERP")!;
  const { price: oraclePrice, isLive } = useOraclePrice(pair.oracleKey, seMarket.price);
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  const [kits, setKits] = useState(String(MIN_KITS));
  const kitsN = Math.max(MIN_KITS, Math.floor(Number(kits) || 0));
  const seMa = kitsToSema(kitsN);
  const seMaWei = parseUnits(String(seMa), pair.baseDecimals);

  const tokenLive = pair.baseToken !== ZERO;

  const { data: balance } = useReadContract({
    address: pair.baseToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: tokenLive && !!address },
  });

  const balHuman =
    balance !== undefined ? Number(formatUnits(balance as bigint, pair.baseDecimals)) : null;
  const enough = balHuman != null && balHuman + 1e-9 >= seMa;

  const { writeContract, data: txHash, isPending, error: writeErr } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess || !txHash || !address) return;
    try {
      saveRedeemSession({
        kind: "sema",
        txHash,
        wallet: address,
        kits: kitsN,
        seMa,
        treasury: pair.redeemTreasury,
        token: pair.baseToken,
        at: Date.now(),
      });
    } catch {
      /* ignore */
    }
    router.push(
      `/redeem/shipping?tx=${txHash}&kits=${kitsN}&wallet=${address}`,
    );
  }, [isSuccess, txHash, address, kitsN, seMa, pair, router]);

  const monthlyNote = useMemo(
    () => `Soft cap ${MONTHLY_KIT_CAP} kits / wallet / calendar month (ops-enforced).`,
    [],
  );

  function onTransfer() {
    if (!address || !tokenLive || !enough) return;
    if (kitsN > MAX_KITS || kitsN > MONTHLY_KIT_CAP) return;
    writeContract({
      address: pair.baseToken,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [pair.redeemTreasury, seMaWei],
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar
        market={{
          symbol: "SEND",
          name: "Transfer SEMA",
          price: oraclePrice,
          change24h: 0,
          volume24h: 0,
          unit: "$/mg",
          oracleKey: pair.oracleKey,
        }}
        price={oraclePrice}
        isLive={isLive}
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="mx-auto max-w-lg space-y-4">
          <Link
            href="/redeem"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
          >
            <ArrowLeft size={12} /> Redeem overview
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Step 1 · Send SEMA
          </h1>
          <p className="text-sm text-ink-soft">
            Sign a transfer of{" "}
            <strong className="text-ink">{SEMA_PER_KIT} SEMA per kit</strong> to the PEPT
            treasury wallet. After the tx confirms, you&apos;ll enter shipping details.
          </p>

          <div className="rounded-2xl border border-border bg-panel p-5 space-y-4">
            <div className="rounded-lg border border-border bg-bg px-3 py-2 text-xs">
              <div className="text-muted">Your SEMA balance</div>
              <div className="mt-0.5 font-mono text-lg font-semibold text-ink">
                {!tokenLive
                  ? "Token not deployed"
                  : balHuman == null
                    ? "—"
                    : balHuman.toFixed(4)}
              </div>
            </div>

            <label className="block">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Kits ({SEMA_PER_KIT} SEMA · {VIALS_PER_KIT} vials each)
              </div>
              <input
                type="number"
                min={MIN_KITS}
                max={Math.min(MAX_KITS, MONTHLY_KIT_CAP)}
                step={1}
                value={kits}
                onChange={(e) => setKits(e.target.value)}
                className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2 font-mono text-sm text-ink outline-none focus:border-green"
              />
              <p className="mt-1 text-[10px] text-muted">
                You will send{" "}
                <span className="font-mono text-ink">{seMa} SEMA</span> → treasury{" "}
                <span className="font-mono text-[9px] text-faint">
                  {pair.redeemTreasury.slice(0, 10)}…
                </span>
              </p>
              <p className="mt-1 text-[10px] text-muted">{monthlyNote}</p>
            </label>

            {!isConnected ? (
              <button
                type="button"
                className="btn-green w-full py-2.5 text-sm"
                onClick={() => {
                  const c = connectors[0];
                  if (c) connect({ connector: c });
                }}
              >
                Connect wallet
              </button>
            ) : !tokenLive ? (
              <div className="rounded-lg border border-border-strong bg-bg px-3 py-3 text-center text-xs text-muted">
                SEMA not deployed on this network yet. Run deploy-sema-spot on mainnet first.
              </div>
            ) : (
              <button
                type="button"
                disabled={!enough || isPending || confirming || kitsN < MIN_KITS}
                onClick={onTransfer}
                className={cn(
                  "btn-green flex w-full items-center justify-center gap-2 py-2.5 text-sm",
                  (!enough || isPending || confirming) && "opacity-50",
                )}
              >
                {isPending || confirming
                  ? "Confirm in wallet…"
                  : !enough
                    ? "Insufficient SEMA"
                    : `Transfer ${seMa} SEMA`}
                <ArrowRight size={14} />
              </button>
            )}

            {writeErr && (
              <p className="text-xs text-negative">
                {writeErr.message?.slice(0, 160) || "Transaction failed"}
              </p>
            )}

            {txHash && (
              <a
                href={`${network.explorer}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-[10px] text-green-soft hover:underline"
              >
                Tx: {txHash.slice(0, 14)}…
              </a>
            )}
          </div>

          <p className="text-[10px] leading-relaxed text-muted">
            Research use only. Transfer is irreversible once confirmed. Shipping form is step 2
            after this tx lands.
          </p>
        </div>
      </div>
    </div>
  );
}
