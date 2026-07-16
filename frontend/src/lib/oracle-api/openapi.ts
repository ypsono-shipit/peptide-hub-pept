import { ORACLE_MARKETS } from "./registry";
import { ORACLE_API_VERSION } from "./http";
import { TIER_PRICING } from "./tiers";

export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "PEPT Peptide Oracle API",
      version: ORACLE_API_VERSION,
      description:
        "B2B research-peptide $/mg price infrastructure. Multi-vendor marks aggregated across 30+ vendors and laboratories, settled on Robinhood Chain.",
      contact: { name: "PEPT Trade", url: "https://pept.trade" },
    },
    servers: [{ url: baseUrl }],
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
        BearerAuth: { type: "http", scheme: "bearer" },
      },
    },
    paths: {
      "/api/v1/oracle": {
        get: { summary: "Service discovery", operationId: "getIndex" },
      },
      "/api/v1/oracle/health": {
        get: { summary: "Health and feed freshness", operationId: "getHealth" },
      },
      "/api/v1/oracle/markets": {
        get: { summary: "List markets", operationId: "listMarkets" },
      },
      "/api/v1/oracle/prices": {
        get: { summary: "All latest prices", operationId: "listPrices" },
      },
      "/api/v1/oracle/prices/{market}": {
        get: {
          summary: "Latest price for market",
          operationId: "getPrice",
          parameters: [{ name: "market", in: "path", required: true, schema: { type: "string" } }],
        },
      },
      "/api/v1/oracle/history/{market}": {
        get: {
          summary: "Historical samples",
          operationId: "getHistory",
          parameters: [
            { name: "market", in: "path", required: true, schema: { type: "string" } },
            { name: "from", in: "query", schema: { type: "integer" } },
            { name: "to", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
        },
      },
      "/api/v1/oracle/ohlc/{market}": {
        get: {
          summary: "OHLC candles",
          operationId: "getOhlc",
          parameters: [
            { name: "market", in: "path", required: true, schema: { type: "string" } },
            { name: "tf", in: "query", schema: { type: "string", enum: ["1h", "4h", "1D", "1W"] } },
            { name: "live", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
          ],
        },
      },
      "/api/v1/oracle/attest/{market}": {
        get: {
          summary: "Signed price attestation (Pro+)",
          operationId: "getAttestation",
          parameters: [{ name: "market", in: "path", required: true, schema: { type: "string" } }],
        },
      },
      "/api/v1/oracle/me": {
        get: { summary: "Current key usage and limits", operationId: "getMe" },
      },
      "/api/v1/oracle/webhooks": {
        get: { summary: "List webhooks", operationId: "listWebhooks" },
        post: { summary: "Create webhook", operationId: "createWebhook" },
      },
      "/api/v1/oracle/webhooks/{id}": {
        delete: { summary: "Disable webhook", operationId: "deleteWebhook" },
      },
      "/api/v1/oracle/openapi.json": {
        get: { summary: "This OpenAPI document", operationId: "getOpenApi" },
      },
    },
    "x-pept-markets": ORACLE_MARKETS,
    "x-pept-pricing": TIER_PRICING,
  };
}
