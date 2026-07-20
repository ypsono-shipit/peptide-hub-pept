/**
 * Redemption orders → Google Sheets (same webhook pattern as waitlist).
 * Supports SEMA token kits and PEPT-KIT NFT vouchers.
 */

import { kitsToSema, MAX_KITS, MIN_KITS, SEMA_PER_KIT, VIALS_PER_KIT } from "./constants";

export type RedeemOrderInput = {
  email: string;
  wallet: string;
  fullName: string;
  institution?: string;
  address1: string;
  address2?: string;
  city: string;
  stateRegion?: string;
  postalCode: string;
  country: string;
  phone?: string;
  notes?: string;
  researchConfirm: boolean;
  /** On-chain tx (SEMA transfer or NFT redeem) before shipping form */
  transferTxHash?: string;
  kind?: "sema" | "nft";
  /** SEMA path */
  kits?: number;
  /** NFT path */
  tokenId?: number;
  productId?: string;
  productName?: string;
  kitLabel?: string;
};

export type RedeemResult =
  | {
      ok: true;
      orderId: string;
      kits: number;
      seMaRequired: number;
      kind: "sema" | "nft";
      already?: boolean;
    }
  | { ok: false; error: string; status?: number };

function sheetsUrl() {
  return (
    process.env.GOOGLE_SHEETS_REDEEM_URL?.trim() ||
    process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() ||
    ""
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function postAppsScript(url: string, body: unknown): Promise<Response> {
  const payload = JSON.stringify(body);
  const post = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: payload,
    redirect: "manual",
  });

  if (post.status >= 200 && post.status < 300) return post;

  if (post.status >= 300 && post.status < 400) {
    const loc = post.headers.get("location");
    if (loc) {
      const next = new URL(loc, url).toString();
      return fetch(next, { method: "GET", redirect: "follow", cache: "no-store" });
    }
  }
  return post;
}

export async function submitRedeemOrder(input: RedeemOrderInput): Promise<RedeemResult> {
  const email = normalizeEmail(input.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address.", status: 400 };
  }

  const wallet = (input.wallet || "").trim();
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return { ok: false, error: "Connect a valid EVM wallet address.", status: 400 };
  }

  const kind = input.kind === "nft" ? "nft" : "sema";

  let kits = Math.floor(Number(input.kits ?? 1));
  let seMaRequired = 0;
  let vials = 0;
  let tokenId: number | null = null;
  let productName = "";

  if (kind === "nft") {
    tokenId = Math.floor(Number(input.tokenId));
    if (!Number.isFinite(tokenId) || tokenId < 1) {
      return { ok: false, error: "Valid PEPT-KIT token id required.", status: 400 };
    }
    kits = 1;
    vials = VIALS_PER_KIT; // Research Only kit pack size default
    seMaRequired = 0;
    productName = (input.productName || `PEPT-KIT #${tokenId}`).trim();
  } else {
    if (!Number.isFinite(kits) || kits < MIN_KITS) {
      return {
        ok: false,
        error: `Minimum ${MIN_KITS} kit (${SEMA_PER_KIT} SEMA / ${VIALS_PER_KIT} vials).`,
        status: 400,
      };
    }
    if (kits > MAX_KITS) {
      return { ok: false, error: `Maximum ${MAX_KITS} kits per request for now.`, status: 400 };
    }
    seMaRequired = kitsToSema(kits);
    vials = kits * VIALS_PER_KIT;
    productName = "SEMA research kit";
  }

  const fullName = (input.fullName || "").trim();
  const address1 = (input.address1 || "").trim();
  const city = (input.city || "").trim();
  const postalCode = (input.postalCode || "").trim();
  const country = (input.country || "").trim();

  if (!fullName || !address1 || !city || !postalCode || !country) {
    return { ok: false, error: "Complete all required shipping fields.", status: 400 };
  }

  if (!input.researchConfirm) {
    return {
      ok: false,
      error: "You must confirm research-only use to request redemption.",
      status: 400,
    };
  }

  const transferTx = (input.transferTxHash || "").trim();
  if (!transferTx || !/^0x[a-fA-F0-9]{64}$/.test(transferTx)) {
    return {
      ok: false,
      error:
        kind === "nft"
          ? "On-chain NFT redeem transaction required before shipping."
          : "SEMA transfer transaction required before shipping.",
      status: 400,
    };
  }

  const orderId = `RDM-${kind.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${wallet.slice(2, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();

  const payload = {
    type: "redeem",
    action: "redeem",
    redeem_kind: kind,
    order_id: orderId,
    email,
    wallet,
    kits,
    vials,
    sema_required: seMaRequired,
    nft_token_id: tokenId,
    product_id: input.productId || null,
    product_name: productName,
    kit_label: input.kitLabel || null,
    full_name: fullName,
    institution: (input.institution || "").trim() || null,
    address1,
    address2: (input.address2 || "").trim() || null,
    city,
    state_region: (input.stateRegion || "").trim() || null,
    postal_code: postalCode,
    country,
    phone: (input.phone || "").trim() || null,
    notes: (input.notes || "").trim() || null,
    status: "pending_fulfillment",
    transfer_tx: transferTx,
    created_at: createdAt,
  };

  const base = sheetsUrl();
  if (!base) {
    console.warn("[redeem] No GOOGLE_SHEETS_WEBHOOK_URL — order not persisted:", orderId);
    return {
      ok: false,
      error: "Redemption backend not configured. Contact support.",
      status: 503,
    };
  }

  try {
    const res = await postAppsScript(base, payload);
    const text = await res.text();
    let data: {
      ok?: boolean;
      error?: string;
      orderId?: string;
      already?: boolean;
    } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.warn("[redeem] non-JSON sheets response", text.slice(0, 200));
      return { ok: false, error: "Could not save order (bad sheet response).", status: 502 };
    }

    if (!res.ok || data.ok === false) {
      return {
        ok: false,
        error: data.error || "Could not save redemption order.",
        status: 502,
      };
    }

    return {
      ok: true,
      orderId: data.orderId || orderId,
      kits,
      seMaRequired,
      kind,
      already: Boolean(data.already),
    };
  } catch (e) {
    console.warn("[redeem] sheets failed", e);
    return { ok: false, error: "Could not reach order spreadsheet.", status: 502 };
  }
}
