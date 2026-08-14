import { timingSafeEqual } from "node:crypto";

import { getServerEnvironment } from "@/server/env";

export type Operator = {
  name: string;
  role: "admin" | "reviewer";
};

function tokenMatches(received: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function authenticateOperator(request: Request): Operator | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length);
  const environment = getServerEnvironment();
  if (tokenMatches(token, environment.ADMIN_API_TOKEN)) return { name: environment.ADMIN_ACTOR, role: "admin" };
  if (tokenMatches(token, environment.REVIEWER_API_TOKEN)) return { name: environment.REVIEWER_ACTOR, role: "reviewer" };
  return null;
}

export function canPerform(operator: Operator, action: "admin" | "review"): boolean {
  return action === "review" || operator.role === "admin";
}
