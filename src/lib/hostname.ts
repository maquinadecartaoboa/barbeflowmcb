/**
 * Hostname-based routing configuration
 * 
 * modogestor.com.br → public pages (landing, booking, payment)
 * app.modogestor.com.br → dashboard (login, register, dashboard, etc.)
 * 
 * On the dashboard domain, routes drop the /app prefix:
 *   /app/login → /login
 *   /app/dashboard → /dashboard
 * 
 * In development/preview, all routes use the /app prefix.
 */

const DASHBOARD_HOST = 'app.modogestor.com.br';
const PUBLIC_HOST = 'modogestor.com.br';

export function isDashboardDomain(): boolean {
  const host = window.location.hostname;
  return host === DASHBOARD_HOST;
}

export function isPublicDomain(): boolean {
  const host = window.location.hostname;
  return host === PUBLIC_HOST || host === `www.${PUBLIC_HOST}`;
}

export function isPreviewOrLocal(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host.includes('lovable.app') || host.includes('lovableproject.com') || host.includes('127.0.0.1');
}

/**
 * Resolves a dashboard path based on the current hostname.
 * On app.modogestor.com.br: /app/dashboard → /dashboard
 * On preview/local: /app/dashboard → /app/dashboard (unchanged)
 */
export function dashPath(path: string): string {
  if (isDashboardDomain()) {
    return path.replace(/^\/app/, '');
  }
  return path;
}

/** Returns the full URL for the dashboard domain */
export function getDashboardUrl(path = ''): string {
  if (isPreviewOrLocal()) return path || '/app/login';
  // Remove /app prefix for the dashboard domain
  const cleanPath = path.replace(/^\/app/, '') || '/login';
  return `https://${DASHBOARD_HOST}${cleanPath}`;
}

/** Returns the full URL for the public domain */
export function getPublicUrl(path = ''): string {
  if (isPreviewOrLocal()) return path || '/';
  return `https://${PUBLIC_HOST}${path}`;
}