import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

describe("locale proxy", () => {
  it("redirects unprefixed UI paths deterministically to English", () => {
    const response = proxy(new NextRequest("https://example.lk/calculators/age?from=test"));
    expect(response.headers.get("location")).toBe("https://example.lk/en/calculators/age?from=test");
  });

  it("passes locale routes with server layout headers", () => {
    const response = proxy(new NextRequest("https://example.lk/si/categories/everyday"));
    expect(response.headers.get("x-middleware-request-x-lankacalc-locale")).toBe("si");
    expect(response.headers.get("x-middleware-request-x-lankacalc-pathname")).toBe("/categories/everyday");
  });
});
