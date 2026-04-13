type Bucket = {
  count: number;
  resetAt: number;
};

declare global {
  var __portal_rate_limit__: Map<string, Bucket> | undefined;
}

function getStore() {
  if (!globalThis.__portal_rate_limit__) {
    globalThis.__portal_rate_limit__ = new Map<string, Bucket>();
  }
  return globalThis.__portal_rate_limit__;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: windowMs };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterMs: Math.max(0, existing.resetAt - now),
  };
}
