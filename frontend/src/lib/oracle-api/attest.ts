import { createHmac, createPrivateKey, createPublicKey, sign, verify, randomBytes } from "crypto";
import type { OracleTier } from "./tiers";
import { TIER_LIMITS } from "./tiers";

export type PriceAttestation = {
  market: string;
  price: number;
  unit: string;
  asOf: number;
  marketKey: string;
  chainId: number;
  oracle: string;
  source: string | null;
  issuedAt: number;
  nonce: string;
  /** HMAC-SHA256 hex over canonical payload (always present) */
  hmac: string;
  /** Optional ECDSA P-256 signature (DER base64) if ORACLE_ATTEST_PRIVATE_KEY set */
  ecdsa?: string;
  algorithm: "HMAC-SHA256" | "HMAC-SHA256+ECDSA-P256";
};

function hmacSecret(): string {
  return (
    process.env.ORACLE_ATTEST_HMAC_SECRET ||
    process.env.ORACLE_ADMIN_SECRET ||
    "pept-oracle-dev-hmac-change-me"
  );
}

function canonicalPayload(p: Omit<PriceAttestation, "hmac" | "ecdsa" | "algorithm">): string {
  return [
    p.market,
    p.price.toFixed(8),
    p.unit,
    String(p.asOf),
    p.marketKey,
    String(p.chainId),
    p.oracle,
    p.source ?? "",
    String(p.issuedAt),
    p.nonce,
  ].join("|");
}

export function canSign(tier: OracleTier): boolean {
  return TIER_LIMITS[tier].signedQuotes;
}

export function createAttestation(input: {
  market: string;
  price: number;
  unit: string;
  asOf: number;
  marketKey: string;
  chainId: number;
  oracle: string;
  source?: string | null;
}): PriceAttestation {
  const body = {
    market: input.market,
    price: input.price,
    unit: input.unit,
    asOf: input.asOf,
    marketKey: input.marketKey,
    chainId: input.chainId,
    oracle: input.oracle,
    source: input.source ?? null,
    issuedAt: Math.floor(Date.now() / 1000),
    nonce: randomBytes(16).toString("hex"),
  };
  const canon = canonicalPayload(body);
  const hmac = createHmac("sha256", hmacSecret()).update(canon).digest("hex");

  let ecdsa: string | undefined;
  const pem = process.env.ORACLE_ATTEST_PRIVATE_KEY;
  if (pem) {
    try {
      const key = createPrivateKey(pem.replace(/\\n/g, "\n"));
      const sig = sign("sha256", Buffer.from(canon), key);
      ecdsa = sig.toString("base64");
    } catch {
      // ignore bad key
    }
  }

  return {
    ...body,
    hmac,
    ecdsa,
    algorithm: ecdsa ? "HMAC-SHA256+ECDSA-P256" : "HMAC-SHA256",
  };
}

export function verifyAttestation(att: PriceAttestation): boolean {
  const { hmac, ecdsa, algorithm, ...rest } = att;
  void algorithm;
  const canon = canonicalPayload(rest);
  const expect = createHmac("sha256", hmacSecret()).update(canon).digest("hex");
  if (expect !== hmac) return false;

  if (ecdsa && process.env.ORACLE_ATTEST_PUBLIC_KEY) {
    try {
      const key = createPublicKey(process.env.ORACLE_ATTEST_PUBLIC_KEY.replace(/\\n/g, "\n"));
      return verify("sha256", Buffer.from(canon), key, Buffer.from(ecdsa, "base64"));
    } catch {
      return false;
    }
  }
  return true;
}
