import { NextResponse } from "next/server";

import { authenticateOperator } from "@/server/admin-auth";
import { addNode, listNodes } from "@/server/guides/service";

type RouteContext = {
  params: Promise<{ guide: string; version: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { guide, version } = await context.params;
  try {
    const nodes = await listNodes(guide, version);
    return NextResponse.json({ data: nodes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "VERSION_NOT_FOUND", message } },
      { status: 404 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const operator = authenticateOperator(request);
  if (!operator) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Operator authentication required." } },
      { status: 401 },
    );
  }

  const { guide, version } = await context.params;
  try {
    const body = await request.json();
    const node = await addNode(guide, version, body);
    return NextResponse.json({ data: node }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: { code: "VERSION_NOT_FOUND", message } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 422 },
    );
  }
}
