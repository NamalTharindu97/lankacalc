import { afterEach, describe, expect, it } from "vitest";

import { authenticateOperator, canPerform } from "@/server/admin-auth";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe("temporary operator authentication", () => {
  it("distinguishes admin and reviewer permissions", () => {
    process.env.ADMIN_API_TOKEN = "a".repeat(32);
    process.env.ADMIN_ACTOR = "alice";
    process.env.REVIEWER_API_TOKEN = "r".repeat(32);
    process.env.REVIEWER_ACTOR = "ravi";

    const admin = authenticateOperator(new Request("https://example.test", {
      headers: { authorization: `Bearer ${"a".repeat(32)}` },
    }));
    const reviewer = authenticateOperator(new Request("https://example.test", {
      headers: { authorization: `Bearer ${"r".repeat(32)}` },
    }));

    expect(admin).toEqual({ name: "alice", role: "admin" });
    expect(reviewer).toEqual({ name: "ravi", role: "reviewer" });
    expect(canPerform(admin!, "admin")).toBe(true);
    expect(canPerform(reviewer!, "review")).toBe(true);
    expect(canPerform(reviewer!, "admin")).toBe(false);
  });

  it("rejects missing and invalid credentials", () => {
    process.env.ADMIN_API_TOKEN = "a".repeat(32);
    expect(authenticateOperator(new Request("https://example.test"))).toBeNull();
    expect(authenticateOperator(new Request("https://example.test", {
      headers: { authorization: `Bearer ${"x".repeat(32)}` },
    }))).toBeNull();
  });

  it("rejects identical role tokens", () => {
    process.env.ADMIN_API_TOKEN = "x".repeat(32);
    process.env.REVIEWER_API_TOKEN = "x".repeat(32);
    expect(() => authenticateOperator(new Request("https://example.test", {
      headers: { authorization: `Bearer ${"x".repeat(32)}` },
    }))).toThrow("different");
  });
});
