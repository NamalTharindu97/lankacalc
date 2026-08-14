import { createHash } from "node:crypto";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("JSON numbers must be finite");
  }
  return JSON.stringify(value);
}

export function checksumJson(value: JsonValue): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export type JsonDifference = {
  path: string;
  expected: JsonValue | undefined;
  actual: JsonValue | undefined;
};

export function diffJson(expected: JsonValue, actual: JsonValue, path = "$"): JsonDifference[] {
  if (canonicalJson(expected) === canonicalJson(actual)) {
    return [];
  }

  if (
    expected === null || actual === null ||
    typeof expected !== "object" || typeof actual !== "object" ||
    Array.isArray(expected) !== Array.isArray(actual)
  ) {
    return [{ path, expected, actual }];
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    const differences: JsonDifference[] = [];
    for (let index = 0; index < Math.max(expected.length, actual.length); index += 1) {
      if (index >= expected.length || index >= actual.length) {
        differences.push({ path: `${path}[${index}]`, expected: expected[index], actual: actual[index] });
      } else {
        differences.push(...diffJson(expected[index], actual[index], `${path}[${index}]`));
      }
    }
    return differences;
  }

  const expectedRecord = expected as Record<string, JsonValue>;
  const actualRecord = actual as Record<string, JsonValue>;
  const keys = new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)]);
  return [...keys].sort().flatMap((key) => {
    if (!(key in expectedRecord) || !(key in actualRecord)) {
      return [{ path: `${path}.${key}`, expected: expectedRecord[key], actual: actualRecord[key] }];
    }
    return diffJson(expectedRecord[key], actualRecord[key], `${path}.${key}`);
  });
}
