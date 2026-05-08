import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  /**
   * Visual mode hint — maps to Cloudflare's `appearance` option.
   * - `'managed'` (default): widget always visible (current behavior).
   * - `'non-interactive'`: only renders when interaction is required.
   *
   * Note: takes effect only when the underlying site key is configured
   * as Non-Interactive or Invisible at Cloudflare. With a Managed site key,
   * Cloudflare ignores the hint and the widget stays visible.
   */
  mode?: 'managed' | 'non-interactive';
}

export function TurnstileWidget({
  siteKey = '0x4AAAAAACnmQzCkE5amSVEN',
  onVerify,
  onExpire,
  onError,
  mode = 'managed',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  callbacksRef.current = { onVerify, onExpire, onError };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacksRef.current.onVerify(token),
        'expired-callback': () => callbacksRef.current.onExpire?.(),
        'error-callback': () => callbacksRef.current.onError?.(),
        theme: 'light',
        language: 'pt-br',
        appearance: mode === 'non-interactive' ? 'interaction-only' : 'always',
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      intervalId = setInterval(() => {
        if (window.turnstile) {
          if (intervalId) clearInterval(intervalId);
          renderWidget();
        }
      }, 100);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, mode]);

  return <div ref={containerRef} className="flex justify-center my-2" />;
}
