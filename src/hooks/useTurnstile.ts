import { useCallback, useRef, useState } from 'react';

export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  // Latest token in a ref, for closures (e.g. MP Brick onSubmit) that
  // would otherwise capture a stale value.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const reset = useCallback(() => {
    setToken(null);
    setResetKey((k) => k + 1);
  }, []);

  return {
    token,
    tokenRef,
    isReady: token !== null,
    resetKey,
    reset,
    widgetProps: {
      onVerify: (t: string) => setToken(t),
      onExpire: () => setToken(null),
      onError: () => setToken(null),
    },
  };
}
