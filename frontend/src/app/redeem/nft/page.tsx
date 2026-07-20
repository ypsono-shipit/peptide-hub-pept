"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAccount,
  useConnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ArrowLeft, ArrowRight, Package } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/cn";
import { useAppContracts, useNetworkConfig } from "@/lib/useAppContracts";
import { PEPTIDES } from "@/lib/marketplaceData";
import { productIdBytes } from "@/components/marketplace/BuyWithUsdc";
import { saveRedeemSession } from "@/lib/redeem/session";

const PRODUCT_BY_ID = Object.fromEntries(
  PEPTIDES.map((p) => [productIdBytes(p.id).toLowerCase(), p]),
);

export default function RedeemNftPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted">Loading…</div>}>
      <RedeemNftInner />
    </Suspense>
  );
}

function RedeemNftInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenIdParam = searchParams.get("tokenId");
  const tokenId = tokenIdParam ? Number(tokenIdParam) : NaN;

  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { peptideVoucher } = useAppContracts();
  const network = useNetworkConfig();

  const ownerOf = useReadContract({
    ...peptideVoucher,
    functionName: "ownerOf",
    args: Number.isFinite(tokenId) ? [BigInt(tokenId)] : undefined,
    query: { enabled: network.contractsLive && Number.isFinite(tokenId) },
  });
  const voucherData = useReadContract({
    ...peptideVoucher,
    functionName: "vouchers",
    args: Number.isFinite(tokenId) ? [BigInt(tokenId)] : undefined,
    query: { enabled: network.contractsLive && Number.isFinite(tokenId) },
  });

  const { writeContract, data: txHash, isPending, error: writeErr } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const tuple = voucherData.data as [string, bigint, boolean] | undefined;
  const productId = tuple?.[0]?.toLowerCase() ?? "";
  const alreadyRedeemed = Boolean(tuple?.[2]);
  const peptide = PRODUCT_BY_ID[productId];
  const isOwner =
    typeof ownerOf.data === "string" &&
    address &&
    ownerOf.data.toLowerCase() === address.toLowerCase();

  useEffect(() => {
    if (!isSuccess || !txHash || !address || !Number.isFinite(tokenId)) return;
    saveRedeemSession({
      kind: "nft",
      txHash,
      wallet: address,
      tokenId,
      productId: peptide?.id,
      productName: peptide?.name ?? `PEPT-KIT #${tokenId}`,
      kitLabel: peptide?.kitLabel,
      at: Date.now(),
    });
    router.push(
      `/redeem/shipping?type=nft&tokenId=${tokenId}&tx=${txHash}&wallet=${address}`,
    );
  }, [isSuccess, txHash, address, tokenId, peptide, router]);

  function onRedeemOnChain() {
    if (!Number.isFinite(tokenId) || !isOwner || alreadyRedeemed) return;
    writeContract({
      address: peptideVoucher.address,
      abi: peptideVoucher.abi as never,
      functionName: "redeem",
      args: [BigInt(tokenId)],
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="mx-auto max-w-lg space-y-4">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
          >
            <ArrowLeft size={12} /> Portfolio / vouchers
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Step 1 · Redeem PEPT-KIT NFT
          </h1>
          <p className="text-sm text-ink-soft">
            Sign the on-chain redeem for your kit voucher. After the tx confirms, you&apos;ll enter
            shipping details and receive a confirmation email — same ops queue as SEMA kit
            redemptions.
          </p>

          <div className="rounded-2xl border border-border bg-panel p-5 space-y-4">
            {!Number.isFinite(tokenId) ? (
              <p className="text-sm text-muted">
                Missing token id. Open a voucher from{" "}
                <Link href="/portfolio" className="text-green-soft hover:underline">
                  Portfolio
                </Link>
                .
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-strong bg-panel">
                    {peptide?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={peptide.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package size={20} className="text-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {peptide?.name ?? `Kit #${tokenId}`}
                    </div>
                    <div className="text-[11px] text-muted">
                      PEPT-KIT #{tokenId}
                      {peptide?.kitLabel ? ` · ${peptide.kitLabel}` : ""}
                    </div>
                    {alreadyRedeemed && (
                      <div className="mt-1 text-[11px] text-amber-200">Already redeemed on-chain</div>
                    )}
                  </div>
                </div>

                <ol className="list-decimal space-y-1 pl-4 text-xs text-ink-soft">
                  <li>Sign <code className="text-ink">redeem(#{tokenId})</code> on PeptideVoucher</li>
                  <li>Fill shipping form (email confirmation)</li>
                  <li>We fulfill the Research Only kit from the ops sheet</li>
                </ol>

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
                ) : !network.contractsLive ? (
                  <p className="text-xs text-muted">Voucher contracts not live on this network.</p>
                ) : !isOwner ? (
                  <p className="text-xs text-muted">
                    Connected wallet is not the owner of PEPT-KIT #{tokenId}.
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={alreadyRedeemed || isPending || confirming}
                    onClick={onRedeemOnChain}
                    className={cn(
                      "btn-green flex w-full items-center justify-center gap-2 py-2.5 text-sm",
                      (alreadyRedeemed || isPending || confirming) && "opacity-50",
                    )}
                  >
                    {alreadyRedeemed
                      ? "Already redeemed"
                      : isPending || confirming
                        ? "Confirm in wallet…"
                        : `Redeem NFT #${tokenId} on-chain`}
                    <ArrowRight size={14} />
                  </button>
                )}

                {writeErr && (
                  <p className="text-xs text-negative">
                    {writeErr.message?.slice(0, 180) || "Transaction failed"}
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
              </>
            )}
          </div>

          <p className="text-[10px] leading-relaxed text-muted">
            Research use only. On-chain redeem marks the voucher; physical kit ships after we
            process your shipping form.
          </p>
        </div>
      </div>
    </div>
  );
}
