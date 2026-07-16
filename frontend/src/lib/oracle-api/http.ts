import { NextRequest, NextResponse } from "next/server";
import { authenticateOracleRequest, rateLimit } from "./auth";

export const ORACLE_API_VERSION = "v1";

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
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

/** Auth + rate limit gate for all oracle API handlers. */
export function gate(req: NextRequest):
  | { ok: true; keyId: string; tier: "demo" | "standard" }
  | { ok: false; response: NextResponse } {
  const auth = authenticateOracleRequest(req);
  if (!auth.ok) return auth;
  const limit = auth.tier === "demo" ? 60 : 300;
  const rl = rateLimit(auth.keyId, limit);
  if (!rl.ok) return rl;
  return { ok: true, keyId: auth.keyId, tier: auth.tier };
}

export function withMeta<T extends Record<string, unknown>>(
  body: T,
  auth: { keyId: string; tier: string },
) {
  return {
    ...body,
    meta: {
      apiVersion: ORACLE_API_VERSION,
      provider: "PEPT Oracle",
      docs: "/docs/oracle",
      auth: { keyId: auth.keyId, tier: auth.tier },
      timestamp: new Date().toISOString(),
    },
  };
}
