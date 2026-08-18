import { NextResponse } from "next/server";

import { evaluateGuide } from "@/server/guides/service";

type RouteContext = {
  params: Promise<{ guide: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { guide } = await context.params;
  const body = await request.json();
  const answers: Record<string, string | string[]> = body.answers ?? {};
  const result = await evaluateGuide(guide, answers);
  return NextResponse.json({ data: result });
}
