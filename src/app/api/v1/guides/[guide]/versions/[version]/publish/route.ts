import { NextResponse } from "next/server";

import { authenticateOperator } from "@/server/admin-auth";
import { publishVersion } from "@/server/guides/service";

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
    const published = await publishVersion(guide, version);
    return NextResponse.json({ data: published });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: { code: "VERSION_NOT_FOUND", message } },
        { status: 404 },
      );
    }
    if (message.includes("Cannot publish")) {
      return NextResponse.json(
        { error: { code: "PUBLISH_BLOCKED", message } },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
