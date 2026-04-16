interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function useUpstash(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

async function upstashCheck(opts: RateLimitOptions): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const now = Date.now();
  const windowKey = `rl:${opts.key}:${Math.floor(now / opts.windowMs)}`;
  const resetAt = (Math.floor(now / opts.windowMs) + 1) * opts.windowMs;

  const pipeline = [
    ["INCR", windowKey],
    ["PEXPIRE", windowKey, String(opts.windowMs)],
  ];
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pipeline),
    cache: "no-store",
  });
  if (!res.ok) {
    // On upstream failure, fall back to local bucket so we fail open
    // rather than blocking traffic entirely.
    return memoryCheck(opts);
  }
  const data = (await res.json()) as Array<{ result: number | string }>;
  const count = Number(data[0]?.result ?? 0);
  const allowed = count <= opts.limit;
  return {
    allowed,
    remaining: Math.max(0, opts.limit - count),
    resetAt,
  };
}

function memoryCheck(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(opts.key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(opts.key, bucket);
    return { allowed: true, remaining: opts.limit - 1, resetAt: bucket.resetAt };
  }
  if (existing.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  if (useUpstash()) {
    try {
      return await upstashCheck(opts);
    } catch {
      return memoryCheck(opts);
    }
  }
  return memoryCheck(opts);
}

export function _resetRateLimitForTests(): void {
  buckets.clear();
}
