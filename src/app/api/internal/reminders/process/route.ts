import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getEmailProvider } from "@/server/email/provider";
import { getServerEnvironment } from "@/server/env";
import { processDueDeliveries } from "@/server/reminders/service";

function tokenMatches(received: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const environment = getServerEnvironment();
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!tokenMatches(token, environment.WORKER_API_TOKEN)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "A valid worker token is required." } },
      { status: 401 },
    );
  }

  const result = await processDueDeliveries(new Date(), getEmailProvider());
  return NextResponse.json(result, { status: 200 });
}
