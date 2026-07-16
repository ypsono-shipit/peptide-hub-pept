/**
 * Durable KV for oracle B2B state.
 * Priority: Upstash Redis REST → in-memory (dev / single instance).
 *
 * Env:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

type MemoryEntry = { v: string; exp?: number };
const memory = new Map<string, MemoryEntry>();

function upstashConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function upstash(cmd: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Upstash ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { result: unknown };
  return json.result;
}

export async function kvGet(key: string): Promise<string | null> {
  if (upstashConfigured()) {
    const r = await upstash(["GET", key]);
    return r == null ? null : String(r);
  }
  const e = memory.get(key);
  if (!e) return null;
  if (e.exp && Date.now() > e.exp) {
    memory.delete(key);
    return null;
  }
  return e.v;
}

export async function kvSet(key: string, value: string, ttlSec?: number): Promise<void> {
  if (upstashConfigured()) {
    if (ttlSec && ttlSec > 0) await upstash(["SET", key, value, "EX", ttlSec]);
    else await upstash(["SET", key, value]);
    return;
  }
  memory.set(key, {
    v: value,
    exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined,
  });
}

export async function kvIncr(key: string): Promise<number> {
  if (upstashConfigured()) {
    const r = await upstash(["INCR", key]);
    return Number(r);
  }
  const cur = Number((await kvGet(key)) ?? "0") + 1;
  await kvSet(key, String(cur));
  return cur;
}

export async function kvSAdd(key: string, member: string): Promise<void> {
  if (upstashConfigured()) {
    await upstash(["SADD", key, member]);
    return;
  }
  const raw = await kvGet(key);
  const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  set.add(member);
  await kvSet(key, JSON.stringify([...set]));
}

export async function kvSMembers(key: string): Promise<string[]> {
  if (upstashConfigured()) {
    const r = await upstash(["SMEMBERS", key]);
    return Array.isArray(r) ? r.map(String) : [];
  }
  const raw = await kvGet(key);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function kvDel(key: string): Promise<void> {
  if (upstashConfigured()) {
    await upstash(["DEL", key]);
    return;
  }
  memory.delete(key);
}

export function storeBackend(): "upstash" | "memory" {
  return upstashConfigured() ? "upstash" : "memory";
}
