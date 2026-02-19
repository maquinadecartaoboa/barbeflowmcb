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

const DASHBOARD_HOSTS = ['app.modogestor.com.br'];
const PUBLIC_HOSTS = ['modogestor.com.br'];
const ALL_KNOWN_HOSTS = [...DASHBOARD_HOSTS, ...PUBLIC_HOSTS, ...PUBLIC_HOSTS.map(h => `www.${h}`)];

function getHost(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname;
}

export function isDashboardDomain(): boolean {
  const host = getHost();
  return DASHBOARD_HOSTS.includes(host);
}

export function isPublicDomain(): boolean {
  const host = getHost();
  return PUBLIC_HOSTS.includes(host) || PUBLIC_HOSTS.some(h => host === `www.${h}`);
}

/**
 * Returns true if the current hostname is a custom domain (not one of our known hosts).
 * Custom domains are mapped to tenants via the `custom_domain` column.
 */
export function isCustomDomain(): boolean {
  const host = getHost();
  if (!host || isPreviewOrLocal()) return false;
  return !ALL_KNOWN_HOSTS.includes(host);
}

export function isPreviewOrLocal(): boolean {
  const host = getHost();
  if (!host) return true; // SSR defaults to preview behavior
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
  const cleanPath = path.replace(/^\/app/, '') || '/login';
  return `https://${DASHBOARD_HOSTS[0]}${cleanPath}`;
}

/** Returns the full URL for the public domain */
export function getPublicUrl(path = ''): string {
  if (isPreviewOrLocal()) return path || '/';
  return `https://${PUBLIC_HOSTS[0]}${path}`;
}
