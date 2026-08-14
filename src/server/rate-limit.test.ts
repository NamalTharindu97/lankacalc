import { describe, expect, it } from "vitest";

import { clientAddress, FixedWindowRateLimiter } from "@/server/rate-limit";

describe("FixedWindowRateLimiter", () => {
  it("limits a key and resets after the window", () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000);

    expect(limiter.take("client", 0)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.take("client", 10)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.take("client", 20)).toMatchObject({ allowed: false, remaining: 0 });
    expect(limiter.take("client", 1_000)).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("uses only the trusted proxy client address", () => {
    expect(clientAddress(new Request("https://example.test", {
      headers: { "x-real-ip": "192.0.2.1", "x-forwarded-for": "198.51.100.1" },
    }))).toBe("192.0.2.1");
    expect(clientAddress(new Request("https://example.test", {
      headers: { "x-forwarded-for": "198.51.100.1, 203.0.113.1" },
    }))).toBe("unknown");
  });

  it("bounds the number of retained client buckets", () => {
    const limiter = new FixedWindowRateLimiter(1, 10_000, 2);

    limiter.take("one", 0);
    limiter.take("two", 0);
    expect(limiter.take("three", 0)).toMatchObject({ allowed: true });
    expect(limiter.take("one", 1)).toMatchObject({ allowed: true });
  });
});
