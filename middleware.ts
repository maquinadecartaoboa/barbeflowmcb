import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DASHBOARD_HOSTS = ["app.modogestor.com.br"];
const PUBLIC_HOSTS = ["modogestor.com.br", "www.modogestor.com.br"];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Dashboard domain: rewrite all routes to /app/[[...path]] catch-all
  if (DASHBOARD_HOSTS.includes(hostname)) {
    // If already under /app, let it pass through
    if (pathname.startsWith("/app")) {
      return NextResponse.next();
    }
    // Rewrite root and other paths to /app prefix
    const url = request.nextUrl.clone();
    url.pathname = `/app${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Custom domains (not public, not dashboard, not local): rewrite to booking page
  const isLocal =
    hostname === "localhost" ||
    hostname.includes("127.0.0.1") ||
    hostname.includes("lovable.app") ||
    hostname.includes("lovableproject.com") ||
    hostname.includes("vercel.app");

  if (
    !PUBLIC_HOSTS.includes(hostname) &&
    !DASHBOARD_HOSTS.includes(hostname) &&
    !isLocal
  ) {
    // Custom domain — show booking page
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/${hostname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Public domain and local: serve as-is (Next.js routing handles it)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, favicon.png
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|icons/|images/|og-image\\.png|robots\\.txt|sitemap\\.xml|manifest\\.json).*)",
  ],
};
