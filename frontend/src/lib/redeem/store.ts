/**
 * Redemption orders → Google Sheets (same webhook pattern as waitlist).
 * Apps Script routes type:"redeem" to a Redemptions tab + sends confirmation email.
 */

import { kitsToSema, MAX_KITS, MIN_KITS, SEMA_PER_KIT, VIALS_PER_KIT } from "./constants";

export type RedeemOrderInput = {
  email: string;
  wallet: string;
  kits: number;
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
};

export type RedeemResult =
  | { ok: true; orderId: string; kits: number; seMaRequired: number; already?: boolean }
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

/** Same 302→GET dance as waitlist Apps Script web apps. */
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

  const kits = Math.floor(Number(input.kits));
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

  const seMaRequired = kitsToSema(kits);
  const orderId = `RDM-${Date.now().toString(36).toUpperCase()}-${wallet.slice(2, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();

  const payload = {
    type: "redeem",
    action: "redeem",
    order_id: orderId,
    email,
    wallet,
    kits,
    vials: kits * VIALS_PER_KIT,
    sema_required: seMaRequired,
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
      already: Boolean(data.already),
    };
  } catch (e) {
    console.warn("[redeem] sheets failed", e);
    return { ok: false, error: "Could not reach order spreadsheet.", status: 502 };
  }
}
