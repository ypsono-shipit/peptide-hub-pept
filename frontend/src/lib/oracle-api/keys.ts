import { createHash, randomBytes } from "crypto";
import { kvGet, kvSet, kvSAdd, kvSMembers, kvDel } from "./store";
import type { OracleTier } from "./tiers";

export type ApiKeyRecord = {
  id: string;
  /** sha256 hex of full secret */
  hash: string;
  /** first 8 chars for display */
  prefix: string;
  tier: OracleTier;
  name: string;
  email?: string;
  createdAt: string;
  revokedAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

const KEYS_INDEX = "oracle:keys:index";
const keyRec = (id: string) => `oracle:key:${id}`;
const keyByHash = (hash: string) => `oracle:keyhash:${hash}`;

export function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Generate `pept_live_<32 hex>` style secret (shown once). */
export function generateApiKeySecret(tier: OracleTier = "free"): string {
  const tag = tier === "demo" ? "demo" : tier === "pro" ? "live" : tier === "enterprise" ? "ent" : "free";
  return `pept_${tag}_${randomBytes(24).toString("hex")}`;
}

export async function createApiKey(opts: {
  tier: OracleTier;
  name: string;
  email?: string;
  stripeCustomerId?: string;
}): Promise<{ record: ApiKeyRecord; secret: string }> {
  const secret = generateApiKeySecret(opts.tier);
  const hash = hashApiKey(secret);
  const id = randomBytes(8).toString("hex");
  const record: ApiKeyRecord = {
    id,
    hash,
    prefix: secret.slice(0, 12),
    tier: opts.tier,
    name: opts.name,
    email: opts.email,
    createdAt: new Date().toISOString(),
    stripeCustomerId: opts.stripeCustomerId,
  };
  await kvSet(keyRec(id), JSON.stringify(record));
  await kvSet(keyByHash(hash), id);
  await kvSAdd(KEYS_INDEX, id);
  return { record, secret };
}

export async function getKeyById(id: string): Promise<ApiKeyRecord | null> {
  const raw = await kvGet(keyRec(id));
  return raw ? (JSON.parse(raw) as ApiKeyRecord) : null;
}

export async function lookupKeyBySecret(secret: string): Promise<ApiKeyRecord | null> {
  const hash = hashApiKey(secret);
  const id = await kvGet(keyByHash(hash));
  if (!id) return null;
  const rec = await getKeyById(id);
  if (!rec || rec.revokedAt) return null;
  return rec;
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const ids = await kvSMembers(KEYS_INDEX);
  const out: ApiKeyRecord[] = [];
  for (const id of ids) {
    const r = await getKeyById(id);
    if (r) out.push(r);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const rec = await getKeyById(id);
  if (!rec) return false;
  rec.revokedAt = new Date().toISOString();
  await kvSet(keyRec(id), JSON.stringify(rec));
  await kvDel(keyByHash(rec.hash));
  return true;
}

export async function updateKeyTier(
  id: string,
  tier: OracleTier,
  stripe?: { customerId?: string; subscriptionId?: string },
): Promise<ApiKeyRecord | null> {
  const rec = await getKeyById(id);
  if (!rec) return null;
  rec.tier = tier;
  if (stripe?.customerId) rec.stripeCustomerId = stripe.customerId;
  if (stripe?.subscriptionId) rec.stripeSubscriptionId = stripe.subscriptionId;
  await kvSet(keyRec(id), JSON.stringify(rec));
  return rec;
}

/** Seed env-configured keys into the store on first resolve (tier standard → free/pro). */
export async function ensureEnvKeysSeeded(): Promise<void> {
  const raw = process.env.ORACLE_API_KEYS ?? "";
  const keys = raw.split(",").map((s) => s.trim()).filter(Boolean);
  for (const secret of keys) {
    const existing = await lookupKeyBySecret(secret);
    if (existing) continue;
    const hash = hashApiKey(secret);
    const id = randomBytes(8).toString("hex");
    const record: ApiKeyRecord = {
      id,
      hash,
      prefix: secret.slice(0, 12),
      tier: "pro",
      name: "env-seeded",
      createdAt: new Date().toISOString(),
    };
    await kvSet(keyRec(id), JSON.stringify(record));
    await kvSet(keyByHash(hash), id);
    await kvSAdd(KEYS_INDEX, id);
  }
}
