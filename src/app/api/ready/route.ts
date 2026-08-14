import { NextResponse } from "next/server";

import { checkDatabase } from "@/server/db/client";

export async function readinessResponse(check = checkDatabase) {
  try {
    await check();
    return NextResponse.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function GET() {
  return readinessResponse();
}
