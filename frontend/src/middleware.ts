import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Host routing for B2B surface:
 *   api.pept.trade/*  → /api/v1/oracle/*  (and keep /api/v1/* as-is)
 *   pept.trade stays the full product site
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.toLowerCase() ?? "";
  const { pathname } = req.nextUrl;

  const isApiHost =
    host.startsWith("api.pept.trade") ||
    host.startsWith("api.localhost") ||
    host.includes("api-pept");

  if (!isApiHost) return NextResponse.next();

  // api host root → oracle discovery
  if (pathname === "/" || pathname === "") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/v1/oracle";
    return NextResponse.rewrite(url);
  }

  // /v1/... → /api/v1/oracle/...
  if (pathname.startsWith("/v1/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/api/v1/oracle${pathname.slice(3)}` || "/api/v1/oracle";
    return NextResponse.rewrite(url);
  }

  // /health, /markets, etc. shorthand
  if (
    pathname === "/health" ||
    pathname === "/markets" ||
    pathname === "/prices" ||
    pathname.startsWith("/prices/") ||
    pathname.startsWith("/history/") ||
    pathname.startsWith("/ohlc/") ||
    pathname.startsWith("/attest/") ||
    pathname === "/me" ||
    pathname.startsWith("/webhooks") ||
    pathname === "/openapi.json"
  ) {
    const url = req.nextUrl.clone();
    url.pathname = `/api/v1/oracle${pathname === "/openapi.json" ? "/openapi.json" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // docs convenience
  if (pathname === "/docs" || pathname.startsWith("/docs")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
