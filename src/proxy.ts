import { NextRequest, NextResponse } from "next/server";

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": req.headers.get("access-control-request-headers") ?? "Content-Type, Authorization, X-Requested-With, Accept, Origin",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function proxy(req: NextRequest) {
  const headers = corsHeaders(req);
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  if (isApi && req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const protectedPaths = ["/dashboard", "/groups", "/expenses", "/settle", "/friends", "/activity", "/search", "/analytics", "/import", "/profile", "/notifications"];
  const publicGroupJoin = req.nextUrl.pathname.startsWith("/groups/join");
  if (!publicGroupJoin && protectedPaths.some((path) => req.nextUrl.pathname.startsWith(path)) && !req.cookies.get("accessToken")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const response = NextResponse.next();
  if (isApi) {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  }
  return response;
}

export const config = { matcher: ["/api/:path*", "/dashboard/:path*", "/groups/:path*", "/expenses/:path*", "/settle/:path*", "/friends/:path*", "/activity/:path*", "/search/:path*", "/analytics/:path*", "/import/:path*", "/profile/:path*", "/notifications/:path*"] };
