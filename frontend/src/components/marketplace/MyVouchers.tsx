"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PEPTIDES } from "@/lib/marketplaceData";
import { productIdBytes } from "@/components/marketplace/BuyWithUsdc";
import { useAppContracts, useNetworkConfig } from "@/lib/useAppContracts";
import { cn } from "@/lib/cn";

const PRODUCT_BY_ID = Object.fromEntries(
  PEPTIDES.map((p) => [productIdBytes(p.id).toLowerCase(), p]),
);

type MyVouchersProps = {
  /** Card title */
  title?: string;
  /** Supporting line under the title */
  description?: string;
  /** Taller scroll area on portfolio */
  compact?: boolean;
};

/** List recent voucher token IDs owned by the connected wallet (scan minted range). */
export function MyVouchers({
  title = "My kit vouchers",
  description = "NFT receipts for on-chain purchases · redeem later for the physical kit",
  compact = true,
}: MyVouchersProps = {}) {
  const { address, isConnected } = useAccount();
  const { peptideVoucher } = useAppContracts();
  const network = useNetworkConfig();
  const live = network.contractsLive;

  const totalMinted = useReadContract({
    ...peptideVoucher,
    functionName: "totalMinted",
    query: { enabled: live },
  });
  const balance = useReadContract({
    ...peptideVoucher,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && live },
  });

  const total = Number((totalMinted.data as bigint | undefined) ?? 0n);
  // Scan last 128 token ids for ownership (fine for testnet demo scale)
  const scanFrom = Math.max(1, total - 127);
  const tokenIds = useMemo(() => {
    const ids: number[] = [];
    for (let i = scanFrom; i <= total; i++) ids.push(i);
    return ids;
  }, [scanFrom, total]);

  if (!isConnected) {
    return (
      <GlassCard className="p-4">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-xs text-ink-soft">Connect wallet to see redeemable peptide NFTs.</p>
      </GlassCard>
    );
  }

  const bal = Number((balance.data as bigint | undefined) ?? 0n);

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-[11px] text-ink-soft">{description}</p>
        </div>
        <span className="rounded-full border border-border-strong px-2 py-0.5 font-mono text-[10px] text-ink">
          {bal} owned
        </span>
      </div>

      {!live ? (
        <p className="text-xs text-muted">Mainnet voucher contracts pending deploy. Switch to Testnet.</p>
      ) : total === 0 ? (
        <p className="text-xs text-muted">No vouchers minted yet. Buy a kit to receive PEPT-KIT.</p>
      ) : bal === 0 ? (
        <p className="text-xs text-muted">
          You don&apos;t hold any kit vouchers yet.{" "}
          <a href="/marketplace" className="text-ink underline underline-offset-2">
            Browse marketplace
          </a>
        </p>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-2 overflow-y-auto",
            compact ? "max-h-64" : "max-h-[28rem]",
          )}
        >
          {tokenIds.map((id) => (
            <VoucherRow key={id} tokenId={id} owner={address!} voucher={peptideVoucher} />
          ))}
        </div>
      )}

      {live && (
        <a
          href={`${network.explorer}/token/${peptideVoucher.address}?a=${address}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-center text-[10px] text-muted underline"
        >
          View PEPT-KIT NFTs on explorer ↗
        </a>
      )}
    </GlassCard>
  );
}

function VoucherRow({
  tokenId,
  owner,
  voucher,
}: {
  tokenId: number;
  owner: `0x${string}`;
  voucher: { address: `0x${string}`; abi: readonly unknown[] | object };
}) {
  const ownerOf = useReadContract({
    ...voucher,
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
  } as Parameters<typeof useReadContract>[0]);
  const data = useReadContract({
    ...voucher,
    functionName: "vouchers",
    args: [BigInt(tokenId)],
  } as Parameters<typeof useReadContract>[0]);
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      data.refetch();
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const isOwner =
    typeof ownerOf.data === "string" && ownerOf.data.toLowerCase() === owner.toLowerCase();
  if (!isOwner) return null;

  // vouchers(tokenId) returns (productId, purchasedAt, redeemed)
  const tuple = data.data as [string, bigint, boolean] | undefined;
  const productId = tuple?.[0]?.toLowerCase() ?? "";
  const redeemed = Boolean(tuple?.[2]);
  const peptide = PRODUCT_BY_ID[productId];
  const name = peptide?.name ?? `Product ${productId.slice(0, 10)}…`;

  const purchasedAt = tuple?.[1] ? Number(tuple[1]) * 1000 : 0;
  const purchasedLabel = purchasedAt
    ? new Date(purchasedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2.5">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-strong bg-panel">
        {peptide?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={peptide.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-mono text-[10px] text-ink">#{tokenId}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-ink">{name}</div>
        <div className="text-[10px] text-muted">
          PEPT-KIT #{tokenId}
          {purchasedLabel ? ` · ${purchasedLabel}` : ""}
          {" · "}
          {redeemed ? "Redeemed" : "Unredeemed claim"}
        </div>
        {peptide?.kitLabel && (
          <div className="mt-0.5 text-[10px] text-ink-soft">{peptide.kitLabel}</div>
        )}
      </div>
      <button
        type="button"
        disabled={redeemed || isPending || confirming}
        onClick={() =>
          writeContract({
            address: voucher.address,
            abi: voucher.abi as never,
            functionName: "redeem",
            args: [BigInt(tokenId)],
          })
        }
        className={cn(
          "shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold",
          redeemed
            ? "bg-panel text-muted"
            : "bg-primary text-on-primary hover:bg-accent disabled:opacity-50",
        )}
        title={
          redeemed
            ? "Already redeemed"
            : "Mark as redeemed (demo; physical fulfillment not yet live)"
        }
      >
        {redeemed ? "Redeemed" : isPending || confirming ? "…" : "Redeem"}
      </button>
    </div>
  );
}
