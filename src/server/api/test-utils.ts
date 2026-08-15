import { randomUUID } from "node:crypto";

import type { CalculationResult } from "@/domain/calculators/types";
import { auth } from "@/server/auth";

export const testPassword = "correct-horse-battery-staple-2026";

export function uniqueTestEmail(): string {
  return `saves-${randomUUID().replaceAll("-", "")}@example.test`;
}

export function cookieHeaderFrom(setCookie: string | null): string {
  return (setCookie ?? "")
    .split(", ")
    .map((part) => part.split(";")[0])
    .filter((pair) => pair.includes("=") && !pair.toLowerCase().startsWith("max-age=0"))
    .join("; ");
}

export async function signUp(email = uniqueTestEmail()): Promise<Headers> {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3001";
  const request = new Request(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email, password: testPassword }),
  });
  const response = await auth.handler(request);
  if (response.status !== 200) {
    throw new Error(`Sign-up failed with status ${response.status}.`);
  }
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Sign-up did not return a session cookie.");
  }
  return new Headers({ Cookie: cookieHeaderFrom(setCookie) });
}

export function snapshotFixture(): CalculationResult {
  return {
    calculator: "percentage",
    calculationVersion: "2.0.0",
    asOfDate: null,
    normalizedInputs: { percentage: "20", value: "250" },
    result: { percentageValue: "50" },
    breakdown: [
      { label: "Percentage value", expression: "250 × 20%", value: "50" },
    ],
    assumptions: ["Simple percentage of the entered value."],
    warnings: [],
    ruleVersions: [],
    sources: [],
    verifiedAt: null,
  };
}
