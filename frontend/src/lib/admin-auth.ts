import { NextRequest, NextResponse } from "next/server";

/**
 * Internal admin gate for /admin dashboard APIs.
 * Accepts (in order): ORACLE_ADMIN_SECRET, ADMIN_SECRET, CRON_SECRET.
 *
 * Clients may send the secret via:
 *   X-Admin-Secret: <secret>
 *   Authorization: Bearer <secret>
 *   ?secret=<secret>
 */
export function getAdminSecret(): string | null {
  return (
    process.env.ORACLE_ADMIN_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  );
}

export function extractProvidedSecret(req: NextRequest): string | null {
  const header = req.headers.get("x-admin-secret")?.trim();
  if (header) return header;
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  const q = req.nextUrl.searchParams.get("secret")?.trim();
  return q || null;
}

export function assertInternalAdmin(
  req: NextRequest,
): { ok: true } | { ok: false; response: NextResponse } {
  const expected = getAdminSecret();
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "admin_disabled",
          message:
            "Set ORACLE_ADMIN_SECRET, ADMIN_SECRET, or CRON_SECRET to enable /admin APIs.",
        },
        { status: 503 },
      ),
    };
  }
  const provided = extractProvidedSecret(req);
  if (!provided || provided !== expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "Invalid admin secret." },
        { status: 401 },
      ),
    };
  }
  return { ok: true };
}
