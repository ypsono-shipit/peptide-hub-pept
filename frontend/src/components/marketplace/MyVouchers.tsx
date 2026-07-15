"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { peptideVoucherContract } from "@/lib/contracts";
import { PEPTIDES } from "@/lib/marketplaceData";
import { productIdBytes } from "@/components/marketplace/BuyWithUsdc";
import { TESTNET_CONTRACTS } from "@/lib/deployments";
import { cn } from "@/lib/cn";

const PRODUCT_BY_ID = Object.fromEntries(
  PEPTIDES.map((p) => [productIdBytes(p.id).toLowerCase(), p]),
);

/** List recent voucher token IDs owned by the connected wallet (scan minted range). */
export function MyVouchers() {
  const { address, isConnected } = useAccount();

  const totalMinted = useReadContract({
    ...peptideVoucherContract,
    functionName: "totalMinted",
  });
  const balance = useReadContract({
    ...peptideVoucherContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const total = Number((totalMinted.data as bigint | undefined) ?? 0n);
  // Scan last 64 token ids for ownership (fine for testnet demo scale)
  const scanFrom = Math.max(1, total - 63);
  const tokenIds = useMemo(() => {
    const ids: number[] = [];
    for (let i = scanFrom; i <= total; i++) ids.push(i);
    return ids;
  }, [scanFrom, total]);

  if (!isConnected) {
    return (
      <GlassCard className="p-4">
        <h3 className="text-sm font-semibold text-ink">My kit vouchers</h3>
        <p className="mt-1 text-xs text-ink-soft">Connect wallet to see redeemable peptide NFTs.</p>
      </GlassCard>
    );
  }

  const bal = Number((balance.data as bigint | undefined) ?? 0n);

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">My kit vouchers</h3>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            NFT receipts for on-chain purchases · redeem later for the physical kit
          </p>
        </div>
        <span className="rounded-full border border-border-strong px-2 py-0.5 font-mono text-[10px] text-ink">
          {bal} owned
        </span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted">No vouchers minted yet. Buy a kit to receive PEPT-KIT.</p>
      ) : bal === 0 ? (
        <p className="text-xs text-muted">You don&apos;t hold any kit vouchers yet.</p>
      ) : (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {tokenIds.map((id) => (
            <VoucherRow key={id} tokenId={id} owner={address!} />
          ))}
        </div>
      )}

      <a
        href={`https://explorer.testnet.chain.robinhood.com/token/${TESTNET_CONTRACTS.PeptideVoucher}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block text-center text-[10px] text-muted underline"
      >
        PeptideVoucher contract ↗
      </a>
    </GlassCard>
  );
}

function VoucherRow({ tokenId, owner }: { tokenId: number; owner: `0x${string}` }) {
  const ownerOf = useReadContract({
    ...peptideVoucherContract,
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
  });
  const data = useReadContract({
    ...peptideVoucherContract,
    functionName: "vouchers",
    args: [BigInt(tokenId)],
  });
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

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-panel font-mono text-[10px] text-ink">
        #{tokenId}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-ink">{name}</div>
        <div className="text-[10px] text-muted">
          PEPT-KIT · {redeemed ? "Redeemed" : "Unredeemed claim"}
        </div>
      </div>
      <button
        type="button"
        disabled={redeemed || isPending || confirming}
        onClick={() =>
          writeContract({
            ...peptideVoucherContract,
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
            : "Mark as redeemed (demo — physical fulfillment not yet live)"
        }
      >
        {redeemed ? "Redeemed" : isPending || confirming ? "…" : "Redeem"}
      </button>
    </div>
  );
}
