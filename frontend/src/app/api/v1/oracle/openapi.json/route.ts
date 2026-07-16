import { NextRequest } from "next/server";
import { json, options, corsHeaders } from "@/lib/oracle-api/http";
import { buildOpenApiSpec } from "@/lib/oracle-api/openapi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const spec = buildOpenApiSpec(origin);
  return json(spec, {
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function OPTIONS() {
  return options();
}
