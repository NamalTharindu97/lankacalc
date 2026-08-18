import { NextResponse } from "next/server";

import { authenticateOperator } from "@/server/admin-auth";
import { verifyContentSource } from "@/server/guides/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const operator = authenticateOperator(request);
  if (!operator) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Operator authentication required." } },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  try {
    const source = await verifyContentSource(id, new Date());
    return NextResponse.json({ data: source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "SOURCE_NOT_FOUND", message } },
      { status: 404 },
    );
  }
}
