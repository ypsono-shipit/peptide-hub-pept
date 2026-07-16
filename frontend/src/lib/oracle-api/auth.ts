import { NextRequest, NextResponse } from "next/server";
import { ensureEnvKeysSeeded, lookupKeyBySecret, type ApiKeyRecord } from "./keys";
import type { OracleTier } from "./tiers";
import { TIER_LIMITS } from "./tiers";
import { checkRateLimit, checkDailyLimit } from "./rate-limit";
import { recordUsage, getUsage } from "./usage";

export type AuthOk = {
  ok: true;
  keyId: string;
  tier: OracleTier;
  record: ApiKeyRecord | null;
  remainingRpm: number;
};

export type AuthResult = AuthOk | { ok: false; response: NextResponse };

function requireKey(): boolean {
  const v = process.env.ORACLE_API_REQUIRE_KEY;
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return false;
}

function extractKey(req: NextRequest): string | null {
  const header = req.headers.get("x-api-key");
  if (header?.trim()) return header.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const q = req.nextUrl.searchParams.get("api_key");
  return q?.trim() || null;
}

export function extractAdminSecret(req: NextRequest): string | null {
  return req.headers.get("x-admin-secret")?.trim() || extractKey(req);
}

export function assertAdmin(req: NextRequest): AuthResult {
  const secret = process.env.ORACLE_ADMIN_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "admin_disabled", message: "Set ORACLE_ADMIN_SECRET to enable admin routes." },
        { status: 503 },
      ),
    };
  }
  const provided = extractAdminSecret(req);
  if (provided !== secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized", message: "Invalid admin secret." }, { status: 401 }),
    };
  }
  return { ok: true, keyId: "admin", tier: "enterprise", record: null, remainingRpm: 9999 };
}

export async function authenticateOracleRequest(req: NextRequest): Promise<AuthResult> {
  await ensureEnvKeysSeeded().catch(() => {});

  const key = extractKey(req);
  const demo = process.env.ORACLE_API_PUBLIC_DEMO_KEY?.trim() || "pept_demo_public";

  let tier: OracleTier = "demo";
  let keyId = "anonymous";
  let record: ApiKeyRecord | null = null;

  if (key && key === demo) {
    tier = "demo";
    keyId = "demo";
  } else if (key) {
    record = await lookupKeyBySecret(key);
    if (record) {
      tier = record.tier;
      keyId = record.id;
    } else if (requireKey()) {
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
    } else {
      keyId = "unknown";
      tier = "demo";
    }
  } else if (requireKey()) {
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

  const limits = TIER_LIMITS[tier];
  const rl = await checkRateLimit(keyId, limits.rpm);
  if (!rl.ok) return rl;

  const usage = await getUsage(keyId);
  // usage.day is before this request; allow one more
  const dailyCheck = await checkDailyLimit(keyId, limits.daily, usage.day + 1);
  if (!dailyCheck.ok) return dailyCheck;

  return {
    ok: true,
    keyId,
    tier,
    record,
    remainingRpm: rl.remaining,
  };
}

export async function trackRequest(keyId: string, route: string) {
  return recordUsage(keyId, route);
}
