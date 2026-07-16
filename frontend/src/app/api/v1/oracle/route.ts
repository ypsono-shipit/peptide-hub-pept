import { NextRequest } from "next/server";
import { gate, json, options, withMeta, ORACLE_API_VERSION } from "@/lib/oracle-api/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/oracle — service discovery / OpenAPI-lite index */
export async function GET(req: NextRequest) {
  const g = gate(req);
  if (!g.ok) return g.response;

  return json(
    withMeta(
      {
        name: "PEPT Peptide Oracle API",
        version: ORACLE_API_VERSION,
        description:
          "B2B infrastructure for research-peptide $/mg marks. Dual-source scrapes settled on Robinhood Chain, served as REST for integrators.",
        basePath: "/api/v1/oracle",
        authentication: {
          headers: ["X-API-Key: <key>", "Authorization: Bearer <key>"],
          demoKey: process.env.ORACLE_API_PUBLIC_DEMO_KEY || "pept_demo_public",
          requireKey: process.env.ORACLE_API_REQUIRE_KEY === "true",
        },
        endpoints: [
          { method: "GET", path: "/api/v1/oracle/health", summary: "Liveness and feed freshness" },
          { method: "GET", path: "/api/v1/oracle/markets", summary: "List supported markets" },
          { method: "GET", path: "/api/v1/oracle/prices", summary: "Latest prices for all markets" },
          {
            method: "GET",
            path: "/api/v1/oracle/prices/{market}",
            summary: "Latest price for one market (on-chain + history)",
          },
          {
            method: "GET",
            path: "/api/v1/oracle/history/{market}",
            summary: "Raw oracle samples (?from=&to=&limit=)",
          },
          {
            method: "GET",
            path: "/api/v1/oracle/ohlc/{market}",
            summary: "OHLC candles (?tf=1h|4h|1D|1W&live=1)",
          },
        ],
        onChain: {
          chainId: 46630,
          network: "Robinhood Chain Testnet",
          oracle: "0x59d62e2735Bd583F34A8AC2573bA952Df5849449",
          explorer: "https://explorer.testnet.chain.robinhood.com",
        },
        docs: "/docs/oracle",
      },
      g,
    ),
  );
}

export async function OPTIONS() {
  return options();
}
