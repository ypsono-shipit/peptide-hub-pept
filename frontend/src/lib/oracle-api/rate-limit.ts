import { NextResponse } from "next/server";
import { kvGet, kvIncr, kvSet, storeBackend } from "./store";

/**
 * Fixed-window RPM limiter. Uses Upstash when configured for multi-instance correctness.
 */
export async function checkRateLimit(
  keyId: string,
  rpm: number,
): Promise<{ ok: true; remaining: number } | { ok: false; response: NextResponse }> {
  const window = Math.floor(Date.now() / 60_000);
  const k = `oracle:rpm:${keyId}:${window}`;
  const n = await kvIncr(k);
  if (n === 1) {
    await kvSet(k, "1", 120);
  }
  if (n > rpm) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "rate_limited",
          message: `Max ${rpm} requests per minute for this key.`,
          retryAfterSec: 60 - (Math.floor(Date.now() / 1000) % 60),
          backend: storeBackend(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(60 - (Math.floor(Date.now() / 1000) % 60)),
            "X-RateLimit-Limit": String(rpm),
            "X-RateLimit-Remaining": "0",
          },
        },
      ),
    };
  }
  return { ok: true, remaining: Math.max(0, rpm - n) };
}

export async function checkDailyLimit(
  keyId: string,
  daily: number,
  currentDayCount: number,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (currentDayCount <= daily) return { ok: true };
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "quota_exceeded",
        message: `Daily quota ${daily} exceeded. Upgrade tier for higher limits.`,
        docs: "/docs/oracle",
      },
      { status: 429 },
    ),
  };
}

// silence unused in some trees
void kvGet;
