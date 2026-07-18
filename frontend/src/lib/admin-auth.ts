import { NextRequest, NextResponse } from "next/server";

/**
 * Internal /admin gate.
 *
 * Preferred unlock: simple dashboard password from ADMIN_PASSWORD
 * (defaults to "peptidegod" if unset — change via Vercel env anytime).
 *
 * Also accepts ops secrets if someone still sends them:
 *   ORACLE_ADMIN_SECRET | ADMIN_SECRET | CRON_SECRET
 *
 * Clients send the password via:
 *   X-Admin-Secret: <password>
 *   Authorization: Bearer <password>
 *   ?secret=<password>
 */
const DEFAULT_ADMIN_PASSWORD = "peptidegod";

export function getAdminSecrets(): string[] {
  const out: string[] = [];
  const password = process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;
  if (password) out.push(password);

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
          message: "No admin password configured.",
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
        { error: "unauthorized", message: "Invalid password." },
        { status: 401 },
      ),
    };
  }
  return { ok: true };
}
