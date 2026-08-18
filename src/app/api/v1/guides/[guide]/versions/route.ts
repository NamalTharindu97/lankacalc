import { NextResponse } from "next/server";

import { authenticateOperator } from "@/server/admin-auth";
import { createDraftVersion, listVersions } from "@/server/guides/service";

type RouteContext = {
  params: Promise<{ guide: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { guide } = await context.params;
  try {
    const versions = await listVersions(guide);
    return NextResponse.json({ data: versions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "GUIDE_NOT_FOUND", message } },
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

  const { guide } = await context.params;
  try {
    const body = await request.json();
    const version = await createDraftVersion(guide, body);
    return NextResponse.json({ data: version }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: { code: "GUIDE_NOT_FOUND", message } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 422 },
    );
  }
}
