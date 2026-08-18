import { NextResponse } from "next/server";

import { getGuide } from "@/server/guides/service";

type RouteContext = {
  params: Promise<{ guide: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { guide } = await context.params;
  const row = await getGuide(guide);
  if (!row) {
    return NextResponse.json(
      { error: { code: "GUIDE_NOT_FOUND", message: `Guide '${guide}' not found.` } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: row });
}
