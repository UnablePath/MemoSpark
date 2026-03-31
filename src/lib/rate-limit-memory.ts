/**
 * Best-effort in-memory sliding-window rate limiter for a single server instance.
 * Not suitable as the only defense for distributed abuse; pairs with auth and payload limits.
 */
export function createSlidingWindowLimiter(options: {
  windowMs: number;
  max: number;
}) {
  const { windowMs, max } = options;
  const buckets = new Map<string, number[]>();

  return {
    allow(key: string): boolean {
      const now = Date.now();
      const prev = buckets.get(key) ?? [];
      const pruned = prev.filter((t) => now - t < windowMs);
      if (pruned.length >= max) {
        buckets.set(key, pruned);
        return false;
      }
      pruned.push(now);
      buckets.set(key, pruned);
      return true;
    },
  };
}
