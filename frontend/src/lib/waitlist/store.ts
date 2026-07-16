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
  const url = base.includes("?") ? `${base}&action=count` : `${base}?action=count`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { count?: number };
    if (typeof data.count === "number" && data.count >= 0) return data.count;
  } catch (e) {
    console.warn("[waitlist] sheets count failed", e);
  }
  return null;
}

/**
 * Google Apps Script web apps often 302 POST → googleusercontent; some runtimes
 * rewrite that to GET and drop the body. Follow redirects manually, re-POSTing.
 */
async function postJsonFollow(url: string, body: unknown, maxHops = 5): Promise<Response> {
  let current = url;
  const payload = JSON.stringify(body);
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(current, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  // Last resort: default follow
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    redirect: "follow",
  });
}

async function joinViaSheets(entry: WaitlistEntry): Promise<WaitlistResult | null> {
  const base = sheetsUrl();
  if (!base) return null;
  try {
    const res = await postJsonFollow(base, {
      email: entry.email,
      wallet: entry.wallet,
      x_handle: entry.xHandle,
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
}): Promise<WaitlistResult> {
  const email = normalizeEmail(input.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address.", status: 400 };
  }

  const entry: WaitlistEntry = {
    email,
    wallet: normalizeWallet(input.wallet),
    xHandle: normalizeX(input.xHandle),
  };

  // Prefer Supabase when configured
  const sb = supabaseConfig();
  if (sb) {
    const res = await fetch(`${sb.url}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        email: entry.email,
        wallet: entry.wallet,
        x_handle: entry.xHandle,
      }),
    });

    const text = await res.text();
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
