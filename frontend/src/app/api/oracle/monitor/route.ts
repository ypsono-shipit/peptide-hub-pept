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

async function loadJsonRemoteOrDisk(name: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${REMOTE_BASE}/${name}`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (res.ok) return res.json();
  } catch {
    /* disk */
  }
  for (const p of [
    path.join(process.cwd(), "public/data", name),
    path.join(process.cwd(), "data", name),
  ]) {
    try {
      return JSON.parse(await readFile(p, "utf8"));
    } catch {
      /* next */
    }
  }
  return null;
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
  const history = (historyRaw ?? {}) as { samples?: HistorySample[]; updatedAt?: string };
  const samples = Array.isArray(history.samples) ? history.samples : [];

  // Recent history per market (last 48 points)
  const historyByMarket: Record<string, HistorySample[]> = {};
  for (const s of samples) {
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
      },
      cadence: {
        cron: "*/5 * * * *",
        note: "GitHub Actions every 5 minutes; chart samples append on successful push",
      },
    },
    {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    },
  );
}
