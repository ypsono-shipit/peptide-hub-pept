/**
 * Waitlist persistence (easiest → durable):
 * 1. Supabase if SUPABASE_URL + key set
 * 2. Google Sheets Apps Script if GOOGLE_SHEETS_WEBHOOK_URL set
 * 3. In-memory fallback (local only; not durable on Vercel)
 */

export type WaitlistEntry = {
  email: string;
  wallet: string | null;
  xHandle: string | null;
  /** Origin surface: waitlist | launchpad | landing | etc. */
  source: string | null;
};

export type WaitlistResult =
  | { ok: true; id?: string; alreadyJoined?: boolean; position: number }
  | { ok: false; error: string; status?: number };

function supabaseConfig() {
  const url =
    process.env.SUPABASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function sheetsUrl() {
  return process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() || "";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeWallet(wallet: string | undefined | null) {
  const w = (wallet || "").trim();
  return w || null;
}

function normalizeX(handle: string | undefined | null) {
  let h = (handle || "").trim();
  if (!h) return null;
  h = h.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "");
  h = h.replace(/^@/, "");
  return h || null;
}

const mem = {
  emails: new Set<string>(),
  rows: [] as { email: string; wallet: string | null; xHandle: string | null; at: number }[],
};

async function countFromSheets(): Promise<number | null> {
  const base = sheetsUrl();
  if (!base) return null;
  const sep = base.includes("?") ? "&" : "?";
  // cache-bust — Apps Script + CDN sometimes stick an old count
  const url = `${base}${sep}action=count&_=${Date.now()}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    if (typeof data.count === "number" && data.count >= 0) return data.count;
  } catch (e) {
    console.warn("[waitlist] sheets count failed", e);
  }
  return null;
}

/**
 * Google Apps Script web apps: POST /exec → 302 Location → GET that URL for JSON body.
 * (Re-POSTing the redirect or following as GET-from-POST often 404s.)
 */
async function postAppsScript(url: string, body: unknown): Promise<Response> {
  const payload = JSON.stringify(body);
  const post = await fetch(url, {
    method: "POST",
    // text/plain avoids some GAS content-type quirks
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: payload,
    redirect: "manual",
  });

  if (post.status >= 200 && post.status < 300) {
    return post;
  }

  if (post.status >= 300 && post.status < 400) {
    const loc = post.headers.get("location");
    if (loc) {
      const next = new URL(loc, url).toString();
      return fetch(next, { method: "GET", redirect: "follow", cache: "no-store" });
    }
  }

  return post;
}

async function joinViaSheets(entry: WaitlistEntry): Promise<WaitlistResult | null> {
  const base = sheetsUrl();
  if (!base) return null;
  try {
    const res = await postAppsScript(base, {
      email: entry.email,
      wallet: entry.wallet,
      x_handle: entry.xHandle,
      source: entry.source,
      created_at: new Date().toISOString(),
    });
    const text = await res.text();
    let data: {
      ok?: boolean;
      alreadyJoined?: boolean;
      position?: number;
      error?: string;
    } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.warn("[waitlist] sheets non-JSON response", text.slice(0, 200));
      return { ok: false, error: "Sheet write failed (bad response).", status: 502 };
    }
    if (!res.ok || data.ok === false) {
      return { ok: false, error: data.error || "Sheet write failed", status: 502 };
    }
    const position =
      typeof data.position === "number" ? data.position : (await countFromSheets()) || 1;
    return {
      ok: true,
      alreadyJoined: Boolean(data.alreadyJoined),
      position,
    };
  } catch (e) {
    console.warn("[waitlist] sheets join failed", e);
    return { ok: false, error: "Could not reach spreadsheet.", status: 502 };
  }
}

export async function getWaitlistCount(): Promise<number> {
  const sb = supabaseConfig();
  if (sb) {
    try {
      const head = await fetch(`${sb.url}/rest/v1/waitlist?select=id`, {
        method: "HEAD",
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          Prefer: "count=exact",
        },
        cache: "no-store",
      });
      const cr = head.headers.get("content-range");
      if (cr?.includes("/")) {
        const n = Number(cr.split("/")[1]);
        if (Number.isFinite(n) && n >= 0) return n;
      }
      const res = await fetch(`${sb.url}/rest/v1/waitlist?select=id`, {
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          Prefer: "count=exact",
          Range: "0-0",
        },
        cache: "no-store",
      });
      const contentRange = res.headers.get("content-range");
      if (contentRange?.includes("/")) {
        const n = Number(contentRange.split("/")[1]);
        if (Number.isFinite(n) && n >= 0) return n;
      }
    } catch (e) {
      console.warn("[waitlist] supabase count failed", e);
    }
  }

  const sheetCount = await countFromSheets();
  if (sheetCount !== null) return sheetCount;

  return mem.emails.size;
}

export async function joinWaitlist(input: {
  email: string;
  wallet?: string;
  xHandle?: string;
  source?: string;
}): Promise<WaitlistResult> {
  const email = normalizeEmail(input.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address.", status: 400 };
  }

  const sourceRaw = (input.source || "").trim().toLowerCase().slice(0, 64);
  const entry: WaitlistEntry = {
    email,
    wallet: normalizeWallet(input.wallet),
    xHandle: normalizeX(input.xHandle),
    source: sourceRaw || null,
  };

  // Prefer Supabase when configured (same table for /waitlist + /launchpad)
  const sb = supabaseConfig();
  if (sb) {
    const postRow = async (includeSource: boolean) => {
      const row: Record<string, string | null> = {
        email: entry.email,
        wallet: entry.wallet,
        x_handle: entry.xHandle,
      };
      if (includeSource && entry.source) row.source = entry.source;
      return fetch(`${sb.url}/rest/v1/waitlist`, {
        method: "POST",
        headers: {
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(row),
      });
    };

    let res = await postRow(true);
    let text = await res.text();
    // Retry without source if column not migrated yet
    if (!res.ok && /source|PGRST|column/i.test(text) && entry.source) {
      res = await postRow(false);
      text = await res.text();
    }

    let json: { code?: string; message?: string; id?: string } | unknown[] | null = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      const code = (json as { code?: string })?.code;
      const msg = (json as { message?: string })?.message || text;
      if (res.status === 409 || code === "23505" || /duplicate|unique/i.test(msg || "")) {
        const position = await getWaitlistCount();
        return { ok: true, alreadyJoined: true, position };
      }
      console.error("[waitlist] supabase insert failed", res.status, msg);
      // fall through to sheets
    } else {
      // dual-write sheets if also configured
      void joinViaSheets(entry);
      const position = await getWaitlistCount();
      const id = Array.isArray(json) ? (json[0] as { id?: string })?.id : undefined;
      return { ok: true, id, position };
    }
  }

  // Google Sheets (recommended easy path)
  const sheetResult = await joinViaSheets(entry);
  if (sheetResult) return sheetResult;

  // Memory fallback (dev / misconfigured prod)
  if (mem.emails.has(email)) {
    return { ok: true, alreadyJoined: true, position: mem.emails.size };
  }
  mem.emails.add(email);
  mem.rows.push({
    email: entry.email,
    wallet: entry.wallet,
    xHandle: entry.xHandle,
    at: Date.now(),
  });
  console.warn(
    "[waitlist] No SUPABASE_* or GOOGLE_SHEETS_WEBHOOK_URL — in-memory only (not durable on Vercel).",
  );
  return { ok: true, position: mem.emails.size };
}
