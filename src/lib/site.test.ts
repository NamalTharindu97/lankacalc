import { describe, expect, it } from "vitest";

import { getSiteUrl } from "@/lib/site";

describe("site URL configuration", () => {
  it("prefers SITE_URL and normalizes it to an origin", () => {
    const url = getSiteUrl({
      NODE_ENV: "production",
      SITE_URL: "https://www.example.lk/path?query=yes",
      BETTER_AUTH_URL: "https://auth.example.lk",
    });

    expect(url.toString()).toBe("https://www.example.lk/");
  });

  it("falls back to BETTER_AUTH_URL", () => {
    expect(getSiteUrl({ BETTER_AUTH_URL: "https://example.lk" }).origin).toBe("https://example.lk");
  });

  it("rejects an insecure public production origin", () => {
    expect(() => getSiteUrl({
      NODE_ENV: "production",
      SITE_URL: "http://example.lk",
    })).toThrow("HTTPS");
  });

  it("allows localhost for local production builds", () => {
    expect(getSiteUrl({
      NODE_ENV: "production",
      SITE_URL: "http://localhost:3000",
    }).origin).toBe("http://localhost:3000");
  });
});
