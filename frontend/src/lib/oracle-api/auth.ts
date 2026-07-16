import { NextRequest, NextResponse } from "next/server";

/**
 * B2B API key gate.
 *
 * Env:
 *   ORACLE_API_KEYS=key1,key2          comma-separated valid keys
 *   ORACLE_API_REQUIRE_KEY=true|false  default false in preview, recommend true in prod B2B
 *   ORACLE_API_PUBLIC_DEMO_KEY=demo    optional always-accepted demo key for docs
 *
 * Clients: header `X-API-Key: <key>` or `Authorization: Bearer <key>`
 */

export type AuthResult =
  | { ok: true; keyId: string; tier: "demo" | "standard" }
  | { ok: false; response: NextResponse };

function configuredKeys(): Set<string> {
  const raw = process.env.ORACLE_API_KEYS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function requireKey(): boolean {
  const v = process.env.ORACLE_API_REQUIRE_KEY;
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  // Default: open for testnet bootstrap (set REQUIRE_KEY on production B2B)
  return false;
}

function extractKey(req: NextRequest): string | null {
  const header = req.headers.get("x-api-key");
  if (header?.trim()) return header.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  // also allow ?api_key= for quick curl demos (not recommended for production clients)
  const q = req.nextUrl.searchParams.get("api_key");
  return q?.trim() || null;
}

export function authenticateOracleRequest(req: NextRequest): AuthResult {
  const key = extractKey(req);
  const keys = configuredKeys();
  const demo = process.env.ORACLE_API_PUBLIC_DEMO_KEY?.trim() || "pept_demo_public";

  if (key && key === demo) {
    return { ok: true, keyId: "demo", tier: "demo" };
  }
  if (key && keys.has(key)) {
    return { ok: true, keyId: `key_${key.slice(0, 6)}`, tier: "standard" };
  }

  if (!requireKey()) {
    // Open mode: treat missing key as anonymous demo
    return { ok: true, keyId: key ? "unknown" : "anonymous", tier: "demo" };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "unauthorized",
        message: "Missing or invalid API key. Pass X-API-Key or Authorization: Bearer <key>.",
        docs: "/docs/oracle",
      },
      { status: 401 },
    ),
  };
}

/** Simple in-memory rate limit (per instance). Upgrade to Redis for multi-region B2B. */
const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(
  keyId: string,
  limit = 120,
  windowMs = 60_000,
): { ok: true } | { ok: false; response: NextResponse } {
  const now = Date.now();
  const b = buckets.get(keyId);
  if (!b || now > b.reset) {
    buckets.set(keyId, { n: 1, reset: now + windowMs });
    return { ok: true };
  }
  b.n += 1;
  if (b.n > limit) {
    const retry = Math.ceil((b.reset - now) / 1000);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "rate_limited", message: `Max ${limit} requests per minute.`, retryAfterSec: retry },
        { status: 429, headers: { "Retry-After": String(retry) } },
      ),
    };
  }
  return { ok: true };
}
