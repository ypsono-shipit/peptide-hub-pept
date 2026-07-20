import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { createPublicClient, http, formatUnits, type Address } from "viem";
import { robinhoodChainTestnet } from "@/lib/chains";
import { TESTNET_CONTRACTS } from "@/lib/deployments";
import { marketKeyOf, ORACLE_MARKETS } from "@/lib/oracle-api/registry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SourceQuote = {
  name: string;
  pricePerMg: number;
  source?: string;
  sampleCount?: number;
  weight?: number;
};

type PeptideSnap = {
  pricePerMg: number;
  method?: string;
  source?: string;
  singleSource?: boolean;
  divergenceBps?: number | null;
  divergenceWarning?: boolean;
  sources?: SourceQuote[];
  scouter?: { pricePerMg: number; sampleCount: number; inStockCount?: number } | null;
  basket?: {
    pricePerMg: number;
    sampleCount: number;
    vendorCount?: number;
    offerCount?: number;
  } | null;
};

type ScrapeSnapshot = {
  scrapedAt?: string;
  method?: string;
  sourceErrors?: string[];
  peptides?: Record<string, PeptideSnap>;
  glp1Index?: { pricePerMg?: number; weights?: Record<string, number> };
};

type HistorySample = {
  market: string;
  ts: number;
  price: number;
  source?: string;
  txHash?: string;
};

const REMOTE_BASE =
  "https://raw.githubusercontent.com/ypsono-shipit/peptide-hub-pept/main/frontend/public/data";

const ORACLE_ABI = [
  {
    type: "function",
    name: "getPrice",
    stateMutability: "view",
    inputs: [{ name: "marketKey", type: "bytes32" }],
    outputs: [{ name: "price", type: "uint256" }],
  },
  {
    type: "function",
    name: "feeds",
    stateMutability: "view",
    inputs: [{ name: "marketKey", type: "bytes32" }],
    outputs: [
      { name: "chainlinkFeed", type: "address" },
      { name: "pushedPrice", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "stalenessWindow", type: "uint256" },
      { name: "source", type: "string" },
      { name: "paused", type: "bool" },
    ],
  },
] as const;

const SLUG_TO_MARKET: Record<string, string> = {
  semaglutide: "SEMA-PERP",
  tirzepatide: "TIRZ-PERP",
  retatrutide: "RETA-PERP",
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Parse JSON text; reject merge-conflict corpses and non-objects. */
function safeParseJson(text: string): unknown | null {
  if (!text || text.includes("<<<<<<<") || text.includes(">>>>>>>")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Load JSON from remote + disk. Prefer denser / richer payload.
 * Never throw on bad remote JSON (cron rebase has left conflict markers before).
 */
async function loadJsonRemoteOrDisk(name: string): Promise<unknown | null> {
  let remote: unknown | null = null;
  try {
    const res = await fetch(`${REMOTE_BASE}/${name}`, {
      cache: "no-store",
      next: { revalidate: 0 },
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      // IMPORTANT: await inside try — bare `return res.json()` rejects outside catch → HTTP 500
      const text = await res.text();
      remote = safeParseJson(text);
    }
  } catch {
    remote = null;
  }

  let disk: unknown | null = null;
  for (const p of [
    path.join(process.cwd(), "public/data", name),
    path.join(process.cwd(), "data", name),
  ]) {
    try {
      disk = safeParseJson(await readFile(p, "utf8"));
      if (disk) break;
    } catch {
      /* next */
    }
  }

  if (!remote && !disk) return null;
  if (!remote) return disk;
  if (!disk) return remote;

  // For history files, merge samples by densest union
  if (name === "price-history.json" && isPlainObject(remote) && isPlainObject(disk)) {
    const rSamples = Array.isArray(remote.samples) ? (remote.samples as HistorySample[]) : [];
    const dSamples = Array.isArray(disk.samples) ? (disk.samples as HistorySample[]) : [];
    const map = new Map<string, HistorySample>();
    for (const s of [...dSamples, ...rSamples]) {
      if (!s?.market || !s.ts || !Number.isFinite(s.price)) continue;
      const k = `${s.market}|${s.ts}|${Number(s.price).toFixed(6)}`;
      const prev = map.get(k);
      if (!prev || (!!s.txHash && !prev.txHash)) map.set(k, s);
    }
    const samples = [...map.values()].sort(
      (a, b) => a.ts - b.ts || a.market.localeCompare(b.market),
    );
    return {
      updatedAt:
        (typeof remote.updatedAt === "string" && remote.updatedAt) ||
        (typeof disk.updatedAt === "string" && disk.updatedAt) ||
        new Date().toISOString(),
      note:
        (typeof disk.note === "string" && disk.note) ||
        (typeof remote.note === "string" && remote.note) ||
        "",
      samples,
      _source: `merged remote(${rSamples.length})+disk(${dSamples.length})→${samples.length}`,
    };
  }

  // For scrape snapshots, prefer the newer scrapedAt
  if (name === "glp1-last-scrape.json" && isPlainObject(remote) && isPlainObject(disk)) {
    const rAt = typeof remote.scrapedAt === "string" ? Date.parse(remote.scrapedAt) : 0;
    const dAt = typeof disk.scrapedAt === "string" ? Date.parse(disk.scrapedAt) : 0;
    return rAt >= dAt ? remote : disk;
  }

  // Default: prefer remote if both plain objects else first non-null
  return remote ?? disk;
}

async function loadOnChain() {
  const client = createPublicClient({
    chain: robinhoodChainTestnet,
    transport: http(
      process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL ??
        process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ??
        "https://rpc.testnet.chain.robinhood.com",
      { timeout: 12_000 },
    ),
  });
  const oracle = TESTNET_CONTRACTS.PeptideOracle as Address;
  const markets = ORACLE_MARKETS.map((m) => m.id);

  const out: Record<
    string,
    {
      price: number | null;
      updatedAt: number | null;
      asOfIso: string | null;
      source: string | null;
      paused: boolean | null;
      error?: string;
    }
  > = {};

  await Promise.all(
    markets.map(async (market) => {
      try {
        const key = marketKeyOf(market);
        const [priceRaw, feed] = await Promise.all([
          client.readContract({
            address: oracle,
            abi: ORACLE_ABI,
            functionName: "getPrice",
            args: [key],
          }),
          client.readContract({
            address: oracle,
            abi: ORACLE_ABI,
            functionName: "feeds",
            args: [key],
          }),
        ]);
        const updatedAt = Number(feed[2]);
        out[market] = {
          price: Number(formatUnits(priceRaw as bigint, 18)),
          updatedAt,
          asOfIso: updatedAt ? new Date(updatedAt * 1000).toISOString() : null,
          source: feed[4] as string,
          paused: Boolean(feed[5]),
        };
      } catch (e) {
        out[market] = {
          price: null,
          updatedAt: null,
          asOfIso: null,
          source: null,
          paused: null,
          error: e instanceof Error ? e.message : "read failed",
        };
      }
    }),
  );

  return { oracle, chainId: 46630, markets: out };
}

export async function GET() {
  try {
    type OnChainMark = {
      price: number | null;
      updatedAt: number | null;
      asOfIso: string | null;
      source: string | null;
      paused: boolean | null;
      error?: string;
    };

    const [scrapeRaw, historyRaw, onChainResult] = await Promise.all([
      loadJsonRemoteOrDisk("glp1-last-scrape.json"),
      loadJsonRemoteOrDisk("price-history.json"),
      loadOnChain().catch((e) => ({
        oracle: TESTNET_CONTRACTS.PeptideOracle as string,
        chainId: 46630,
        markets: {} as Record<string, OnChainMark>,
        error: e instanceof Error ? e.message : "on-chain failed",
      })),
    ]);

    const onChain = onChainResult as {
      oracle: string;
      chainId: number;
      markets: Record<string, OnChainMark>;
      error?: string;
    };

    const scrape = (scrapeRaw ?? {}) as ScrapeSnapshot;
    const history = (historyRaw ?? {}) as {
      samples?: HistorySample[];
      updatedAt?: string;
      _source?: string;
    };
    const samples = Array.isArray(history.samples) ? history.samples : [];

    // Recent history per market (last 48 points)
    const historyByMarket: Record<string, HistorySample[]> = {};
    for (const s of samples) {
      if (!s?.market) continue;
      const m = s.market;
      if (!historyByMarket[m]) historyByMarket[m] = [];
      historyByMarket[m]!.push(s);
    }
    for (const m of Object.keys(historyByMarket)) {
      historyByMarket[m] = (historyByMarket[m] ?? [])
        .sort((a, b) => a.ts - b.ts)
        .slice(-48);
    }

    const peptides = Object.entries(scrape.peptides ?? {}).map(([slug, p]) => {
      const market = SLUG_TO_MARKET[slug] ?? slug.toUpperCase();
      return {
        slug,
        market,
        ...p,
        onChain: onChain.markets[market] ?? null,
      };
    });

    const glp1 = scrape.glp1Index
      ? {
          slug: "glp1-index",
          market: "GLP1-IDX-PERP",
          pricePerMg: scrape.glp1Index.pricePerMg,
          weights: scrape.glp1Index.weights,
          onChain: onChain.markets["GLP1-IDX-PERP"] ?? null,
        }
      : {
          slug: "glp1-index",
          market: "GLP1-IDX-PERP",
          pricePerMg: null as number | null,
          weights: { semaglutide: 0.6, tirzepatide: 0.25, retatrutide: 0.15 },
          onChain: onChain.markets["GLP1-IDX-PERP"] ?? null,
        };

    const scrapedAt = scrape.scrapedAt ? Date.parse(scrape.scrapedAt) : null;
    const ageMinutes =
      scrapedAt && Number.isFinite(scrapedAt)
        ? Math.round((Date.now() - scrapedAt) / 60_000)
        : null;

    return NextResponse.json(
      {
        asOf: new Date().toISOString(),
        scrape: {
          scrapedAt: scrape.scrapedAt ?? null,
          ageMinutes,
          method: scrape.method ?? null,
          sourceErrors: scrape.sourceErrors ?? [],
          peptides,
          glp1Index: glp1,
        },
        onChain,
        history: {
          updatedAt: history.updatedAt ?? null,
          sampleCount: samples.length,
          byMarket: historyByMarket,
          source: history._source ?? null,
        },
        cadence: {
          cron: "*/5 * * * *",
          // GHA schedule is best-effort (~hourly under load). True 5m needs external
          // cron → POST /api/cron/refresh-oracle (workflow_dispatch).
          note:
            ageMinutes != null && ageMinutes > 10
              ? `STALE: last scrape ${ageMinutes}m ago. GitHub schedule often delays; wire external cron → /api/cron/refresh-oracle for true 5m updates`
              : "Target every 5 minutes via external cron → workflow_dispatch; GHA schedule alone is unreliable",
          healthy: ageMinutes != null ? ageMinutes <= 10 : false,
          targetMinutes: 5,
          staleAfterMinutes: 10,
        },
      },
      {
        headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
      },
    );
  } catch (e) {
    console.error("[oracle/monitor]", e);
    return NextResponse.json(
      {
        error: "monitor_failed",
        message: e instanceof Error ? e.message : "unknown",
        asOf: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
