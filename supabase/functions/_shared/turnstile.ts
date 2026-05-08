/**
 * Shared helper for Cloudflare Turnstile token verification.
 *
 * Two modes:
 * - soft (default): if token OR secret is missing, passes silently.
 *   Used in flows where Turnstile is opportunistic (e.g., subscription).
 * - required (options.required = true): demands token + secret + success.
 *   Used in flows where Turnstile is mandatory (e.g., login, booking).
 *
 * Returns a structured result instead of throwing so callers control
 * the response shape (status code, headers).
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyOptions {
  /** If true, missing token or secret causes failure. Default: false. */
  required?: boolean;
}

export interface TurnstileResult {
  ok: boolean;
  /** Pre-built 403 Response, ready to return from a Deno.serve handler. Only set when ok=false. */
  errorResponse?: Response;
  /** Raw response body from Cloudflare siteverify, when available. */
  detail?: unknown;
}

/**
 * Verify a Cloudflare Turnstile token.
 *
 * @param token        The cf_turnstile_token from the client.
 * @param corsHeaders  CORS headers to merge into the error Response. Pass the
 *                     same `corsHeaders` object the caller uses for other returns.
 * @param options      Optional behavior flags.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  corsHeaders: Record<string, string>,
  options: TurnstileVerifyOptions = {}
): Promise<TurnstileResult> {
  const required = options.required === true;
  const secret = Deno.env.get('CLOUDFLARE_TURNSTILE_SECRET');

  // Soft mode: if either side is missing, pass.
  if (!required && (!token || !secret)) {
    return { ok: true };
  }

  // Hard mode: token is required.
  if (required && !token) {
    return {
      ok: false,
      errorResponse: new Response(
        JSON.stringify({ error: 'Verificação de segurança ausente. Recarregue a página e tente novamente.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // Hard mode: secret must be configured server-side.
  if (required && !secret) {
    console.error('[TURNSTILE] CLOUDFLARE_TURNSTILE_SECRET not configured but required=true');
    return {
      ok: false,
      errorResponse: new Response(
        JSON.stringify({ error: 'Verificação de segurança não está configurada. Contate o suporte.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  // At this point we have both token and secret. Call siteverify.
  try {
    const tsRes = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secret!)}&response=${encodeURIComponent(token!)}`,
      signal: AbortSignal.timeout(10000),
    });

    const tsData = await tsRes.json().catch(() => null);

    if (!tsData?.success) {
      console.error('[TURNSTILE] verification failed:', tsData);
      return {
        ok: false,
        detail: tsData,
        errorResponse: new Response(
          JSON.stringify({ error: 'Verificação de segurança falhou. Tente novamente.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        ),
      };
    }

    return { ok: true, detail: tsData };
  } catch (err) {
    console.error('[TURNSTILE] siteverify network error:', err);
    return {
      ok: false,
      errorResponse: new Response(
        JSON.stringify({ error: 'Não foi possível validar a verificação de segurança. Tente novamente.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }
}
