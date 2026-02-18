type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export async function cachedFetchJson<T>(url: string, ttlMs = 10_000): Promise<T> {
  const now = Date.now();
  const cacheHit = cache.get(url);
  if (cacheHit && cacheHit.expiresAt > now) {
    return cacheHit.value as T;
  }

  const inflightRequest = inflight.get(url);
  if (inflightRequest) {
    return inflightRequest as Promise<T>;
  }

  const request = fetch(url, { credentials: "include" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const json = (await response.json()) as T;
      cache.set(url, { value: json, expiresAt: now + ttlMs });
      return json;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, request);
  return request as Promise<T>;
}

export function bustCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
