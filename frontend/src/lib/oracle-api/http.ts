import { NextRequest, NextResponse } from "next/server";
import { authenticateOracleRequest, type AuthOk } from "./auth";
import { trackRequest } from "./auth";
import { storeBackend } from "./store";
import { TIER_LIMITS } from "./tiers";

export const ORACLE_API_VERSION = "v1";

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Admin-Secret",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
  };
}

export function json(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: { ...corsHeaders(), ...(init?.headers ?? {}) },
  });
}

export function options() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/** Auth + rate limit + usage metering gate. */
export async function gate(
  req: NextRequest,
  route = "generic",
): Promise<{ ok: true; auth: AuthOk } | { ok: false; response: NextResponse }> {
  const auth = await authenticateOracleRequest(req);
  if (!auth.ok) return auth;
  await trackRequest(auth.keyId, route).catch(() => {});
  return { ok: true, auth };
}

export function withMeta<T extends Record<string, unknown>>(body: T, auth: AuthOk) {
  const limits = TIER_LIMITS[auth.tier];
  return {
    ...body,
    meta: {
      apiVersion: ORACLE_API_VERSION,
      provider: "PEPT Oracle",
      docs: "/docs/oracle",
      product: "/oracle",
      auth: {
        keyId: auth.keyId,
        tier: auth.tier,
        remainingRpm: auth.remainingRpm,
      },
      limits: {
        rpm: limits.rpm,
        daily: limits.daily,
        signedQuotes: limits.signedQuotes,
        webhooks: limits.webhooks,
      },
      store: storeBackend(),
      timestamp: new Date().toISOString(),
    },
  };
}
