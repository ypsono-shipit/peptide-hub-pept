import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Reliable 5-minute oracle refresh trigger.
 *
 * GitHub Actions schedule every 5 minutes is best-effort and often fires only
 * ~hourly under load (we saw ~18/288 expected runs/day). External crons that hit
 * this route call workflow_dispatch, which starts within seconds.
 *
 * Auth (any one):
 *   Authorization: Bearer <CRON_SECRET>
 *   x-cron-secret: <CRON_SECRET>
 *   ?secret=<CRON_SECRET>
 *
 * Env required on the host (Vercel / any deploy):
 *   CRON_SECRET              — shared secret for the external cron
 *   ORACLE_DISPATCH_TOKEN    — GitHub PAT with `actions:write` (and repo read)
 *   ORACLE_DISPATCH_REPO     — optional, default ypsono-shipit/peptide-hub-pept
 *   ORACLE_DISPATCH_WORKFLOW — optional, default refresh-glp1-prices.yml
 *   ORACLE_DISPATCH_REF      — optional, default main
 *
 * Free external cron (recommended): https://cron-job.org every 5 minutes →
 *   POST https://<your-app>/api/cron/refresh-oracle
 *   Header: Authorization: Bearer <CRON_SECRET>
 */

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  if (req.headers.get("x-cron-secret") === secret) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  // Vercel Cron sends this header when CRON_SECRET is set in project env
  if (req.headers.get("x-vercel-cron") === "1" && process.env.VERCEL === "1") {
    // Prefer secret when configured; allow Vercel Cron identity only if secret matches query
    return req.nextUrl.searchParams.get("secret") === secret;
  }
  return false;
}

export async function GET(req: NextRequest) {
  return dispatch(req);
}

export async function POST(req: NextRequest) {
  return dispatch(req);
}

async function dispatch(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.ORACLE_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "ORACLE_DISPATCH_TOKEN not configured (GitHub PAT with actions:write)",
      },
      { status: 500 },
    );
  }

  const repo = process.env.ORACLE_DISPATCH_REPO ?? "ypsono-shipit/peptide-hub-pept";
  const workflow = process.env.ORACLE_DISPATCH_WORKFLOW ?? "refresh-glp1-prices.yml";
  const ref = process.env.ORACLE_DISPATCH_REF ?? "main";

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "peptide-hub-oracle-cron",
    },
    body: JSON.stringify({
      ref,
      inputs: {
        // workflow_dispatch inputs are strings in the API
        dry_run: "false",
        force_push: "false",
        skip_scrape: "false",
        skip_scouter: "false",
        skip_basket: "false",
      },
    }),
  });

  if (res.status === 204) {
    return NextResponse.json({
      ok: true,
      dispatched: true,
      repo,
      workflow,
      ref,
      at: new Date().toISOString(),
      note: "workflow_dispatch accepted; run should appear in Actions within seconds",
    });
  }

  const body = await res.text();
  return NextResponse.json(
    {
      ok: false,
      status: res.status,
      error: body.slice(0, 500),
      repo,
      workflow,
    },
    { status: 502 },
  );
}
