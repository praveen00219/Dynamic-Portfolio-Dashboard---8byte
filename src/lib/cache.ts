// In-memory TTL cache: stale-on-error fallback + single-flight request coalescing.
// Stored on globalThis so it survives Next.js dev-mode HMR reloads.

interface Entry {
  value: unknown;
  expiresAt: number;
}

interface CacheStore {
  entries: Map<string, Entry>;
  inflight: Map<string, Promise<unknown>>;
}

const g = globalThis as typeof globalThis & { __portfolioCache?: CacheStore };
const store: CacheStore = (g.__portfolioCache ??= {
  entries: new Map(),
  inflight: new Map(),
});

export interface CachedResult<T> {
  value: T;
  stale: boolean; // true when served from an expired entry because the refresh failed
}

// Returns the cached value for `key` if fresh; otherwise runs `fetcher`, caches it for `ttlMs`.
// On fetcher failure, falls back to an expired cached value (stale: true) if one exists.
export async function getOrFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<CachedResult<T>> {
  const hit = store.entries.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return { value: hit.value as T, stale: false };
  }

  // Single-flight: reuse an already-running fetch for this key.
  let pending = store.inflight.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = fetcher().finally(() => store.inflight.delete(key));
    store.inflight.set(key, pending);
  }

  try {
    const value = await pending;
    store.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    return { value, stale: false };
  } catch (err) {
    if (hit) return { value: hit.value as T, stale: true }; // expired but usable
    throw err;
  }
}

// Minimal concurrency limiter (p-limit style), used to throttle Google Finance scraping.
export function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    active--;
    queue.shift()?.();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(resolve, reject).finally(next);
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
}