import { NextRequest, NextResponse } from "next/server";
import { submitRedeemOrder } from "@/lib/redeem/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      wallet?: string;
      kits?: number;
      fullName?: string;
      institution?: string;
      address1?: string;
      address2?: string;
      city?: string;
      stateRegion?: string;
      postalCode?: string;
      country?: string;
      phone?: string;
      notes?: string;
      researchConfirm?: boolean;
      transferTxHash?: string;
      kind?: "sema" | "nft";
      tokenId?: number;
      productId?: string;
      productName?: string;
      kitLabel?: string;
    };

    const result = await submitRedeemOrder({
      email: body.email || "",
      wallet: body.wallet || "",
      kits: body.kits != null ? Number(body.kits) : undefined,
      fullName: body.fullName || "",
      institution: body.institution,
      address1: body.address1 || "",
      address2: body.address2,
      city: body.city || "",
      stateRegion: body.stateRegion,
      postalCode: body.postalCode || "",
      country: body.country || "",
      phone: body.phone,
      notes: body.notes,
      researchConfirm: Boolean(body.researchConfirm),
      transferTxHash: body.transferTxHash,
      kind: body.kind,
      tokenId: body.tokenId != null ? Number(body.tokenId) : undefined,
      productId: body.productId,
      productName: body.productName,
      kitLabel: body.kitLabel,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      kits: result.kits,
      seMaRequired: result.seMaRequired,
      kind: result.kind,
      message:
        result.kind === "nft"
          ? "NFT kit redemption received. Check your email for confirmation. We will fulfill after verifying the on-chain redeem."
          : "Redemption request received. Check your email for confirmation. We will fulfill manually after verifying SEMA holdings.",
    });
  } catch (e) {
    console.error("[redeem] post", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
