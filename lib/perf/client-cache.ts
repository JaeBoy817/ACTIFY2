type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const valueCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

type CachedFetchOptions = {
  ttlMs?: number;
  signal?: AbortSignal;
  force?: boolean;
};

function markClientFetchStart(key: string) {
  if (typeof window === "undefined" || typeof performance === "undefined") return null;
  const safeKey = key.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 80);
  const markName = `actify-fetch-start:${safeKey}`;
  performance.mark(markName);
  return markName;
}

function markClientFetchEnd(startMark: string | null, status: "ok" | "error" | "abort") {
  if (!startMark || typeof performance === "undefined") return;
  const endMark = `${startMark}:${status}`;
  const measureName = `actify-fetch:${status}`;
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);
}

export async function cachedFetchJson<T>(
  key: string,
  url: string,
  options?: CachedFetchOptions
): Promise<T> {
  const ttlMs = options?.ttlMs ?? 30_000;
  const now = Date.now();

  if (!options?.force) {
    const hit = valueCache.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }

    const pending = inflight.get(key);
    if (pending) {
      return (await pending) as T;
    }
  }

  const startMark = markClientFetchStart(key);

  const request = fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    signal: options?.signal
  })
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok) {
        const error = new Error(
          payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Request failed."
        );
        throw error;
      }
      valueCache.set(key, {
        value: payload,
        expiresAt: Date.now() + ttlMs
      });
      markClientFetchEnd(startMark, "ok");
      return payload;
    })
    .catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        markClientFetchEnd(startMark, "abort");
      } else {
        markClientFetchEnd(startMark, "error");
      }
      throw error;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return (await request) as T;
}

export function invalidateClientCache(prefix: string) {
  for (const key of valueCache.keys()) {
    if (key.startsWith(prefix)) {
      valueCache.delete(key);
    }
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) {
      inflight.delete(key);
    }
  }
}
