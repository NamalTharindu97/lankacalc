import { NextResponse } from "next/server";

import { getVersion } from "@/server/guides/service";

type RouteContext = {
  params: Promise<{ guide: string; version: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { guide, version } = await context.params;
  const row = await getVersion(guide, version);
  if (!row) {
    return NextResponse.json(
      {
        error: {
          code: "VERSION_NOT_FOUND",
          message: `Version '${version}' not found for guide '${guide}'.`,
        },
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: row });
}
