import { NextResponse } from "next/server";

import { authenticateOperator } from "@/server/admin-auth";
import { executeAllFixtures } from "@/server/guides/service";

type RouteContext = {
  params: Promise<{ guide: string; version: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const operator = authenticateOperator(_request);
  if (!operator) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Operator authentication required." } },
      { status: 401 },
    );
  }

  const { guide, version } = await context.params;
  try {
    const result = await executeAllFixtures(guide, version);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
