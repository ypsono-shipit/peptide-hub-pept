/**
 * Waitlist persistence.
 * Primary: Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 * Optional dual-write: GOOGLE_SHEETS_WEBHOOK_URL (Apps Script / Zapier / Make)
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
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "") || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeWallet(wallet: string | undefined | null) {
  const w = (wallet || "").trim();
  if (!w) return null;
  return w;
}

function normalizeX(handle: string | undefined | null) {
  let h = (handle || "").trim();
  if (!h) return null;
  h = h.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "");
  h = h.replace(/^@/, "");
  return h || null;
}

async function sheetsWebhook(entry: WaitlistEntry) {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: entry.email,
        wallet: entry.wallet,
        x_handle: entry.xHandle,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn("[waitlist] sheets webhook failed", e);
  }
}

/** In-memory fallback for local dev when Supabase is not configured (not durable on Vercel). */
const mem = {
  emails: new Set<string>(),
  rows: [] as { email: string; wallet: string | null; xHandle: string | null; at: number }[],
};

export async function getWaitlistCount(): Promise<number> {
  const sb = supabaseConfig();
  if (sb) {
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
    // Fallback GET with range
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
    return 0;
  }

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

  const sb = supabaseConfig();
  if (sb) {
    const res = await fetch(`${sb.url}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        email: entry.email,
        wallet: entry.wallet,
        x_handle: entry.xHandle,
      }),
    });

    if (res.status === 409 || res.status === 23505) {
      const position = await getWaitlistCount();
      await sheetsWebhook(entry);
      return { ok: true, alreadyJoined: true, position };
    }

    // PostgREST unique violation body
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
      if (code === "23505" || /duplicate|unique/i.test(msg || "")) {
        const position = await getWaitlistCount();
        return { ok: true, alreadyJoined: true, position };
      }
      console.error("[waitlist] supabase insert failed", res.status, msg);
      return { ok: false, error: "Could not save signup. Try again.", status: 502 };
    }

    await sheetsWebhook(entry);
    const position = await getWaitlistCount();
    const id = Array.isArray(json) ? (json[0] as { id?: string })?.id : undefined;
    return { ok: true, id, position };
  }

  // Memory fallback (dev only)
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
  await sheetsWebhook(entry);
  console.warn(
    "[waitlist] SUPABASE_URL not set — stored in process memory only (not durable on Vercel).",
  );
  return { ok: true, position: mem.emails.size };
}
