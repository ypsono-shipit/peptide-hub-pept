import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { assertInternalAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REMOTE_BASE =
  "https://raw.githubusercontent.com/ypsono-shipit/peptide-hub-pept/main/frontend/public/data";

type HistorySample = {
  market: string;
  ts: number;
  price: number;
  source?: string;
  txHash?: string;
};

type HistoryFile = {
  updatedAt?: string;
  note?: string;
  samples?: HistorySample[];
};

async function loadHistory(): Promise<HistoryFile> {
  try {
    const res = await fetch(`${REMOTE_BASE}/price-history.json`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (res.ok) return (await res.json()) as HistoryFile;
  } catch {
    /* disk */
  }
  for (const p of [
    path.join(process.cwd(), "public/data/price-history.json"),
    path.join(process.cwd(), "data/price-history.json"),
  ]) {
    try {
      return JSON.parse(await readFile(p, "utf8")) as HistoryFile;
    } catch {
      /* next */
    }
  }
  return { samples: [] };
}

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Export oracle mark history as Excel-friendly CSV (opens cleanly in Excel / Sheets).
 * Multi-sheet .xlsx is also generated offline into public/data/price-history.xlsx
 * (regenerate via contracts/scripts or the Python helper).
 */
export async function GET(req: NextRequest) {
  const gate = assertInternalAdmin(req);
  if (!gate.ok) return gate.response;

  const format = (req.nextUrl.searchParams.get("format") ?? "csv").toLowerCase();
  const marketFilter = req.nextUrl.searchParams.get("market")?.trim().toUpperCase() || null;

  const history = await loadHistory();
  let samples = Array.isArray(history.samples) ? history.samples : [];
  if (marketFilter) {
    samples = samples.filter((s) => s.market.toUpperCase() === marketFilter);
  }
  samples = [...samples].sort((a, b) => a.ts - b.ts || a.market.localeCompare(b.market));

  if (format === "json") {
    return NextResponse.json(
      {
        updatedAt: history.updatedAt ?? null,
        note: history.note ?? null,
        sampleCount: samples.length,
        samples,
        storage:
          "Not in Supabase. Source of truth: frontend/public/data/price-history.json (also contracts/data/price-history.json), committed by GitHub Actions after each oracle push.",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  // Excel-friendly CSV (UTF-8 BOM so Excel detects encoding)
  const header = ["market", "timestamp_unix", "datetime_utc", "price_usd_per_mg", "source", "tx_hash"];
  const lines = [header.join(",")];
  for (const s of samples) {
    const iso = Number.isFinite(s.ts)
      ? new Date(s.ts * 1000).toISOString()
      : "";
    lines.push(
      [
        csvEscape(s.market),
        csvEscape(s.ts),
        csvEscape(iso),
        csvEscape(s.price),
        csvEscape(s.source ?? ""),
        csvEscape(s.txHash ?? ""),
      ].join(","),
    );
  }

  // Summary pivot block at the end for quick Excel pivot / glance
  const byMarket = new Map<string, HistorySample[]>();
  for (const s of samples) {
    const arr = byMarket.get(s.market) ?? [];
    arr.push(s);
    byMarket.set(s.market, arr);
  }
  lines.push("");
  lines.push("SUMMARY_BY_MARKET");
  lines.push(
    ["market", "samples", "first_utc", "last_utc", "first_price", "last_price", "min", "max", "change_pct"].join(
      ",",
    ),
  );
  for (const [market, arr] of [...byMarket.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const prices = arr.map((x) => x.price).filter((n) => Number.isFinite(n));
    const first = arr[0]!;
    const last = arr[arr.length - 1]!;
    const change =
      first.price > 0 ? (((last.price - first.price) / first.price) * 100).toFixed(2) : "";
    lines.push(
      [
        csvEscape(market),
        csvEscape(arr.length),
        csvEscape(new Date(first.ts * 1000).toISOString()),
        csvEscape(new Date(last.ts * 1000).toISOString()),
        csvEscape(first.price),
        csvEscape(last.price),
        csvEscape(prices.length ? Math.min(...prices) : ""),
        csvEscape(prices.length ? Math.max(...prices) : ""),
        csvEscape(change),
      ].join(","),
    );
  }

  const body = "\uFEFF" + lines.join("\n") + "\n";
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = marketFilter
    ? `pept-price-history-${marketFilter}-${stamp}.csv`
    : `pept-price-history-${stamp}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
