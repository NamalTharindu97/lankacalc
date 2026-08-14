import { describe, expect, it } from "vitest";

import { canonicalJson, checksumJson, diffJson } from "@/server/rules/json";

describe("rule JSON utilities", () => {
  it("produces a stable checksum regardless of object key order", () => {
    expect(checksumJson({ rate: 8, nested: { b: true, a: null } }))
      .toBe(checksumJson({ nested: { a: null, b: true }, rate: 8 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("reports structured result differences", () => {
    expect(diffJson(
      { total: 100, parts: [40, 60] },
      { total: 101, parts: [40, 61] },
    )).toEqual([
      { path: "$.parts[1]", expected: 60, actual: 61 },
      { path: "$.total", expected: 100, actual: 101 },
    ]);
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalJson(Number.POSITIVE_INFINITY)).toThrow("finite");
  });
});
