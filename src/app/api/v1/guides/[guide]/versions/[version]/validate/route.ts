import { NextResponse } from "next/server";

import { validateVersion } from "@/server/guides/service";

type RouteContext = {
  params: Promise<{ guide: string; version: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { guide, version } = await context.params;
  try {
    const result = await validateVersion(guide, version);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "VERSION_NOT_FOUND", message } },
      { status: 404 },
    );
  }
}
