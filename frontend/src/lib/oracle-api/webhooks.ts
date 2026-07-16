import { createHmac, randomBytes } from "crypto";
import { kvGet, kvSet, kvSAdd, kvSMembers, kvDel } from "./store";

export type WebhookEndpoint = {
  id: string;
  keyId: string;
  url: string;
  secret: string;
  events: string[];
  createdAt: string;
  disabledAt?: string;
  failCount: number;
};

export type WebhookEvent = {
  id: string;
  type: string;
  createdAt: string;
  data: Record<string, unknown>;
};

const indexKey = (keyId: string) => `oracle:hooks:${keyId}`;
const hookKey = (id: string) => `oracle:hook:${id}`;

export async function createWebhook(opts: {
  keyId: string;
  url: string;
  events?: string[];
}): Promise<WebhookEndpoint> {
  const id = randomBytes(8).toString("hex");
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const rec: WebhookEndpoint = {
    id,
    keyId: opts.keyId,
    url: opts.url,
    secret,
    events: opts.events ?? ["price.updated"],
    createdAt: new Date().toISOString(),
    failCount: 0,
  };
  await kvSet(hookKey(id), JSON.stringify(rec));
  await kvSAdd(indexKey(opts.keyId), id);
  await kvSAdd("oracle:hooks:all", id);
  return rec;
}

export async function listWebhooks(keyId: string): Promise<WebhookEndpoint[]> {
  const ids = await kvSMembers(indexKey(keyId));
  const out: WebhookEndpoint[] = [];
  for (const id of ids) {
    const raw = await kvGet(hookKey(id));
    if (raw) out.push(JSON.parse(raw) as WebhookEndpoint);
  }
  return out.filter((h) => !h.disabledAt);
}

export async function deleteWebhook(keyId: string, id: string): Promise<boolean> {
  const raw = await kvGet(hookKey(id));
  if (!raw) return false;
  const rec = JSON.parse(raw) as WebhookEndpoint;
  if (rec.keyId !== keyId) return false;
  rec.disabledAt = new Date().toISOString();
  await kvSet(hookKey(id), JSON.stringify(rec));
  return true;
}

export async function listAllActiveWebhooks(): Promise<WebhookEndpoint[]> {
  const ids = await kvSMembers("oracle:hooks:all");
  const out: WebhookEndpoint[] = [];
  for (const id of ids) {
    const raw = await kvGet(hookKey(id));
    if (!raw) continue;
    const h = JSON.parse(raw) as WebhookEndpoint;
    if (!h.disabledAt) out.push(h);
  }
  return out;
}

function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function deliverWebhook(
  hook: WebhookEndpoint,
  event: WebhookEvent,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!hook.events.includes(event.type) && !hook.events.includes("*")) {
    return { ok: true, status: 0 };
  }
  const body = JSON.stringify(event);
  const sig = signBody(hook.secret, body);
  try {
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PEPT-Event": event.type,
        "X-PEPT-Delivery": event.id,
        "X-PEPT-Signature": `sha256=${sig}`,
        "User-Agent": "PEPT-Oracle-Webhooks/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      hook.failCount += 1;
      if (hook.failCount >= 20) hook.disabledAt = new Date().toISOString();
      await kvSet(hookKey(hook.id), JSON.stringify(hook));
      return { ok: false, status: res.status, error: await res.text().catch(() => "") };
    }
    if (hook.failCount > 0) {
      hook.failCount = 0;
      await kvSet(hookKey(hook.id), JSON.stringify(hook));
    }
    return { ok: true, status: res.status };
  } catch (e) {
    hook.failCount += 1;
    if (hook.failCount >= 20) hook.disabledAt = new Date().toISOString();
    await kvSet(hookKey(hook.id), JSON.stringify(hook));
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export async function fanoutPriceUpdated(prices: {
  market: string;
  price: number;
  unit: string;
  asOf: number;
  source?: string | null;
}[]): Promise<{ delivered: number; failed: number }> {
  const hooks = await listAllActiveWebhooks();
  let delivered = 0;
  let failed = 0;
  const event: WebhookEvent = {
    id: randomBytes(8).toString("hex"),
    type: "price.updated",
    createdAt: new Date().toISOString(),
    data: { prices },
  };
  await Promise.all(
    hooks.map(async (h) => {
      const r = await deliverWebhook(h, event);
      if (r.ok && r.status !== 0) delivered += 1;
      else if (!r.ok) failed += 1;
    }),
  );
  return { delivered, failed };
}

void kvDel;
