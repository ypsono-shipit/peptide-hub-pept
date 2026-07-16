import { NextRequest } from "next/server";
import { gate, json, options, withMeta, ORACLE_API_VERSION } from "@/lib/oracle-api/http";
import { TIER_PRICING } from "@/lib/oracle-api/tiers";
import { storeBackend } from "@/lib/oracle-api/store";

export const dynamic = "force-dynamic";

/** GET /api/v1/oracle — service discovery */
export async function GET(req: NextRequest) {
  const g = await gate(req, "oracle");
  if (!g.ok) return g.response;

  return json(
    withMeta(
      {
        name: "PEPT Peptide Oracle API",
        version: ORACLE_API_VERSION,
        description:
          "B2B infrastructure for research-peptide $/mg marks. Pricing aggregated across 30+ vendors and laboratories, settled on Robinhood Chain, served as REST for integrators.",
        basePath: "/api/v1/oracle",
        hosts: {
          product: "https://pept.trade",
          api: "https://api.pept.trade (point DNS CNAME to Vercel; middleware rewrites)",
        },
        authentication: {
          headers: ["X-API-Key: <key>", "Authorization: Bearer <key>"],
          demoKey: process.env.ORACLE_API_PUBLIC_DEMO_KEY || "pept_demo_public",
          requireKey: process.env.ORACLE_API_REQUIRE_KEY === "true",
        },
        pricing: TIER_PRICING,
        store: storeBackend(),
        endpoints: [
          { method: "GET", path: "/api/v1/oracle/health", summary: "Liveness and feed freshness" },
          { method: "GET", path: "/api/v1/oracle/markets", summary: "List supported markets" },
          { method: "GET", path: "/api/v1/oracle/prices", summary: "Latest prices for all markets" },
          { method: "GET", path: "/api/v1/oracle/prices/{market}", summary: "Latest price for one market" },
          { method: "GET", path: "/api/v1/oracle/history/{market}", summary: "Raw oracle samples" },
          { method: "GET", path: "/api/v1/oracle/ohlc/{market}", summary: "OHLC candles" },
          { method: "GET", path: "/api/v1/oracle/attest/{market}", summary: "Signed attestation (Pro+)" },
          { method: "GET", path: "/api/v1/oracle/me", summary: "Key usage and limits" },
          { method: "GET|POST", path: "/api/v1/oracle/webhooks", summary: "List / create webhooks" },
          { method: "DELETE", path: "/api/v1/oracle/webhooks/{id}", summary: "Disable webhook" },
          { method: "POST", path: "/api/v1/oracle/billing/checkout", summary: "Stripe Checkout session" },
          { method: "GET", path: "/api/v1/oracle/openapi.json", summary: "OpenAPI 3.1 document" },
          { method: "POST", path: "/api/v1/oracle/admin/keys", summary: "Issue API keys (admin)" },
          { method: "POST", path: "/api/v1/oracle/admin/fanout", summary: "Fanout price.updated webhooks (admin)" },
        ],
        onChain: {
          chainId: 46630,
          network: "Robinhood Chain Testnet",
          oracle: "0x59d62e2735Bd583F34A8AC2573bA952Df5849449",
          explorer: "https://explorer.testnet.chain.robinhood.com",
        },
        docs: "/docs/oracle",
        product: "/oracle",
      },
      g.auth,
    ),
  );
}

export async function OPTIONS() {
  return options();
}
