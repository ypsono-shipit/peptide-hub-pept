import { NextRequest, NextResponse } from "next/server";

/**
 * Internal admin gate for /admin dashboard APIs.
 * Any of these env vars is accepted as a valid unlock secret:
 *   ORACLE_ADMIN_SECRET | ADMIN_SECRET | CRON_SECRET
 *
 * Clients may send the secret via:
 *   X-Admin-Secret: <secret>
 *   Authorization: Bearer <secret>
 *   ?secret=<secret>
 */
export function getAdminSecrets(): string[] {
  const out: string[] = [];
  for (const k of ["ORACLE_ADMIN_SECRET", "ADMIN_SECRET", "CRON_SECRET"] as const) {
    const v = process.env[k]?.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
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
  const expected = getAdminSecrets();
  if (expected.length === 0) {
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
  if (!provided || !expected.includes(provided)) {
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
