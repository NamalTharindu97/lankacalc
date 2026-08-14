type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMilliseconds: number,
    private readonly maximumBuckets = 10_000,
  ) {}

  take(key: string, now = Date.now()): RateLimitResult {
    const existing = this.buckets.get(key);
    if (!existing && this.buckets.size >= this.maximumBuckets) {
      for (const [bucketKey, bucket] of this.buckets) {
        if (bucket.resetAt <= now) {
          this.buckets.delete(bucketKey);
        }
      }

      if (this.buckets.size >= this.maximumBuckets) {
        const oldestKey = this.buckets.keys().next().value;
        if (oldestKey !== undefined) {
          this.buckets.delete(oldestKey);
        }
      }
    }

    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + this.windowMilliseconds }
      : existing;

    bucket.count += 1;
    this.buckets.set(key, bucket);

    return {
      allowed: bucket.count <= this.limit,
      limit: this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }
}

export const calculationRateLimiter = new FixedWindowRateLimiter(60, 60_000);

export function clientAddress(request: Request): string {
  return request.headers.get("x-real-ip") || "unknown";
}
